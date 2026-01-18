import { google } from 'googleapis';
import { Slot } from './types';

/**
 * Googleカレンダー連携ユーティリティ
 *
 * サービスアカウント方式を使用して、主催者のGoogleカレンダーにイベントを作成します。
 *
 * 必要な環境変数:
 * - GOOGLE_SERVICE_ACCOUNT_EMAIL: サービスアカウントのメールアドレス
 * - GOOGLE_PRIVATE_KEY: サービスアカウントの秘密鍵
 * - GOOGLE_CALENDAR_ID: 主催者のカレンダーID
 */

interface CreateEventParams {
  slot: Slot;
  name: string;
  email: string;
  coach_name: string;
  genre: string;
  prework_url?: string | null;
}

interface CreateEventResult {
  success: boolean;
  event_id?: string;
  event_link?: string;
  error?: string;
  error_type?: 'auth' | 'permission' | 'not_found' | 'rate_limit' | 'validation' | 'network' | 'unknown';
  error_details?: string;
}

/**
 * Google Calendar APIエラーを分類して詳細情報を返す
 */
function categorizeCalendarError(error: any): { type: string; details: string; message: string } {
  // エラーオブジェクトの構造を確認
  const statusCode = error?.response?.status || error?.code || error?.statusCode;
  const errorMessage = error?.message || String(error);
  const errorDetails = error?.response?.data?.error?.message || error?.errors?.[0]?.message || '';

  console.log(`[Calendar Error Debug] Status: ${statusCode}, Message: ${errorMessage}`);

  // HTTP ステータスコードで分類
  if (statusCode === 401 || errorMessage.includes('Unauthorized') || errorMessage.includes('Invalid Credentials')) {
    return {
      type: 'auth',
      details: 'サービスアカウントの認証情報が無効です。GOOGLE_SERVICE_ACCOUNT_EMAIL と GOOGLE_PRIVATE_KEY を確認してください。',
      message: '認証エラー: サービスアカウントの認証に失敗しました'
    };
  }

  if (statusCode === 403 || errorMessage.includes('Forbidden') || errorMessage.includes('Permission denied')) {
    return {
      type: 'permission',
      details: 'カレンダーへのアクセス権限がありません。サービスアカウント（' +
               (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.substring(0, 20) || 'unknown') +
               '...）をカレンダーに共有してください。',
      message: '権限エラー: カレンダーへのアクセスが拒否されました'
    };
  }

  if (statusCode === 404 || errorMessage.includes('Not Found') || errorMessage.includes('notFound')) {
    return {
      type: 'not_found',
      details: 'カレンダーが見つかりません。GOOGLE_CALENDAR_ID（' +
               (process.env.GOOGLE_CALENDAR_ID?.substring(0, 20) || 'unknown') +
               '...）を確認してください。',
      message: 'カレンダーIDエラー: 指定されたカレンダーが見つかりません'
    };
  }

  if (statusCode === 429 || errorMessage.includes('Rate Limit') || errorMessage.includes('quotaExceeded')) {
    return {
      type: 'rate_limit',
      details: 'Google Calendar APIのレート制限に達しました。しばらく待ってから再試行してください。',
      message: 'レート制限エラー: APIの使用制限に達しました'
    };
  }

  if (statusCode === 400 || errorMessage.includes('Invalid') || errorMessage.includes('Bad Request')) {
    return {
      type: 'validation',
      details: `入力データが不正です: ${errorDetails || errorMessage}`,
      message: 'バリデーションエラー: イベントデータが不正です'
    };
  }

  if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('ETIMEDOUT') || errorMessage.includes('network')) {
    return {
      type: 'network',
      details: 'ネットワークエラーが発生しました。インターネット接続を確認してください。',
      message: 'ネットワークエラー: Google Calendar APIに接続できません'
    };
  }

  // その他のエラー
  return {
    type: 'unknown',
    details: errorDetails || errorMessage,
    message: 'カレンダー連携エラー: ' + errorMessage
  };
}

/**
 * Google Calendar APIクライアントを初期化
 */
function getCalendarClient() {
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const calendarId = process.env.GOOGLE_CALENDAR_ID;

  if (!serviceAccountEmail || !privateKey || !calendarId) {
    throw new Error('Google Calendar環境変数が設定されていません');
  }

  console.log(`[Calendar] サービスアカウント: ${serviceAccountEmail.substring(0, 20)}...`);
  console.log(`[Calendar] カレンダーID: ${calendarId.substring(0, 20)}...`);

  const auth = new google.auth.JWT({
    email: serviceAccountEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });

  return {
    calendar: google.calendar({ version: 'v3', auth }),
    calendarId,
  };
}

/**
 * Googleカレンダーにイベントを作成
 */
