// @ts-nocheck - Supabase型推論の問題を回避
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { createCalendarEvent, isCalendarEnabled } from '@/lib/google-calendar';
import { logApiRequest, logApiError } from '@/lib/env-check';

// POST: ユーザーが選択してGoogleカレンダーに追加
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  logApiRequest('POST', `/api/bookings/${id}/add-to-calendar`);

  try {
    const bookingId = id;

    // 予約情報を取得
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        slots (*)
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      console.error('[API] Add to Calendar: 予約が見つかりません', bookingError);
      return NextResponse.json(
        { error: '予約が見つかりませんでした' },
        { status: 404 }
      );
    }

    // すでにカレンダーに追加済みの場合
    if (booking.calendar_event_id) {
      console.log(`[API] Add to Calendar: すでに追加済み - booking_id: ${bookingId}`);
      return NextResponse.json({
        success: true,
        message: 'すでにカレンダーに追加済みです',
        event_link: booking.calendar_status
      });
    }

    // Googleカレンダー連携が有効かチェック
    if (!isCalendarEnabled()) {
      console.log('[API] Add to Calendar: カレンダー連携が無効');
      return NextResponse.json({
        success: false,
        error: 'Googleカレンダー連携が設定されていません'
      }, { status: 503 });
    }

    const slot = booking.slots;
    if (!slot) {
      return NextResponse.json(
        { error: '日程情報が見つかりませんでした' },
        { status: 404 }
      );
    }

    // カレンダーイベントを作成
    const calendarResult = await createCalendarEvent({
      slot,
      name: booking.name,
      email: booking.email,
      coach_name: booking.coach_name,
      genre: booking.genre,
      prework_url: booking.prework_url
    });

    if (calendarResult.success) {
      // 予約テーブルにカレンダー情報を保存
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          calendar_event_id: calendarResult.event_id,
          calendar_status: calendarResult.event_link
        })
        .eq('id', bookingId);

      if (updateError) {
        console.error('[API] Add to Calendar: 予約更新エラー', updateError);
      }

      console.log(`[API] Add to Calendar: カレンダー追加成功 - booking_id: ${bookingId}`);
      return NextResponse.json({
        success: true,
        message: 'Googleカレンダーに追加しました',
        event_link: calendarResult.event_link
      });
    } else {
      console.error('[API] Add to Calendar: カレンダー追加失敗', calendarResult.error);
      return NextResponse.json({
        success: false,
        error: calendarResult.error || 'カレンダーへの追加に失敗しました',
        error_details: calendarResult.error_details
      }, { status: 500 });
    }
  } catch (error) {
    logApiError('/api/bookings/[id]/add-to-calendar', error, { booking_id: id });
    return NextResponse.json(
      {
        error: 'カレンダーへの追加中にエラーが発生しました',
        error_details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
