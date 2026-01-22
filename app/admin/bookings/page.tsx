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
  const [successMessage, setSuccessMessage] = useState('');
  const [exporting, setExporting] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // 名簿チェック機能用のstate
  const [requiredCoaches, setRequiredCoaches] = useState<string[]>([]);
  const [missingCoaches, setMissingCoaches] = useState<string[]>([]);
  const [bookedCoaches, setBookedCoaches] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');

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

  // 名簿ファイルを読み込んで解析
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    const reader = new FileReader();

    reader.onload = (event) => {
      const content = event.target?.result as string;

      // ファイル内容をパース（CSV, TXT対応）
      const names = parseFileContent(content);
      setRequiredCoaches(names);

      // 現在の予約者と比較
      compareWithBookings(names);
    };

    reader.readAsText(file, 'UTF-8');
  };

  // ファイル内容をパースして名前リストを取得
  const parseFileContent = (content: string): string[] => {
    const lines = content.split(/\r?\n/);
    const names: string[] = [];

    for (const line of lines) {
      // カンマ区切りの場合は最初のカラムを名前として取得
      const parts = line.split(',');
      let name = parts[0].trim();

      // ダブルクォートを除去
      name = name.replace(/^["']|["']$/g, '');

      // 空行やヘッダー行（「名前」「講師名」など）をスキップ
      if (name && !['名前', '講師名', '氏名', 'name', 'coach_name', 'Name'].includes(name)) {
        names.push(name);
      }
    }

    return names;
  };

  // 予約者と名簿を比較
  const compareWithBookings = (requiredNames: string[]) => {
    // 全予約者の名前を収集（coach_name を使用）
    const allBookedNames: string[] = [];
    slots.forEach(slot => {
      slot.bookings?.forEach(booking => {
        // coach_nameまたはnameを追加
        if (booking.coach_name) {
          allBookedNames.push(booking.coach_name);
        }
        if (booking.name && booking.name !== booking.coach_name) {
          allBookedNames.push(booking.name);
        }
      });
    });

    setBookedCoaches(allBookedNames);

    // 名簿にあるが予約がない人を検出
    const missing = requiredNames.filter(requiredName => {
      // 部分一致でチェック（「【講師】〇〇」形式に対応）
      return !allBookedNames.some(bookedName =>
        bookedName.includes(requiredName) || requiredName.includes(bookedName)
      );
    });

    setMissingCoaches(missing);
    setShowComparison(true);
  };

  // 名簿をクリア
  const clearComparison = () => {
    setRequiredCoaches([]);
    setMissingCoaches([]);
    setBookedCoaches([]);
    setShowComparison(false);
    setUploadedFileName('');
  };

  const handleCancelBooking = async (bookingId: string, bookingName: string) => {
    const confirmed = confirm(
      `「${bookingName}」さんの予約をキャンセルしますか？\n\nこの操作は取り消せません。`
    );

    if (!confirmed) return;

    setCancellingId(bookingId);
    setError('');
    setSuccessMessage('');

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '予約のキャンセルに失敗しました');
      }

      setSuccessMessage(`「${bookingName}」さんの予約をキャンセルしました`);
      // 予約一覧を再取得
      fetchBookings();
    } catch (err) {
      setError(err instanceof Error ? err.message : '予約のキャンセルに失敗しました');
    } finally {
      setCancellingId(null);
    }
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

        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            {successMessage}
          </div>
        )}

        {/* 名簿チェック機能 */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            未予約者チェック
          </h2>
          <p className="text-gray-600 text-sm mb-4">
            参加必須の講師名簿（CSV/TXT）をアップロードすると、まだ予約していない人を一覧で確認できます。
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 cursor-pointer transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              名簿ファイルをアップロード
              <input
                type="file"
                accept=".csv,.txt,.text"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {uploadedFileName && (
              <span className="text-sm text-gray-600">
                📄 {uploadedFileName}
              </span>
            )}

            {showComparison && (
              <button
                onClick={clearComparison}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                クリア
              </button>
            )}
          </div>

          <p className="text-xs text-gray-400 mt-2">
            ※ 対応形式: CSV（1列目が名前）、TXT（1行に1名）
          </p>

          {/* 比較結果 */}
          {showComparison && (
            <div className="mt-6 space-y-4">
              {/* サマリー */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900">{requiredCoaches.length}</div>
                  <div className="text-sm text-gray-600">名簿の人数</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{requiredCoaches.length - missingCoaches.length}</div>
                  <div className="text-sm text-gray-600">予約済み</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">{missingCoaches.length}</div>
                  <div className="text-sm text-gray-600">未予約</div>
                </div>
              </div>

              {/* 未予約者リスト */}
              {missingCoaches.length > 0 ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    まだ予約していない人 ({missingCoaches.length}名)
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {missingCoaches.map((name, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 bg-white border border-red-300 rounded-full text-sm text-red-700"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-red-600 mt-3">
                    ※ 上記の方々に予約を促してください
                  </p>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-800 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    全員が予約済みです！
                  </h3>
                </div>
              )}

              {/* ChatGPT連携ヒント */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  AIで名簿を作成するヒント
                </h3>
                <p className="text-sm text-blue-700">
                  ChatGPTに「以下の名簿をCSV形式（1行に1名）に変換してください」と依頼すると、
                  様々な形式の名簿をこのシステムで読み込める形式に変換できます。
                </p>
              </div>
            </div>
          )}
        </div>

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
                            <div className="mt-3 flex items-center justify-between">
                              <span className="text-sm text-gray-400">
                                予約日時: {formatDateTime(booking.created_at)}
                              </span>
                              <button
                                onClick={() => handleCancelBooking(booking.id, booking.coach_name || booking.name)}
                                disabled={cancellingId === booking.id}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {cancellingId === booking.id ? (
                                  <>
                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    キャンセル中...
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    予約キャンセル
                                  </>
                                )}
                              </button>
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
