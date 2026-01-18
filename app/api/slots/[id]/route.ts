// @ts-nocheck - Supabase型推論の問題を回避
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { verifyAdminToken } from '@/lib/auth';
import { logApiRequest, logApiError } from '@/lib/env-check';

// DELETE: 日程枠削除（管理者のみ）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  logApiRequest('DELETE', `/api/slots/${id}`);

  try {
    // 管理者認証チェック
    if (!verifyAdminToken(request)) {
      console.warn('[API] Slots DELETE: 認証失敗');
      return NextResponse.json(
        { error: '認証に失敗しました' },
        { status: 401 }
      );
    }

    // 予約が存在する場合は削除を拒否
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id')
      .eq('slot_id', id);

    if (bookingsError) {
      logApiError('/api/slots DELETE - bookings check', bookingsError, { slot_id: id });
      return NextResponse.json(
        { error: '予約の確認中にエラーが発生しました' },
        { status: 500 }
      );
    }

    if (bookings && bookings.length > 0) {
      console.warn(`[API] Slots DELETE: 予約が存在するため削除不可 - slot_id: ${id}, 予約数: ${bookings.length}`);
      return NextResponse.json(
        {
          error: 'この日程枠には予約が存在するため削除できません',
          booking_count: bookings.length
        },
        { status: 400 }
      );
    }

    // 日程枠を削除
    const { error } = await supabase
      .from('slots')
      .delete()
      .eq('id', id);

    if (error) {
      logApiError('/api/slots DELETE', error, { slot_id: id });
      return NextResponse.json(
        { error: '日程枠の削除に失敗しました' },
        { status: 500 }
      );
    }

    console.log(`[API] Slots DELETE: 削除成功 - slot_id: ${id}`);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logApiError('/api/slots DELETE', error, { slot_id: id });
    return NextResponse.json(
      { error: '日程枠の削除中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

// PATCH: 日程枠更新（管理者のみ）
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  logApiRequest('PATCH', `/api/slots/${id}`);

  try {
    // 管理者認証チェック
    if (!verifyAdminToken(request)) {
      console.warn('[API] Slots PATCH: 認証失敗');
      return NextResponse.json(
        { error: '認証に失敗しました' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { zoom_url, status } = body;

    const updateData: any = {};
    if (zoom_url !== undefined) updateData.zoom_url = zoom_url;
    if (status !== undefined) updateData.status = status;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: '更新するデータがありません' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('slots')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logApiError('/api/slots PATCH', error, { slot_id: id, updateData });
      return NextResponse.json(
        { error: '日程枠の更新に失敗しました' },
        { status: 500 }
      );
    }

    console.log(`[API] Slots PATCH: 更新成功 - slot_id: ${id}`, updateData);
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    logApiError('/api/slots PATCH', error, { slot_id: id });
    return NextResponse.json(
      { error: '日程枠の更新中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
