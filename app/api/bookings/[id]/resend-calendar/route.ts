// @ts-nocheck - Supabase型推論の問題を回避
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { createCalendarEvent, isCalendarEnabled } from '@/lib/google-calendar';
import { verifyAdminToken } from '@/lib/auth';
import { logApiRequest, logApiError } from '@/lib/env-check';

// POST: カレンダー招待の再送（管理者のみ）
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  logApiRequest('POST', `/api/bookings/${id}/resend-calendar`);

  try {
    // 管理者認証チェック
    if (!verifyAdminToken(request)) {
      console.warn('[API] Resend Calendar: 認証失敗');
      return NextResponse.json(
        { error: '認証に失敗しました' },
        { status: 401 }
      );
    }

    const bookingId = id;

    console.log(`[API] Resend Calendar: 再送開始 - booking_id: ${bookingId}`);

    // カレンダー連携が有効かチェック
    if (!isCalendarEnabled()) {
      console.warn('[API] Resend Calendar: カレンダー連携が無効');
      return NextResponse.json(
        { error: 'カレンダー連携が有効になっていません。環境変数を確認してください。' },
        { status: 400 }
      );
    }

    // 予約データを取得（slot情報と結合）
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select(`
        id,
        name,
        email,
        coach_name,
        genre,
        prework_url,
        calendar_event_id,
        calendar_status,
        slot:slots (
          id,
          starts_at,
          ends_at
        )
      `)
      .eq('id', bookingId)
      .single();

    if (fetchError || !booking) {
      logApiError('/api/bookings/resend-calendar fetch', fetchError, { bookingId });
      return NextResponse.json(
        { error: '予約が見つかりません' },
        { status: 404 }
      );
    }

    // TypeScript型アサーション
    const bookingData = booking as any;

    console.log(`[API] Resend Calendar: 予約データ取得成功 - email: ${bookingData.email}`);

    // 既にカレンダーイベントが作成済みの場合は警告
    if (bookingData.calendar_status === 'created' && bookingData.calendar_event_id) {
      console.warn(`[API] Resend Calendar: 既にイベント作成済み - event_id: ${bookingData.calendar_event_id}`);
      console.warn('[API] Resend Calendar: 既存イベントを削除せずに新規イベントを作成します');
    }

    // カレンダーイベントを作成
    const slot = Array.isArray(bookingData.slot) ? bookingData.slot[0] : bookingData.slot;

    if (!slot) {
      console.error('[API] Resend Calendar: slot情報が取得できませんでした');
      return NextResponse.json(
        { error: '日程枠情報が見つかりません' },
        { status: 500 }
      );
    }

    const calendarResult = await createCalendarEvent({
      slot: {
        id: slot.id,
        starts_at: slot.starts_at,
        ends_at: slot.ends_at,
      } as any,
      name: bookingData.name,
      email: bookingData.email,
      coach_name: bookingData.coach_name,
      genre: bookingData.genre,
      prework_url: bookingData.prework_url,
    });

    if (calendarResult.success) {
      console.log(`[API] Resend Calendar: カレンダー作成成功 - event_id: ${calendarResult.event_id}`);

      // カレンダー情報をDBに更新
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          calendar_event_id: calendarResult.event_id,
          calendar_status: 'created',
        })
        .eq('id', bookingId);

      if (updateError) {
        logApiError('/api/bookings/resend-calendar update', updateError, { bookingId });
        // DB更新失敗だが、カレンダーイベントは作成済みなので部分成功として扱う
        return NextResponse.json(
          {
            success: true,
            event_id: calendarResult.event_id,
            event_link: calendarResult.event_link,
            warning: 'カレンダーイベントは作成されましたが、データベースの更新に失敗しました',
          },
          { status: 200 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          event_id: calendarResult.event_id,
          event_link: calendarResult.event_link,
          message: 'カレンダー招待を再送しました',
        },
        { status: 200 }
      );
    } else {
      console.error(`[API] Resend Calendar: カレンダー作成失敗`);
      console.error(`[API] Resend Calendar: エラータイプ: ${calendarResult.error_type}`);
      console.error(`[API] Resend Calendar: エラーメッセージ: ${calendarResult.error}`);
      console.error(`[API] Resend Calendar: エラー詳細: ${calendarResult.error_details}`);

      // calendar_status を 'failed' に更新
      await supabase
        .from('bookings')
        .update({
          calendar_status: 'failed',
        })
        .eq('id', bookingId);

      return NextResponse.json(
        {
          success: false,
          error: calendarResult.error,
          error_type: calendarResult.error_type,
          error_details: calendarResult.error_details,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    logApiError('/api/bookings/resend-calendar', error, { bookingId: id });
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
