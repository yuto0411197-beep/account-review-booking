/**
 * 環境変数チェックユーティリティ
 * 起動時に必要な環境変数が設定されているか確認する
 * 秘密情報はログに出力しない
 */

interface EnvCheckResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * 必須の環境変数をチェック
 */
export function checkRequiredEnv(): EnvCheckResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Supabase設定（必須）
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    errors.push('NEXT_PUBLIC_SUPABASE_URL が設定されていません');
  } else if (!process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('https://')) {
    warnings.push('NEXT_PUBLIC_SUPABASE_URL が https:// で始まっていません');
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY が設定されていません');
  } else if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length < 100) {
    warnings.push('NEXT_PUBLIC_SUPABASE_ANON_KEY の長さが短すぎる可能性があります');
  }

  // Admin認証（必須）
  if (!process.env.ADMIN_TOKEN) {
    errors.push('ADMIN_TOKEN が設定されていません');
  } else if (process.env.ADMIN_TOKEN.length < 16) {
    warnings.push('ADMIN_TOKEN は16文字以上を推奨します（セキュリティ向上のため）');
  }

  // Google Calendar設定（任意）
  const hasCalendarEmail = !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const hasCalendarKey = !!process.env.GOOGLE_PRIVATE_KEY;
  const hasCalendarId = !!process.env.GOOGLE_CALENDAR_ID;

  if (hasCalendarEmail || hasCalendarKey || hasCalendarId) {
    // 一部だけ設定されている場合は警告
    if (!hasCalendarEmail) {
      warnings.push('GOOGLE_SERVICE_ACCOUNT_EMAIL が設定されていません（カレンダー連携が無効になります）');
    }
    if (!hasCalendarKey) {
      warnings.push('GOOGLE_PRIVATE_KEY が設定されていません（カレンダー連携が無効になります）');
    }
    if (!hasCalendarId) {
      warnings.push('GOOGLE_CALENDAR_ID が設定されていません（カレンダー連携が無効になります）');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * 環境変数チェック結果をログ出力
 * 秘密情報は出力しない
 */
export function logEnvCheckResult(): void {
  const result = checkRequiredEnv();

  console.log('=== 環境変数チェック ===');
  console.log(`環境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? '設定済み' : '未設定'}`);
  console.log(`Supabase Anon Key: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '設定済み' : '未設定'}`);
  console.log(`Admin Token: ${process.env.ADMIN_TOKEN ? '設定済み' : '未設定'}`);
  console.log(`Google Calendar連携: ${
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY &&
    process.env.GOOGLE_CALENDAR_ID
      ? '有効'
      : '無効'
  }`);

  if (result.warnings.length > 0) {
    console.warn('\n⚠️  警告:');
    result.warnings.forEach(warning => console.warn(`  - ${warning}`));
  }

  if (result.errors.length > 0) {
    console.error('\n❌ エラー:');
    result.errors.forEach(error => console.error(`  - ${error}`));
    console.error('\n.env.local ファイルを確認してください');
  } else {
    console.log('\n✅ 環境変数チェック完了\n');
  }
}

/**
 * APIリクエストのログ出力（開発環境のみ）
 */
export function logApiRequest(
  method: string,
  path: string,
  params?: Record<string, any>
): void {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[API] ${method} ${path}`, params ? `params: ${JSON.stringify(params)}` : '');
  }
}

/**
 * APIエラーのログ出力
 */
export function logApiError(
  path: string,
  error: any,
  context?: Record<string, any>
): void {
  console.error(`[API Error] ${path}`);
  console.error('Error:', error.message || error);
  if (context) {
    console.error('Context:', JSON.stringify(context, null, 2));
  }
  if (error.stack && process.env.NODE_ENV !== 'production') {
    console.error('Stack:', error.stack);
  }
}
