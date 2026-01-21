// @ts-nocheck - Supabase型推論の問題を回避
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
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