export async function createCalendarEvent(
  params: CreateEventParams
): Promise<CreateEventResult> {
  const startTime = Date.now();

  try {
    const { calendar, calendarId } = getCalendarClient();
    const { slot, name, email, coach_name, genre, prework_url } = params;

    console.log(`[Calendar] イベント作成開始 - attendee: ${email}, slot: ${slot.starts_at}`);

    // イベントタイトル
    const summary = `5対1 アカウント添削会｜講師名：${coach_name}｜ジャンル：${genre}`;

    // イベント説明文
    const descriptionParts = [
      '【アカウント添削会のご案内】',
      '',
      '【予約情報】',
      `予約者名: ${name}`,
      `メールアドレス: ${email}`,
      `講師名: ${coach_name}`,
      `ジャンル: ${genre}`,
    ];

    if (slot.zoom_url) {
      descriptionParts.push('', '【Zoom会議室】', slot.zoom_url);
    }

    if (prework_url) {
      descriptionParts.push('', '【事前提出物】', prework_url);
    }

    descriptionParts.push(
      '',
      '━━━━━━━━━━━━━━━━━━━━━',
      '当日お会いできることを楽しみにしております。',
      'ご不明な点がございましたら、お気軽にお問い合わせください。'
    );

    const description = descriptionParts.join('\n');

    // attendeesの検証
    if (!email || !email.includes('@')) {
      throw new Error(`無効なメールアドレス: ${email}`);
    }

    console.log(`[Calendar] attendees に追加: ${email}`);

    // イベント作成
    const response = await calendar.events.insert({
      calendarId,
      sendUpdates: 'all', // 招待メールを自動送信
      requestBody: {
        summary,
        description,
        start: {
          dateTime: slot.starts_at,
          timeZone: 'Asia/Tokyo',
        },
        end: {
          dateTime: slot.ends_at || slot.starts_at,
          timeZone: 'Asia/Tokyo',
        },
        attendees: [
          {
            email,
            displayName: name,
            responseStatus: 'needsAction',
          },
        ],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 1日前
            { method: 'popup', minutes: 30 }, // 30分前
          ],
        },
        guestsCanModify: false,
        guestsCanInviteOthers: false,
        guestsCanSeeOtherGuests: false,
      },
    });

    if (!response.data.id || !response.data.htmlLink) {
      throw new Error('カレンダーイベントのIDまたはリンクが取得できませんでした');
    }

    const duration = Date.now() - startTime;
    console.log(`[Calendar] イベント作成成功 - event_id: ${response.data.id}, 処理時間: ${duration}ms`);
    console.log(`[Calendar] 招待メール送信先: ${email}`);
    console.log(`[Calendar] イベントリンク: ${response.data.htmlLink}`);

    return {
      success: true,
      event_id: response.data.id,
      event_link: response.data.htmlLink,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorInfo = categorizeCalendarError(error);

    console.error(`[Calendar Error] タイプ: ${errorInfo.type}, 処理時間: ${duration}ms`);
    console.error(`[Calendar Error] メッセージ: ${errorInfo.message}`);
    console.error(`[Calendar Error] 詳細: ${errorInfo.details}`);

    // デバッグ用に元のエラーも出力（本番では環境変数で制御可能）
    if (process.env.NODE_ENV !== 'production') {
      console.error('[Calendar Error] 元のエラー:', error);
    }

    return {
      success: false,
      error: errorInfo.message,
      error_type: errorInfo.type as any,
      error_details: errorInfo.details,
    };
  }
}

/**
 * カレンダーイベントを削除
 */
export async function deleteCalendarEvent(
  eventId: string
): Promise<CreateEventResult> {
  try {
    const { calendar, calendarId } = getCalendarClient();

    console.log(`[Calendar] イベント削除開始 - event_id: ${eventId}`);

    await calendar.events.delete({
      calendarId,
      eventId,
      sendUpdates: 'all', // キャンセル通知を送信
    });

    console.log(`[Calendar] イベント削除成功 - event_id: ${eventId}`);

    return {
      success: true,
    };
  } catch (error) {
    const errorInfo = categorizeCalendarError(error);

    console.error(`[Calendar Delete Error] タイプ: ${errorInfo.type}`);
    console.error(`[Calendar Delete Error] メッセージ: ${errorInfo.message}`);
    console.error(`[Calendar Delete Error] 詳細: ${errorInfo.details}`);

    return {
      success: false,
      error: errorInfo.message,
      error_type: errorInfo.type as any,
      error_details: errorInfo.details,
    };
  }
}

/**
 * Googleカレンダー連携が有効かチェック
 */
export function isCalendarEnabled(): boolean {
  const enabled = !!(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY &&
    process.env.GOOGLE_CALENDAR_ID
  );

  if (!enabled) {
    console.log('[Calendar] カレンダー連携は無効（環境変数未設定）');
  }

  return enabled;
}

/**
 * カレンダー連携の設定を検証
 */
export function validateCalendarConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
    errors.push('GOOGLE_SERVICE_ACCOUNT_EMAIL が設定されていません');
  } else if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL.includes('@')) {
    errors.push('GOOGLE_SERVICE_ACCOUNT_EMAIL の形式が不正です');
  }

  if (!process.env.GOOGLE_PRIVATE_KEY) {
    errors.push('GOOGLE_PRIVATE_KEY が設定されていません');
  } else if (!process.env.GOOGLE_PRIVATE_KEY.includes('BEGIN PRIVATE KEY')) {
    errors.push('GOOGLE_PRIVATE_KEY の形式が不正です（BEGIN PRIVATE KEY が含まれていません）');
  }

  if (!process.env.GOOGLE_CALENDAR_ID) {
    errors.push('GOOGLE_CALENDAR_ID が設定されていません');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
