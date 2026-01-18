// @ts-nocheck - Supabase型推論の問題を回避
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { verifyAdminToken } from '@/lib/auth';
import { logApiRequest, logApiError } from '@/lib/env-check';

// GET: 全予約を日程ごとに取得（管理者のみ）
export async function GET(request: NextRequest) {
  logApiRequest('GET', '/api/admin/bookings');

  try {
    // 管理者認証チェック
    if (!verifyAdminToken(request)) {
      console.warn('[API] Admin Bookings GET: 認証失敗');
      return NextResponse.json(
        { error: '認証に失敗しました' },
        { status: 401 }
      );
    }

    // 予約のある日程枠のみを取得し、予約も一緒に取得
    const { data, error } = await supabase
      .from('slots')
      .select(`
        *,
        bookings (*)
      `)
      .gt('booked_count', 0)
      .order('starts_at', { ascending: true });

    if (error) {
      logApiError('/api/admin/bookings', error);
      return NextResponse.json(
        { error: '予約データの取得に失敗しました' },
        { status: 500 }
      );
    }

    console.log(`[API] Admin Bookings GET: ${data?.length || 0}件の日程枠を取得`);
    return NextResponse.json(data);
  } catch (error) {
    logApiError('/api/admin/bookings', error);
    return NextResponse.json(
      { error: '予約データの取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
