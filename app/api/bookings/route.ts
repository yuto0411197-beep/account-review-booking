// @ts-nocheck - Supabase型推論の問題を回避
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { createCalendarEvent, isCalendarEnabled } from '@/lib/google-calendar';
import { logApiRequest, logApiError } from '@/lib/env-check';

// POST: 予約作成（RPC経由でトランザクション処理 + Googleカレンダー連携）
export async function POST(request: NextRequest) {
  logApiRequest('POST', '/api/bookings');

  try {
    const body = await request.json();
    const { slot_id, name, email, coach_name, genre, prework_url } = body;

    // 必須項目のバリデーション
    if (!slot_id || !name || !email || !coach_name || !genre) {
      console.warn('[API] Bookings POST: 必須項目不足');
      return NextResponse.json(
        { error: '必須項目が入力されていません' },
        { status: 400 }
      );
    }

    console.log(`[API] Bookings POST: 予約作成開始 - slot_id: ${slot_id}, email: ${email}`);

    // RPC経由で予約を作成（トランザクション処理）
    const { data, error } = await supabase.rpc('create_booking', {
      p_slot_id: slot_id,
      p_name: name,
      p_email: email,
      p_coach_name: coach_name,
      p_genre: genre,
      p_prework_url: prework_url || null
    });

    if (error) {
      logApiError('/api/bookings RPC', error, { slot_id, email });
      return NextResponse.json(
        {
          error: 'サーバーエラーが発生しました。しばらく待ってから再度お試しください。',
          error_details: '予約処理中にデータベースエラーが発生しました。問題が解決しない場合は、お手数ですが別の日程をお試しいただくか、管理者にお問い合わせください。',
          retry_suggested: true
        },
        { status: 500 }
      );
    }

    // RPCの結果を確認 (JSON型なのでdataは直接オブジェクト)
    if (!data) {
      console.error('[API] Bookings POST: RPC結果が空');
      return NextResponse.json(
        {
          error: '予約処理に失敗しました。',
          error_details: 'システムエラーにより予約を完了できませんでした。お手数ですが、ページを更新してから再度お試しください。',
          retry_suggested: true
        },
        { status: 500 }
      );
    }

    const result = data;

    // 失敗の場合
    if (!result.success) {
      console.warn(`[API] Bookings POST: 予約失敗 - ${result.message}`);
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    console.log(`[API] Bookings POST: 予約作成成功 - booking_id: ${result.booking_id}`);

    // Googleカレンダー連携は予約成功ページでユーザーが選択する方式に変更
    // 自動連携はしない
    const calendarStatus = 'not_added';

    // 成功の場合
    return NextResponse.json(
      {
        id: result.booking_id,
        slot_id: result.slot_id,
        name: result.name,
        email: result.email,
        coach_name: result.coach_name,
        genre: result.genre,
        prework_url: result.prework_url,
        created_at: result.created_at,
        calendar_status: calendarStatus,
        calendar_event_id: calendarEventId,
      },
      { status: 201 }
    );
  } catch (error) {
    logApiError('/api/bookings', error);
    return NextResponse.json(
      {
        error: '予期しないエラーが発生しました。',
        error_details: 'システムエラーにより処理を完了できませんでした。しばらく待ってから再度お試しください。問題が続く場合は、別の日程枠をお試しいただくか、管理者にお問い合わせください。',
        retry_suggested: true
      },
      { status: 500 }
    );
  }
}
