// @ts-nocheck - Supabase型推論の問題を回避
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { verifyAdminToken } from '@/lib/auth';
import { logApiRequest, logApiError } from '@/lib/env-check';

// GET: 予約情報を取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  logApiRequest('GET', `/api/bookings/${id}`);

  try {
    const bookingId = id;

    // 予約情報を取得（slot情報も含む）
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        slots (*)
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      console.error('[API] Booking GET: 予約が見つかりません', bookingError);
      return NextResponse.json(
        { error: '予約が見つかりませんでした' },
        { status: 404 }
      );
    }

    console.log(`[API] Booking GET: 取得成功 - booking_id: ${bookingId}`);

    return NextResponse.json(booking);
  } catch (error) {
    logApiError('/api/bookings/[id]', error, { booking_id: id });
    return NextResponse.json(
      { error: '予約情報の取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

// DELETE: 予約をキャンセル（管理者のみ）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  logApiRequest('DELETE', `/api/bookings/${id}`);

  try {
    // 管理者認証チェック
    if (!verifyAdminToken(request)) {
      console.warn('[API] Booking DELETE: 認証失敗');
      return NextResponse.json(
        { error: '認証に失敗しました' },
        { status: 401 }
      );
    }

    // まず予約情報を取得してslot_idを確認
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('slot_id, name, coach_name')
      .eq('id', id)
      .single();

    if (fetchError || !booking) {
      console.error('[API] Booking DELETE: 予約が見つかりません', fetchError);
      return NextResponse.json(
        { error: '予約が見つかりませんでした' },
        { status: 404 }
      );
    }

    // 予約を削除
    const { error: deleteError } = await supabase
      .from('bookings')
      .delete()
      .eq('id', id);

    if (deleteError) {
      logApiError('/api/bookings/[id] DELETE', deleteError, { booking_id: id });
      return NextResponse.json(
        { error: '予約の削除に失敗しました' },
        { status: 500 }
      );
    }

    // slot の booked_count をデクリメント
    const { data: slotData } = await supabase
      .from('slots')
      .select('booked_count')
      .eq('id', booking.slot_id)
      .single();

    if (slotData && slotData.booked_count > 0) {
      const { error: updateError } = await supabase
        .from('slots')
        .update({ booked_count: slotData.booked_count - 1 })
        .eq('id', booking.slot_id);

      if (updateError) {
        console.error('[API] Booking DELETE: booked_count更新失敗', updateError);
      }
    }

    console.log(`[API] Booking DELETE: 削除成功 - booking_id: ${id}, name: ${booking.name || booking.coach_name}`);

    return NextResponse.json({
      success: true,
      message: '予約をキャンセルしました'
    });
  } catch (error) {
    logApiError('/api/bookings/[id] DELETE', error, { booking_id: id });
    return NextResponse.json(
      { error: '予約のキャンセル中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
