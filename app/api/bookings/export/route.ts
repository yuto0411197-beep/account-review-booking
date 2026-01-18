import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { verifyAdminToken } from '@/lib/auth';
import { logApiRequest, logApiError } from '@/lib/env-check';

// GET: 予約データをCSVでエクスポート（管理者のみ）
export async function GET(request: NextRequest) {
  logApiRequest('GET', '/api/bookings/export');

  try {
    // 管理者認証チェック
    if (!verifyAdminToken(request)) {
      console.warn('[API] Export GET: 認証失敗');
      return NextResponse.json(
        { error: '認証に失敗しました' },
        { status: 401 }
      );
    }

    // クエリパラメータから slot_id を取得（オプション）
    const { searchParams } = new URL(request.url);
    const slotId = searchParams.get('slot_id');

    console.log(`[API] Export GET: CSVエクスポート開始${slotId ? ` - slot_id: ${slotId}` : '(全件)'}`);

    // 予約データを取得（slot情報と結合）
    let query = supabase
      .from('bookings')
      .select(`
        id,
        name,
        email,
        coach_name,
        genre,
        prework_url,
        created_at,
        calendar_status,
        slots (
          starts_at,
          ends_at
        )
      `)
      .order('created_at', { ascending: false });

    // 特定の日程枠のみフィルタ
    if (slotId) {
      query = query.eq('slot_id', slotId);
    }

    const { data: bookings, error } = await query;

    if (error) {
      logApiError('/api/bookings/export', error, { slotId });
      return NextResponse.json(
        { error: 'データベースエラーが発生しました' },
        { status: 500 }
      );
    }

    console.log(`[API] Export GET: ${bookings?.length || 0}件の予約データを取得`);

    // CSVヘッダー
    const headers = [
      '予約ID',
      '予約日時',
      '開始日時',
      '終了日時',
      '予約者名',
      'メールアドレス',
      '講師名',
      'ジャンル',
      '事前資料URL',
      'カレンダー連携'
    ];

    // CSVデータ作成
    const csvRows = [
      headers.join(','), // ヘッダー行
      ...bookings.map((booking: any) => {
        const slot = booking.slots;
        return [
          booking.id,
          new Date(booking.created_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
          slot ? new Date(slot.starts_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }) : '',
          slot && slot.ends_at ? new Date(slot.ends_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }) : '',
          `"${booking.name}"`, // ダブルクォートでエスケープ
          booking.email,
          `"${booking.coach_name}"`,
          `"${booking.genre}"`,
          booking.prework_url || '',
          booking.calendar_status || 'disabled'
        ].join(',');
      })
    ];

    const csv = csvRows.join('\n');

    // BOM付きUTF-8でレスポンス（Excel対応）
    const bom = '\uFEFF';
    const csvWithBom = bom + csv;

    // ファイル名に日時を含める
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = slotId
      ? `bookings_${slotId}_${timestamp}.csv`
      : `all_bookings_${timestamp}.csv`;

    return new NextResponse(csvWithBom, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    logApiError('/api/bookings/export', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
