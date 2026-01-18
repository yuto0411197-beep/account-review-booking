/**
 * 事前資料URLのバリデーションユーティリティ
 *
 * Googleスプレッドシート、Googleドキュメント、その他のURL形式を検証し、
 * 共有設定ミスを防ぐための詳細なエラーメッセージを提供します。
 */

export interface UrlValidationResult {
  valid: boolean;
  error?: string;
  warning?: string;
  urlType?: 'google_sheets' | 'google_docs' | 'google_drive' | 'notion' | 'other';
  suggestions?: string[];
}

/**
 * URLの種類を判定
 */
function detectUrlType(url: string): UrlValidationResult['urlType'] {
  if (url.includes('docs.google.com/spreadsheets')) {
    return 'google_sheets';
  }
  if (url.includes('docs.google.com/document')) {
    return 'google_docs';
  }
  if (url.includes('drive.google.com')) {
    return 'google_drive';
  }
  if (url.includes('notion.so') || url.includes('notion.site')) {
    return 'notion';
  }
  return 'other';
}

/**
 * Googleスプレッドシート/ドキュメントの共有設定を確認
 */
function checkGoogleSharingSettings(url: string): { warning?: string; suggestions: string[] } {
  const suggestions: string[] = [];
  let warning: string | undefined;

  // /edit で終わっているか確認
  if (!url.includes('/edit')) {
    warning = 'URLに「/edit」が含まれていません。編集リンクではなく、閲覧専用のリンクの可能性があります。';
    suggestions.push('スプレッドシートを開いて、ブラウザのアドレスバーからURLをコピーしてください');
  }

  // クエリパラメータの確認
  if (url.includes('usp=sharing')) {
    // 正しい共有リンク
  } else if (url.includes('usp=')) {
    suggestions.push('共有設定を確認してください。「リンクを知っている全員」に設定されているか確認してください。');
  }

  return { warning, suggestions };
}

/**
 * 事前資料URLを検証
 */
export function validatePreworkUrl(url: string | null | undefined): UrlValidationResult {
  // 空の場合は任意項目なのでOK
  if (!url || url.trim() === '') {
    return { valid: true };
  }

  const trimmedUrl = url.trim();

  // 基本的なURL形式チェック
  try {
    new URL(trimmedUrl);
  } catch (error) {
    return {
      valid: false,
      error: 'URLの形式が正しくありません',
      suggestions: [
        '「https://」で始まる完全なURLを入力してください',
        '例: https://docs.google.com/spreadsheets/d/xxxxx/edit',
      ],
    };
  }

  // プロトコルチェック
  if (!trimmedUrl.startsWith('https://') && !trimmedUrl.startsWith('http://')) {
    return {
      valid: false,
      error: 'URLは「https://」または「http://」で始まる必要があります',
      suggestions: [
        'URLの先頭に「https://」を追加してください',
      ],
    };
  }

  const urlType = detectUrlType(trimmedUrl);

  // Googleスプレッドシート/ドキュメントの場合
  if (urlType === 'google_sheets' || urlType === 'google_docs') {
    const { warning, suggestions } = checkGoogleSharingSettings(trimmedUrl);

    // 共有設定の警告
    const commonSuggestions = [
      ...suggestions,
      'ファイルを開いて「共有」ボタンをクリック',
      '「リンクを知っている全員」に変更',
      '権限を「閲覧者」または「編集者」に設定',
      'URLをコピーして貼り付け',
    ];

    if (warning) {
      return {
        valid: true, // URLとしては有効だが警告を表示
        warning,
        urlType,
        suggestions: commonSuggestions,
      };
    }

    return {
      valid: true,
      urlType,
    };
  }

  // Google Drive の場合
  if (urlType === 'google_drive') {
    return {
      valid: true,
      urlType,
      warning: 'Google Driveのファイルは、共有設定を「リンクを知っている全員」に設定してください',
      suggestions: [
        'ファイルを右クリック > 「共有」',
        '「リンクを知っている全員」に変更',
        '権限を「閲覧者」に設定',
      ],
    };
  }

  // Notion の場合
  if (urlType === 'notion') {
    return {
      valid: true,
      urlType,
      warning: 'Notionページは、「Webで公開」を有効にしてください',
      suggestions: [
        'ページ右上の「共有」ボタンをクリック',
        '「Webで公開」をオンにする',
        'リンクをコピー',
      ],
    };
  }

  // その他のURL
  return {
    valid: true,
    urlType: 'other',
    warning: 'Googleスプレッドシート以外のURLです。アクセス権限が正しく設定されているか確認してください',
  };
}

/**
 * URLを正規化（トリム、クエリパラメータのクリーンアップ等）
 */
export function normalizePreworkUrl(url: string | null | undefined): string | null {
  if (!url || url.trim() === '') {
    return null;
  }

  let normalized = url.trim();

  // Google スプレッドシート/ドキュメントのURLクリーンアップ
  if (normalized.includes('docs.google.com')) {
    try {
      const urlObj = new URL(normalized);

      // 不要なクエリパラメータを削除（usp=sharing は残す）
      const paramsToKeep = ['usp'];
      const newSearchParams = new URLSearchParams();

      paramsToKeep.forEach(param => {
        const value = urlObj.searchParams.get(param);
        if (value) {
          newSearchParams.set(param, value);
        }
      });

      urlObj.search = newSearchParams.toString();
      normalized = urlObj.toString();
    } catch (error) {
      // URL解析エラーの場合はそのまま返す
    }
  }

  return normalized;
}

/**
 * URLの種類に応じた説明文を取得
 */
export function getUrlTypeDescription(urlType: UrlValidationResult['urlType']): string {
  switch (urlType) {
    case 'google_sheets':
      return 'Googleスプレッドシート';
    case 'google_docs':
      return 'Googleドキュメント';
    case 'google_drive':
      return 'Google Driveファイル';
    case 'notion':
      return 'Notionページ';
    case 'other':
      return 'その他のURL';
    default:
      return 'URL';
  }
}
