'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Booking {
  id: string;
  slot_id: string;
  name: string;
  email: string;
  coach_name: string;
  genre: string;
  prework_url: string | null;
  created_at: string;
}

interface Slot {
  id: string;
  starts_at: string;
  ends_at: string | null;
}

function BookingSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const bookingId = searchParams.get('bookingId');

  const [booking, setBooking] = useState<Booking | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [loading, setLoading] = useState(true);
  const [calendarAdding, setCalendarAdding] = useState(false);
  const [calendarAdded, setCalendarAdded] = useState(false);
  const [calendarError, setCalendarError] = useState('');

  useEffect(() => {
    if (!bookingId) {
      router.push('/');
      return;
    }
    fetchBookingDetails();
  }, [bookingId]);

  const fetchBookingDetails = async () => {
    try {
      // 予約情報を取得（簡易実装：クライアント側で検証なし）
      // 実際のプロダクションでは、APIで予約詳細を取得する方が安全
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch booking:', error);
      setLoading(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Tokyo'
    });
  };

  const handleAddToCalendar = async () => {
    if (!bookingId) return;

    setCalendarAdding(true);
    setCalendarError('');

    try {
      const response = await fetch(`/api/bookings/${bookingId}/add-to-calendar`, {
        method: 'POST'
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setCalendarAdded(true);
        if (data.event_link) {
          // カレンダーイベントを新しいタブで開く
          window.open(data.event_link, '_blank');
        }
      } else {
        setCalendarError(data.error || 'カレンダーへの追加に失敗しました');
      }
    } catch (error) {
      setCalendarError('カレンダーへの追加中にエラーが発生しました');
    } finally {
      setCalendarAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-8 bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-500">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-8 bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
      <main className="max-w-3xl mx-auto w-full">
        <div className="bg-white p-8 sm:p-12 rounded-xl shadow-lg">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-100 to-green-200 rounded-full mb-6 shadow-md">
              <svg
                className="w-10 h-10 text-green-600"
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
            <h1 className="text-4xl font-bold text-gray-900 mb-3">
              予約が完了しました
            </h1>
            <p className="text-gray-600 text-lg">
              予約確認メールを送信しました。メールをご確認ください。
            </p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 p-6 rounded-xl mb-6 shadow-sm">
            <h2 className="font-bold text-blue-900 mb-4 flex items-center text-lg">
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              予約内容
            </h2>
            <div className="space-y-2">
              <div className="flex items-center bg-white p-3 rounded-lg">
                <span className="text-blue-700 font-semibold w-28">予約ID:</span>
                <span className="text-blue-900 font-mono text-sm bg-blue-100 px-3 py-1 rounded">{bookingId}</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-50 to-slate-50 border border-gray-200 p-6 rounded-xl mb-8 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center text-lg">
              <svg className="w-6 h-6 mr-2 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              次のステップ
            </h3>
            <ol className="space-y-3">
              <li className="flex items-start bg-white p-4 rounded-lg shadow-sm">
                <span className="flex-shrink-0 w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">1</span>
                <span className="text-gray-700 pt-1">確認メールに記載されている詳細をご確認ください</span>
              </li>
              <li className="flex items-start bg-white p-4 rounded-lg shadow-sm">
                <span className="flex-shrink-0 w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">2</span>
                <span className="text-gray-700 pt-1">事前課題がある場合は、期日までに提出してください</span>
              </li>
              <li className="flex items-start bg-white p-4 rounded-lg shadow-sm">
                <span className="flex-shrink-0 w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">3</span>
                <span className="text-gray-700 pt-1">当日は開始時刻の5分前までにご準備ください</span>
              </li>
            </ol>
          </div>

          {/* Googleカレンダー連携セクション */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 p-6 rounded-xl mb-8 shadow-sm">
            <h3 className="font-bold text-green-900 mb-3 flex items-center text-lg">
              <svg className="w-6 h-6 mr-2 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Googleカレンダーと連携しますか？
            </h3>
            <p className="text-green-800 mb-4 text-sm">
              予定をGoogleカレンダーに追加すると、リマインダーや詳細情報を確認できます。
            </p>

            {calendarError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {calendarError}
              </div>
            )}

            {calendarAdded ? (
              <div className="flex items-center gap-2 text-green-700 bg-green-100 p-3 rounded-lg">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold">Googleカレンダーに追加しました</span>
              </div>
            ) : (
              <button
                onClick={handleAddToCalendar}
                disabled={calendarAdding}
                className="w-full bg-white border-2 border-green-600 text-green-700 py-3 px-6 rounded-lg hover:bg-green-50 font-semibold text-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {calendarAdding ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-green-700" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    カレンダーに追加中...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Googleカレンダーに追加する
                  </>
                )}
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/"
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 px-6 rounded-lg hover:from-blue-700 hover:to-blue-800 text-center font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 flex items-center justify-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              トップページへ戻る
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function BookingSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen p-8 bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    }>
      <BookingSuccessContent />
    </Suspense>
  );
}
