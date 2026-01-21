'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Booking {
  id: string;
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
  capacity: number;
  booked_count: number;
  zoom_url: string | null;
  bookings: Booking[];
}

export default function AdminBookingsPage() {
  const router = useRouter();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin');
      return;
    }

    fetchBookings();
  }, [router]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/bookings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('予約データの取得に失敗しました');
      }

      const data = await response.json();
      setSlots(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '予約データの取得に失敗しました');
    } finally {
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

  const handleExportAll = async () => {
    setExporting(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/bookings/export', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('エクスポートに失敗しました');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `all_bookings_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('CSVエクスポートに失敗しました');
    } finally {
      setExporting(false);
    }
  };

  const handleExportSlot = async (slotId: string) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/bookings/export?slot_id=${slotId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('エクスポートに失敗しました');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bookings_${slotId.slice(0, 8)}_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('CSVエクスポートに失敗しました');
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
      minute: '2-digit',
      timeZone: 'Asia/Tokyo'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen p-8 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12 text-gray-500">読み込み中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              管理画面に戻る
            </Link>
            {slots.length > 0 && (
              <button
                onClick={handleExportAll}
                disabled={exporting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {exporting ? 'エクスポート中...' : '全件CSVエクスポート'}
              </button>
            )}
          </div>
          <h1 className="text-3xl font-bold text-gray-900">予約管理</h1>
          <p className="mt-2 text-gray-600">日程ごとの参加者と提出物を確認できます</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* 日程一覧 */}
        <div className="space-y-6">
          {slots.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <p className="text-gray-500">予約のある日程はありません</p>
            </div>
          ) : (
            slots.map((slot) => (
              <div key={slot.id} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                {/* 日程ヘッダー */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 text-white">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-semibold">
                        {formatDate(slot.starts_at)}
                      </h2>
                      <p className="text-blue-100 mt-1">
                        {formatTime(slot.starts_at)} - {slot.ends_at && formatTime(slot.ends_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      {slot.bookings && slot.bookings.length > 0 && (
                        <button
                          onClick={() => handleExportSlot(slot.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm transition-colors"
                          title="この日程の予約をCSVエクスポート"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          CSV
                        </button>
                      )}
                      <div className="text-right">
                        <div className="text-2xl font-bold">{slot.booked_count}</div>
                        <div className="text-blue-100 text-sm">名の予約</div>
                      </div>
                    </div>
                  </div>
                  {slot.zoom_url && (
                    <div className="mt-3 pt-3 border-t border-blue-400">
                      <p className="text-sm text-blue-100 mb-1">Zoom URL</p>
                      <a
                        href={slot.zoom_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white hover:text-blue-100 underline break-all text-sm"
                      >
                        {slot.zoom_url}
                      </a>
                    </div>
                  )}
                </div>

                {/* 参加者リスト */}
                {slot.bookings && slot.bookings.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {slot.bookings.map((booking, index) => (
                      <div key={booking.id} className="p-6 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="grid md:grid-cols-2 gap-4">
                              <div>
                                <h3 className="font-semibold text-gray-900 text-lg">{booking.name}</h3>
                                <p className="text-gray-600 mt-1">{booking.email}</p>
                              </div>
                              <div>
                                <div className="space-y-1">
                                  <div>
                                    <span className="text-sm text-gray-500">講師:</span>
                                    <span className="ml-2 text-gray-900">{booking.coach_name}</span>
                                  </div>
                                  <div>
                                    <span className="text-sm text-gray-500">ジャンル:</span>
                                    <span className="ml-2 text-gray-900">{booking.genre}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            {booking.prework_url && (
                              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                                <p className="text-sm font-medium text-blue-900 mb-2">📎 提出物URL</p>
                                <a
                                  href={booking.prework_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-700 underline break-all"
                                >
                                  {booking.prework_url}
                                </a>
                              </div>
                            )}
                            <div className="mt-3 text-sm text-gray-400">
                              予約日時: {formatDateTime(booking.created_at)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    この日程にはまだ予約がありません
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
