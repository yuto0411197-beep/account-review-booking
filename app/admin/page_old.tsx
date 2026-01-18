'use client';

import { useState, useEffect } from 'react';
import { Slot, Booking } from '@/lib/types';

interface BookingWithSlot extends Booking {
  slots?: {
    starts_at: string;
    ends_at: string | null;
  };
}

export default function AdminPage() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [bookings, setBookings] = useState<BookingWithSlot[]>([]);
  const [startsAt, setStartsAt] = useState('');
  const [token, setToken] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // 認証済みの場合は日程枠を取得
    if (isAuthenticated) {
      fetchSlots();
    }
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // トークンをlocalStorageに保存
    localStorage.setItem('adminToken', token);
    setIsAuthenticated(true);
  };

  const fetchSlots = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/slots', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSlots(data);
      }
    } catch (err) {
      console.error('Failed to fetch slots:', err);
    }
  };

  const fetchBookings = async (slotId: string) => {
    try {
      const token = localStorage.getItem('adminToken');
      const { supabase } = await import('@/lib/supabase/client');

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          slots (
            starts_at,
            ends_at
          )
        `)
        .eq('slot_id', slotId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch bookings:', error);
        return;
      }

      setBookings(data || []);
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
    }
  };

  const handleSlotClick = (slotId: string) => {
    if (selectedSlot === slotId) {
      setSelectedSlot(null);
      setBookings([]);
    } else {
      setSelectedSlot(slotId);
      fetchBookings(slotId);
    }
  };

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('adminToken');

      // datetime-local の値を日本時間（+09:00）として明示的に変換
      const startsAtWithTimezone = startsAt + ':00+09:00';

      const response = await fetch('/api/slots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          starts_at: startsAtWithTimezone,
          capacity: 5
        })
      });

      if (response.ok) {
        setStartsAt('');
        fetchSlots();
      } else {
        const data = await response.json();
        setError(data.error || '日程枠の作成に失敗しました');
      }
    } catch (err) {
      setError('エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCalendar = async (bookingId: string) => {
    if (!confirm('このユーザーにカレンダー招待を再送しますか？')) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/bookings/${bookingId}/resend-calendar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        alert('カレンダー招待を再送しました。\n\nイベントID: ' + result.event_id);
        // 予約一覧を再取得
        if (selectedSlot) {
          fetchBookings(selectedSlot);
        }
      } else {
        const error = await response.json();
        alert('カレンダー招待の再送に失敗しました。\n\nエラー: ' + error.error + '\n\n詳細: ' + (error.error_details || ''));
      }
    } catch (err) {
      console.error('Failed to resend calendar:', err);
      alert('エラーが発生しました');
    }
  };

  const handleExportCSV = async (slotId?: string) => {
    try {
      const token = localStorage.getItem('adminToken');
      const url = slotId
        ? `/api/bookings/export?slot_id=${slotId}`
        : '/api/bookings/export';

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;

        // Content-Dispositionヘッダーからファイル名を取得
        const contentDisposition = response.headers.get('Content-Disposition');
        const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
        const filename = filenameMatch ? filenameMatch[1] : 'bookings.csv';

        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);
      }
    } catch (err) {
      console.error('Export failed:', err);
      alert('CSVエクスポートに失敗しました');
    }
  };

  // 未認証の場合はログインフォームを表示
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow">
          <h1 className="text-2xl font-bold mb-6">管理画面ログイン</h1>
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                管理者トークン
              </label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
            >
              ログイン
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">管理画面</h1>
          <div className="flex gap-4">
            <button
              onClick={() => handleExportCSV()}
              className="text-sm bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
            >
              全予約をCSVエクスポート
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('adminToken');
                setIsAuthenticated(false);
              }}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              ログアウト
            </button>
          </div>
        </div>

        {/* 日程枠作成フォーム */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-semibold mb-4">新規日程枠作成</h2>
          <form onSubmit={handleCreateSlot} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                開始日時
              </label>
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                終了時刻は自動的に+1時間、定員は5名固定です
              </p>
            </div>
            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? '作成中...' : '日程枠を作成'}
            </button>
          </form>
        </div>

        {/* 日程枠一覧 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">日程枠一覧（クリックで予約者表示）</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    日時
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    定員
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    予約数
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    残席
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    状態
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {slots.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      日程枠がありません
                    </td>
                  </tr>
                ) : (
                  slots.map((slot) => (
                    <>
                      <tr
                        key={slot.id}
                        className={`cursor-pointer hover:bg-gray-50 ${
                          selectedSlot === slot.id ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => handleSlotClick(slot.id)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          {new Date(slot.starts_at).toLocaleString('ja-JP', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: 'Asia/Tokyo'
                          })}
                          {' - '}
                          {slot.ends_at && new Date(slot.ends_at).toLocaleString('ja-JP', {
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: 'Asia/Tokyo'
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {slot.capacity}名
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {slot.booked_count}名
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {slot.capacity - slot.booked_count}名
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            slot.status === 'open'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {slot.status === 'open' ? '受付中' : '満席'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExportCSV(slot.id);
                            }}
                            className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                          >
                            CSV
                          </button>
                        </td>
                      </tr>
                      {/* 予約者一覧（展開時） */}
                      {selectedSlot === slot.id && (
                        <tr>
                          <td colSpan={6} className="px-6 py-4 bg-gray-50">
                            <div className="pl-8">
                              <h3 className="font-semibold mb-3">予約者一覧 ({bookings.length}名)</h3>
                              {bookings.length === 0 ? (
                                <p className="text-gray-500 text-sm">予約者はいません</p>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-100">
                                      <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                                          名前
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                                          メールアドレス
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                                          講師名
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                                          ジャンル
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                                          事前資料
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                                          カレンダー
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                                          操作
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                      {bookings.map((booking) => (
                                        <tr key={booking.id}>
                                          <td className="px-4 py-2 text-sm">
                                            {booking.name}
                                          </td>
                                          <td className="px-4 py-2 text-sm">
                                            <a
                                              href={`mailto:${booking.email}`}
                                              className="text-blue-600 hover:text-blue-800"
                                            >
                                              {booking.email}
                                            </a>
                                          </td>
                                          <td className="px-4 py-2 text-sm">
                                            {booking.coach_name}
                                          </td>
                                          <td className="px-4 py-2 text-sm">
                                            {booking.genre}
                                          </td>
                                          <td className="px-4 py-2 text-sm">
                                            {booking.prework_url ? (
                                              <div className="flex items-center gap-2">
                                                <a
                                                  href={booking.prework_url}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="text-blue-600 hover:text-blue-800 hover:underline"
                                                  title={booking.prework_url}
                                                >
                                                  開く →
                                                </a>
                                                <button
                                                  onClick={async () => {
                                                    try {
                                                      await navigator.clipboard.writeText(booking.prework_url!);
                                                      alert('URLをコピーしました');
                                                    } catch (err) {
                                                      console.error('Failed to copy:', err);
                                                      alert('URLのコピーに失敗しました');
                                                    }
                                                  }}
                                                  className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200"
                                                  title="URLをコピー"
                                                >
                                                  📋
                                                </button>
                                              </div>
                                            ) : (
                                              <span className="text-gray-400">なし</span>
                                            )}
                                          </td>
                                          <td className="px-4 py-2 text-sm">
                                            <span className={`px-2 py-1 text-xs rounded ${
                                              booking.calendar_status === 'created'
                                                ? 'bg-green-100 text-green-800'
                                                : booking.calendar_status === 'failed'
                                                ? 'bg-red-100 text-red-800'
                                                : 'bg-gray-100 text-gray-800'
                                            }`}>
                                              {booking.calendar_status === 'created' ? '連携済' :
                                               booking.calendar_status === 'failed' ? '失敗' : '無効'}
                                            </span>
                                          </td>
                                          <td className="px-4 py-2 text-sm">
                                            <button
                                              onClick={() => handleResendCalendar(booking.id)}
                                              className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                                              title="カレンダー招待を再送"
                                            >
                                              再送
                                            </button>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
