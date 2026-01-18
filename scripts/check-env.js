#!/usr/bin/env node

/**
 * 起動前の環境変数チェックスクリプト
 * npm run dev や npm run build の前に実行される
 */

// .env.local ファイルを読み込む
require('dotenv').config({ path: '.env.local' });

function checkEnv() {
  console.log('=== 環境変数チェック ===');
  console.log(`環境: ${process.env.NODE_ENV || 'development'}`);

  const errors = [];
  const warnings = [];

  // Supabase設定（必須）
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    errors.push('NEXT_PUBLIC_SUPABASE_URL が設定されていません');
  } else {
    console.log(`✓ Supabase URL: 設定済み`);
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('https://')) {
      warnings.push('NEXT_PUBLIC_SUPABASE_URL が https:// で始まっていません');
    }
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY が設定されていません');
  } else {
    console.log(`✓ Supabase Anon Key: 設定済み`);
    if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length < 100) {
      warnings.push('NEXT_PUBLIC_SUPABASE_ANON_KEY の長さが短すぎる可能性があります');
    }
  }

  // Admin認証（必須）
  if (!process.env.ADMIN_TOKEN) {
    errors.push('ADMIN_TOKEN が設定されていません');
  } else {
    console.log(`✓ Admin Token: 設定済み`);
    if (process.env.ADMIN_TOKEN.length < 16) {
      warnings.push('ADMIN_TOKEN は16文字以上を推奨します（セキュリティ向上のため）');
    }
  }

  // Google Calendar設定（任意）
  const hasCalendarEmail = !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const hasCalendarKey = !!process.env.GOOGLE_PRIVATE_KEY;
  const hasCalendarId = !!process.env.GOOGLE_CALENDAR_ID;

  if (hasCalendarEmail && hasCalendarKey && hasCalendarId) {
    console.log('✓ Google Calendar連携: 有効');
  } else if (hasCalendarEmail || hasCalendarKey || hasCalendarId) {
    warnings.push('Google Calendar設定が不完全です（カレンダー連携が無効になります）');
    if (!hasCalendarEmail) warnings.push('  - GOOGLE_SERVICE_ACCOUNT_EMAIL が未設定');
    if (!hasCalendarKey) warnings.push('  - GOOGLE_PRIVATE_KEY が未設定');
    if (!hasCalendarId) warnings.push('  - GOOGLE_CALENDAR_ID が未設定');
  } else {
    console.log('ℹ Google Calendar連携: 無効（任意機能）');
  }

  // 警告表示
  if (warnings.length > 0) {
    console.warn('\n⚠️  警告:');
    warnings.forEach(warning => console.warn(`  - ${warning}`));
  }

  // エラー表示
  if (errors.length > 0) {
    console.error('\n❌ エラー:');
    errors.forEach(error => console.error(`  - ${error}`));
    console.error('\n.env.local ファイルを確認してください');
    console.error('参考: .env.local.example を参照\n');
    process.exit(1);
  } else {
    console.log('\n✅ 環境変数チェック完了\n');
  }
}

checkEnv();
