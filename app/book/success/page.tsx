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

  if (loading) {
    return (
      <div className="min-h-screen p-8 bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <main className="max-w-2xl mx-auto">
        <div className="bg-white p-8 rounded-lg shadow">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              予約が完了しました
            </h1>
            <p className="text-gray-600">
              予約確認メールを送信しました。メールをご確認ください。
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg mb-6">
            <h2 className="font-semibold text-blue-900 mb-4">予約内容</h2>
            <div className="space-y-2 text-sm">
              <div className="flex">
                <span className="text-blue-700 font-medium w-32">予約ID:</span>
                <span className="text-blue-900">{bookingId}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 p-6 rounded-lg mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">次のステップ</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
              <li>確認メールに記載されている詳細をご確認ください</li>
              <li>事前課題がある場合は、期日までに提出してください</li>
              <li>当日は開始時刻の5分前までにご準備ください</li>
            </ol>
          </div>

          <div className="flex gap-4">
            <Link
              href="/"
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 text-center font-medium"
            >
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
