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

    // 日程枠を削除（関連する予約も CASCADE で自動削除される）
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
    const { zoom_url, status, capacity, duration_hours } = body;

    const updateData: any = {};
    if (zoom_url !== undefined) updateData.zoom_url = zoom_url;
    if (status !== undefined) updateData.status = status;
    if (capacity !== undefined) updateData.capacity = capacity;

    // duration_hours が指定された場合、バリデーションと ends_at の再計算が必要
    if (duration_hours !== undefined) {
      const durationHoursNum = parseFloat(String(duration_hours));
      if (isNaN(durationHoursNum) || durationHoursNum < 0.5 || durationHoursNum > 10 || (durationHoursNum * 2) % 1 !== 0) {
        console.warn('[API] Slots PATCH: duration_hours が不正', { duration_hours });
        return NextResponse.json(
          { error: '講義時間は0.5〜10時間の範囲で、30分単位で指定してください' },
          { status: 400 }
        );
      }
      updateData.duration_hours = durationHoursNum;

      // 現在のslotのstarts_atを取得してends_atを再計算
      const { data: currentSlot, error: fetchError } = await supabase
        .from('slots')
        .select('starts_at')
        .eq('id', id)
        .single();

      if (fetchError || !currentSlot) {
        logApiError('/api/slots PATCH', fetchError, { slot_id: id });
        return NextResponse.json(
          { error: '日程枠が見つかりません' },
          { status: 404 }
        );
      }

      const startsAtDate = new Date(currentSlot.starts_at);
      const endsAtDate = new Date(startsAtDate.getTime() + durationHoursNum * 60 * 60 * 1000);
      updateData.ends_at = endsAtDate.toISOString();
    }

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
