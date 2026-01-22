'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface BookingData {
  coach_name: string;
  genre: string;
  slots: {
    starts_at: string;
    ends_at: string;
    zoom_url?: string;
  };
}

function BookingSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const bookingId = searchParams.get('bookingId');

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<BookingData | null>(null);

  useEffect(() => {
    if (!bookingId) {
      router.push('/');
      return;
    }
    // 予約情報を取得してカレンダーURL生成用に使用
    fetchBooking();
  }, [bookingId, router]);

  const fetchBooking = async () => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}`);
      if (response.ok) {
        const data = await response.json();
        setBooking(data);
      }
    } catch (error) {
      console.error('Failed to fetch booking:', error);
    } finally {
      setLoading(false);
    }
  };

  // GoogleカレンダーURL生成（ユーザーが自分のカレンダーに追加）
  const generateGoogleCalendarUrl = () => {
    if (!booking) return '';

    const title = encodeURIComponent(`アカウント添削会`);
    const startDate = new Date(booking.slots.starts_at);
    // ends_atがnullの場合は開始時刻の1時間後をデフォルトとする
    const endDate = booking.slots.ends_at
      ? new Date(booking.slots.ends_at)
      : new Date(startDate.getTime() + 60 * 60 * 1000);

    // ISO形式をGoogleカレンダー形式に変換 (YYYYMMDDTHHmmssZ)
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    };

    const details = encodeURIComponent(
      `【アカウント添削会】\n\n` +
      `講師名: ${booking.coach_name}\n` +
      `ジャンル: ${booking.genre}\n\n` +
      `カイシャインさんによる参加必須のアカウント添削会を行います。\n` +
      `予定時刻の5分前には着席をお願いいたします！` +
      (booking.slots.zoom_url ? `\n\n━━━━━━━━━━━━━━━\nZoom URL:\n${booking.slots.zoom_url}` : '')
    );

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${formatDate(startDate)}/${formatDate(endDate)}&details=${details}&ctz=Asia/Tokyo`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#d2d2d7] border-t-[#1d1d1f] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      {/* ヘッダー - ライトグレー */}
      <header className="sticky top-0 z-50 bg-[#f5f5f7] border-b border-[#d2d2d7]/50">
        <div className="max-w-[680px] mx-auto px-6">
          <div className="flex items-center h-11">
            <Link href="/" className="text-[12px] text-[#6e6e73] hover:text-[#1d1d1f] transition-colors">
              ← トップへ戻る
            </Link>
          </div>
        </div>
      </header>

      {/* ヒーローセクション - 白背景 */}
      <section className="bg-white pt-16 pb-12 text-center">
        <div className="max-w-[680px] mx-auto px-6">
          {/* チェックマークアイコン */}
          <div className="inline-flex items-center justify-center w-20 h-20 bg-[#e8f5e9] rounded-full mb-6">
            <svg
              className="w-10 h-10 text-[#1d7d3f]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-[40px] sm:text-[48px] font-semibold text-[#1d1d1f] tracking-[-0.003em] leading-[1.07] mb-3">
            予約が完了しました
          </h1>
          <p className="text-[17px] sm:text-[19px] text-[#86868b]">
            Googleカレンダーへの登録をお願いします
          </p>
        </div>
      </section>

      <main className="max-w-[680px] mx-auto px-6 py-10">
        {/* 予約ID */}
        <div className="bg-white rounded-[18px] p-6 mb-6">
          <h2 className="text-[13px] font-semibold text-[#86868b] uppercase tracking-[0.02em] mb-3">予約ID</h2>
          <p className="font-mono text-[15px] text-[#1d1d1f] bg-[#f5f5f7] px-4 py-3 rounded-[12px]">
            {bookingId}
          </p>
        </div>

        {/* 次のステップ */}
        <div className="bg-white rounded-[18px] p-8 mb-6">
          <h3 className="text-[19px] font-semibold text-[#1d1d1f] mb-6">次のステップ</h3>
          <ol className="space-y-5">
            <li className="flex items-start gap-4">
              <span className="flex-shrink-0 w-8 h-8 bg-[#1d1d1f] text-white rounded-full flex items-center justify-center text-[14px] font-semibold">1</span>
              <span className="text-[15px] text-[#1d1d1f] leading-relaxed pt-1">下記にあるGoogleカレンダーで予定の登録をしてください</span>
            </li>
            <li className="flex items-start gap-4">
              <span className="flex-shrink-0 w-8 h-8 bg-[#1d1d1f] text-white rounded-full flex items-center justify-center text-[14px] font-semibold">2</span>
              <span className="text-[15px] text-[#1d1d1f] leading-relaxed pt-1">事前課題がある場合は、期日までに提出してください</span>
            </li>
            <li className="flex items-start gap-4">
              <span className="flex-shrink-0 w-8 h-8 bg-[#1d1d1f] text-white rounded-full flex items-center justify-center text-[14px] font-semibold">3</span>
              <span className="text-[15px] text-[#1d1d1f] leading-relaxed pt-1">当日は開始時刻の5分前までにご準備ください</span>
            </li>
          </ol>
        </div>

        {/* Googleカレンダー */}
        <div className="bg-white rounded-[18px] p-8 mb-6">
          <h3 className="text-[19px] font-semibold text-[#1d1d1f] mb-2">Googleカレンダーに追加</h3>
          <p className="text-[15px] text-[#86868b] mb-4">
            Googleカレンダーに追加するとリマインダーを受け取れます！
          </p>
          <p className="text-[15px] text-[#ff9500] font-medium mb-6">
            追加後、通知設定をお忘れなく！
          </p>

          {booking ? (
            <a
              href={generateGoogleCalendarUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-[#e8f5e9] border-2 border-[#1d7d3f] text-[#1d7d3f] py-3.5 px-6 rounded-[980px] hover:bg-[#d4edda] font-medium text-[15px] transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Googleカレンダーに追加する
            </a>
          ) : (
            <div className="text-center text-[#86868b] text-[14px]">
              読み込み中...
            </div>
          )}
        </div>

        {/* トップへ戻るボタン */}
        <Link
          href="/"
          className="block w-full bg-[#0071e3] text-white py-4 px-6 rounded-[980px] hover:bg-[#0077ed] text-center font-medium text-[17px] transition-colors"
        >
          トップページへ戻る
        </Link>
      </main>
    </div>
  );
}

export default function BookingSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#d2d2d7] border-t-[#1d1d1f] rounded-full animate-spin"></div>
      </div>
    }>
      <BookingSuccessContent />
    </Suspense>
  );
}
