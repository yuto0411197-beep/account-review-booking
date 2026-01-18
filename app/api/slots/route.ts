// @ts-nocheck - Supabase型推論の問題を回避
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { verifyAdminToken } from '@/lib/auth';
import { logApiRequest, logApiError } from '@/lib/env-check';

// GET: 日程枠一覧取得
export async function GET(request: NextRequest) {
  logApiRequest('GET', '/api/slots');

  try {
    // 管理画面からのリクエストの場合は認証チェック
    const authHeader = request.headers.get('authorization');
    const isAdminRequest = authHeader && authHeader.startsWith('Bearer ');

    if (isAdminRequest && !verifyAdminToken(request)) {
      console.warn('[API] Slots GET: 認証失敗');
      return NextResponse.json(
        { error: '認証に失敗しました' },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from('slots')
      .select('*')
      .order('starts_at', { ascending: true });

    if (error) {
      logApiError('/api/slots', error);
      return NextResponse.json(
        {
          error: '日程枠の取得に失敗しました。',
          error_details: 'データベースエラーが発生しました。しばらく待ってから再度ページを更新してください。',
          retry_suggested: true
        },
        { status: 500 }
      );
    }

    console.log(`[API] Slots GET: ${data?.length || 0}件取得`);
    return NextResponse.json(data);
  } catch (error) {
    logApiError('/api/slots', error);
    return NextResponse.json(
      {
        error: '日程枠の読み込みに失敗しました。',
        error_details: 'システムエラーが発生しました。ページを更新してもう一度お試しください。',
        retry_suggested: true
      },
      { status: 500 }
    );
  }
}

// POST: 日程枠作成（管理者のみ）
export async function POST(request: NextRequest) {
  logApiRequest('POST', '/api/slots');

  try {
    // 管理者認証チェック
    if (!verifyAdminToken(request)) {
      console.warn('[API] Slots POST: 認証失敗');
      return NextResponse.json(
        { error: '認証に失敗しました' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { starts_at, capacity = 5 } = body;

    if (!starts_at) {
      console.warn('[API] Slots POST: starts_at が未指定');
      return NextResponse.json(
        { error: '開始日時は必須です' },
        { status: 400 }
      );
    }

    console.log('[API] Slots POST: 日程枠作成開始', {
      starts_at,
      capacity,
      timestamp: new Date().toISOString()
    });

    // 日程枠を作成
    const { data, error } = await supabase
      .from('slots')
      .insert({
        starts_at,
        capacity,
        status: 'open'
      })
      .select()
      .single();

    if (error) {
      logApiError('/api/slots POST', error, { starts_at, capacity });
      console.error('[API] Slots POST: 日程枠作成失敗', {
        error_code: error.code,
        error_message: error.message,
        input_data: { starts_at, capacity }
      });
      return NextResponse.json(
        {
          error: '日程枠の作成に失敗しました。',
          error_details: 'データベースエラーが発生しました。入力内容を確認して再度お試しください。',
          retry_suggested: true
        },
        { status: 500 }
      );
    }

    console.log('[API] Slots POST: 日程枠作成成功', {
      slot_id: data.id,
      starts_at: data.starts_at,
      capacity: data.capacity
    });
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    logApiError('/api/slots POST', error);
    return NextResponse.json(
      {
        error: '日程枠の作成に失敗しました。',
        error_details: 'システムエラーが発生しました。しばらく待ってから再度お試しください。',
        retry_suggested: true
      },
      { status: 500 }
    );
  }
}
