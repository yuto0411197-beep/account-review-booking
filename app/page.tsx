'use client';

import { useState, useEffect } from 'react';
import { Slot } from '@/lib/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchSlots();
  }, []);

  const fetchSlots = async () => {
    try {
      const response = await fetch('/api/slots');
      if (response.ok) {
        const data = await response.json();
        setSlots(data);
      }
    } catch (error) {
      console.error('Failed to fetch slots:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
      timeZone: 'Asia/Tokyo'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      timeZone: 'Asia/Tokyo',
      minute: '2-digit'
    });
  };

  const handleBooking = (slotId: string) => {
    router.push(`/book/${slotId}`);
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <main className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">
            アカウント添削会 予約
          </h1>
          <Link
            href="/admin"
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            管理画面
          </Link>
        </div>

        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-semibold mb-4">日程一覧</h2>

          {loading ? (
            <div className="text-center py-8 text-gray-500">
              読み込み中...
            </div>
          ) : slots.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              現在予約可能な日程枠はありません
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      日付
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      時間
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      残席数
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      予約
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {slots.map((slot) => {
                    const remainingSeats = slot.capacity - slot.booked_count;
                    const isFull = slot.status === 'closed';

                    return (
                      <tr key={slot.id} className={isFull ? 'bg-gray-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {formatDate(slot.starts_at)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {formatTime(slot.starts_at)} - {slot.ends_at && formatTime(slot.ends_at)}
                          </div>
                          <div className="text-xs text-gray-500">
                            (1時間)
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm font-medium ${
                            isFull ? 'text-red-600' : remainingSeats <= 2 ? 'text-orange-600' : 'text-green-600'
                          }`}>
                            {isFull ? '満席' : `残り${remainingSeats}名`}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isFull ? (
                            <button
                              className="bg-gray-400 text-white px-4 py-2 rounded-md cursor-not-allowed text-sm"
                              disabled
                            >
                              満席
                            </button>
                          ) : (
                            <button
                              onClick={() => handleBooking(slot.id)}
                              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
                            >
                              予約する
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-2 text-blue-900">予約の流れ</h3>
          <ol className="list-decimal list-inside space-y-1 text-blue-800">
            <li>上記の日程一覧から希望の日時を選択</li>
            <li>予約フォームに必要情報を入力</li>
            <li>予約完了後、確認画面が表示されます</li>
          </ol>
        </div>
      </main>
    </div>
  );
}
