/**
 * メール送信ユーティリティ
 *
 * 注: この実装はコンソールログのみです。
 * 実際のメール送信には、SendGrid、Resend、AWS SESなどのサービスが必要です。
 */

interface SendBookingConfirmationParams {
  to: string;
  name: string;
  slotStartsAt: string;
  slotEndsAt: string | null;
  coachName: string;
  genre: string;
  preworkUrl: string | null;
  zoomUrl: string | null;
}

export async function sendBookingConfirmation(params: SendBookingConfirmationParams): Promise<boolean> {
  const { to, name, slotStartsAt, slotEndsAt, coachName, genre, preworkUrl, zoomUrl } = params;

  // 日時をフォーマット
  const startDate = new Date(slotStartsAt);
  const dateStr = startDate.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    timeZone: 'Asia/Tokyo'
  });
  const startTime = startDate.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tokyo'
  });
  const endTime = slotEndsAt
    ? new Date(slotEndsAt).toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Tokyo'
      })
    : '';

  // メール本文を作成
  const emailBody = `
${name} 様

アカウント添削会のご予約を承りました。

━━━━━━━━━━━━━━━━━━━━━━━━━━
【予約内容】
━━━━━━━━━━━━━━━━━━━━━━━━━━

日時: ${dateStr}
時間: ${startTime}${endTime ? ` - ${endTime}` : ''}
講師: ${coachName}
ジャンル: ${genre}

${zoomUrl ? `
【Zoom会議室】
${zoomUrl}

※開始5分前にはZoomに入室してお待ちください。
` : ''}

${preworkUrl ? `
【事前提出物】
以下のURLより事前課題をご提出ください：
${preworkUrl}

※期日までに必ずご提出をお願いいたします。
` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━
【当日の準備】
━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ カメラとマイクのチェック
✓ 安定したインターネット接続の確認
✓ 静かな環境の確保
✓ 事前課題の提出確認（該当する場合）

━━━━━━━━━━━━━━━━━━━━━━━━━━

当日お会いできることを楽しみにしております。
ご不明な点がございましたら、お気軽にお問い合わせください。

アカウント添削会運営事務局
  `.trim();

  // 実際のメール送信
  // TODO: SendGrid、Resend、AWS SESなどのメール送信サービスと連携
  console.log('=== メール送信 ===');
  console.log(`To: ${to}`);
  console.log(`Subject: 【予約完了】アカウント添削会のご案内`);
  console.log(`Body:\n${emailBody}`);
  console.log('==================');

  // 現在はログ出力のみで成功を返す
  // 実際のメール送信実装時は、APIレスポンスに応じてtrue/falseを返す
  return true;
}

export function isEmailEnabled(): boolean {
  // メール送信が設定されているかチェック
  // TODO: 実際のメール送信サービスの環境変数をチェック
  // 例: return !!process.env.SENDGRID_API_KEY;
  return false; // 現在は無効
}
