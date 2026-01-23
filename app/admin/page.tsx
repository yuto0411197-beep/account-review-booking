'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Slot } from '@/lib/types';

export default function AdminPage() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [startsAt, setStartsAt] = useState('');
  const [capacity, setCapacity] = useState(5);
  const [durationHours, setDurationHours] = useState(1);
  const [token, setToken] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [defaultZoomUrl, setDefaultZoomUrl] = useState('');
  const [isEditingZoomUrl, setIsEditingZoomUrl] = useState(false);
  const [tempZoomUrl, setTempZoomUrl] = useState('');

  useEffect(() => {
    const storedToken = localStorage.getItem('adminToken');
    if (storedToken) {
      setIsAuthenticated(true);
      fetchSlots();
    }
    // デフォルトZoom URLを読み込み
    const storedZoomUrl = localStorage.getItem('defaultZoomUrl');
    if (storedZoomUrl) {
      setDefaultZoomUrl(storedZoomUrl);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('adminToken', token);
    setIsAuthenticated(true);
    fetchSlots();
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setIsAuthenticated(false);
    setSlots([]);
    setToken('');
  };

  const handleSaveDefaultZoomUrl = () => {
    localStorage.setItem('defaultZoomUrl', tempZoomUrl);
    setDefaultZoomUrl(tempZoomUrl);
    setIsEditingZoomUrl(false);
    setSuccessMessage('デフォルトZoom URLを保存しました');
  };

  const handleApplyZoomUrlToAll = async () => {
    if (!defaultZoomUrl) {
      setError('先にデフォルトZoom URLを設定してください');
      return;
    }

    if (!confirm('全ての日程枠にこのZoom URLを適用しますか？')) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('adminToken');
      let successCount = 0;

      for (const slot of slots) {
        const response = await fetch(`/api/slots/${slot.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            zoom_url: defaultZoomUrl
          })
        });

        if (response.ok) {
          successCount++;
        }
      }

      setSuccessMessage(`${successCount}件の日程枠にZoom URLを適用しました`);
      fetchSlots();
    } catch (err) {
      setError('Zoom URLの適用中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
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

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const token = localStorage.getItem('adminToken');
      const startsAtWithTimezone = startsAt + ':00+09:00';

      const response = await fetch('/api/slots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          starts_at: startsAtWithTimezone,
          capacity: capacity,
          duration_hours: durationHours,
          zoom_url: defaultZoomUrl || null
        })
      });

      if (response.ok) {
        const durationDisplay = durationHours === 0.5 ? '30分' : durationHours % 1 === 0 ? `${durationHours}時間` : `${Math.floor(durationHours)}時間30分`;
        setSuccessMessage(`${durationDisplay}・定員${capacity}名の日程枠を作成しました` + (defaultZoomUrl ? '（Zoom URL自動設定）' : ''));
        setStartsAt('');
        setCapacity(5);
        setDurationHours(1);
        fetchSlots();
      } else {
        const data = await response.json();
        setError(data.error || '日程枠の作成に失敗しました');
      }
    } catch (err) {
      setError('日程枠の作成中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSlot = async (slotId: string, hasBookings: boolean) => {
    const message = hasBookings
      ? 'この日程枠を削除してもよろしいですか？\n※この日程枠の予約もすべて削除されます'
      : 'この日程枠を削除してもよろしいですか？';

    if (!confirm(message)) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/slots/${slotId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage('日程枠を削除しました');
        fetchSlots();
      } else {
        setError(data.error || '日程枠の削除に失敗しました');
      }
    } catch (err) {
      setError('日程枠の削除中にエラーが発生しました');
    }
  };

  const handleUpdateZoomUrl = async (slotId: string, currentZoomUrl: string | null) => {
    const newZoomUrl = prompt('Zoom URLを入力してください', currentZoomUrl || '');
    if (newZoomUrl === null) return; // キャンセル

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/slots/${slotId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          zoom_url: newZoomUrl || null
        })
      });

      if (response.ok) {
        setSuccessMessage('Zoom URLを更新しました');
        fetchSlots();
      } else {
        const data = await response.json();
        setError(data.error || 'Zoom URLの更新に失敗しました');
      }
    } catch (err) {
      setError('Zoom URLの更新中にエラーが発生しました');
    }
  };

  const handleUpdateCapacity = async (slotId: string, currentCapacity: number, bookedCount: number) => {
    const newCapacityStr = prompt(`定員を入力してください（現在の予約数: ${bookedCount}名）`, String(currentCapacity));
    if (newCapacityStr === null) return; // キャンセル

    const newCapacity = parseInt(newCapacityStr);
    if (isNaN(newCapacity) || newCapacity < 1) {
      setError('定員は1以上の数字を入力してください');
      return;
    }

    if (newCapacity < bookedCount) {
      setError(`既に${bookedCount}名の予約があるため、定員を${bookedCount}名未満にはできません`);
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/slots/${slotId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          capacity: newCapacity
        })
      });

      if (response.ok) {
        setSuccessMessage(`定員を${newCapacity}名に更新しました`);
        fetchSlots();
      } else {
        const data = await response.json();
        setError(data.error || '定員の更新に失敗しました');
      }
    } catch (err) {
      setError('定員の更新中にエラーが発生しました');
    }
  };

  const formatDurationHours = (hours: number) => {
    if (hours === 0.5) {
      return '30分';
    } else if (hours % 1 === 0) {
      return `${hours}時間`;
    } else {
      return `${Math.floor(hours)}時間30分`;
    }
  };

  const handleUpdateDurationHours = async (slotId: string, currentDurationHours: number) => {
    const currentDisplay = formatDurationHours(currentDurationHours);
    const newDurationStr = prompt(
      `講義時間を入力してください（0.5〜10、30分単位）\n例: 1, 1.5, 2, 2.5 など\n現在: ${currentDisplay}`,
      String(currentDurationHours)
    );
    if (newDurationStr === null) return; // キャンセル

    const newDuration = parseFloat(newDurationStr);
    if (isNaN(newDuration) || newDuration < 0.5 || newDuration > 10 || (newDuration * 2) % 1 !== 0) {
      setError('講義時間は0.5〜10時間の範囲で、30分単位（0.5刻み）で入力してください');
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/slots/${slotId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          duration_hours: newDuration
        })
      });

      if (response.ok) {
        setSuccessMessage(`講義時間を${formatDurationHours(newDuration)}に更新しました`);
        fetchSlots();
      } else {
        const data = await response.json();
        setError(data.error || '講義時間の更新に失敗しました');
      }
    } catch (err) {
      setError('講義時間の更新中にエラーが発生しました');
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Tokyo'
    });
  };

  // 未認証の場合はログインフォームを表示
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">管理者ログイン</h1>
              <p className="text-gray-600">アカウント添削会 予約管理システム</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  管理者トークン
                </label>
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  required
                  placeholder="トークンを入力してください"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl"
              >
                ログイン
              </button>
            </form>
            <div className="mt-6 text-center">
              <Link
                href="/"
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                ← トップページに戻る
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 認証済みの場合は管理画面を表示
  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                管理者ダッシュボード
              </h1>
              <p className="text-gray-600">日程枠の作成・管理ができます</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                トップページ
              </Link>
              <Link
                href="/admin/bookings"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                予約管理
              </Link>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-red-300 rounded-lg text-red-600 hover:bg-red-50 transition-colors shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                ログアウト
              </button>
            </div>
          </div>
        </div>

        {/* アラート表示 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-red-700 font-medium">{error}</span>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded-lg">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-green-700 font-medium">{successMessage}</span>
            </div>
          </div>
        )}

        {/* デフォルトZoom URL設定 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-8 border border-gray-100">
          <h2 className="text-2xl font-bold mb-6 text-gray-900 flex items-center gap-2">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            デフォルトZoom URL設定
          </h2>
          <p className="text-gray-600 mb-4">
            ここで設定したURLは、新しく作成する全ての日程枠に自動的に適用されます。
          </p>

          {isEditingZoomUrl ? (
            <div className="space-y-4">
              <input
                type="url"
                value={tempZoomUrl}
                onChange={(e) => setTempZoomUrl(e.target.value)}
                placeholder="https://zoom.us/j/..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
              />
              <div className="flex gap-3">
                <button
                  onClick={handleSaveDefaultZoomUrl}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all"
                >
                  保存
                </button>
                <button
                  onClick={() => {
                    setIsEditingZoomUrl(false);
                    setTempZoomUrl(defaultZoomUrl);
                  }}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all"
                >
                  キャンセル
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {defaultZoomUrl ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800 font-medium mb-1">現在のデフォルトURL:</p>
                  <a
                    href={defaultZoomUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 hover:text-green-700 underline break-all"
                  >
                    {defaultZoomUrl}
                  </a>
                </div>
              ) : (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-gray-500">デフォルトZoom URLが設定されていません</p>
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    setTempZoomUrl(defaultZoomUrl);
                    setIsEditingZoomUrl(true);
                  }}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all"
                >
                  {defaultZoomUrl ? 'URLを変更' : 'URLを設定'}
                </button>
                {defaultZoomUrl && slots.length > 0 && (
                  <button
                    onClick={handleApplyZoomUrlToAll}
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-all"
                  >
                    {loading ? '適用中...' : '全ての日程枠に適用'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 日程枠作成フォーム */}
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-8 border border-gray-100">
          <h2 className="text-2xl font-bold mb-6 text-gray-900 flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            新しい日程枠を作成
          </h2>
          {defaultZoomUrl && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
              Zoom URL「{defaultZoomUrl.substring(0, 40)}...」が自動的に設定されます
            </div>
          )}
          <form onSubmit={handleCreateSlot} className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  開始日時 <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  required
                />
                <p className="mt-1 text-sm text-gray-500">日本時間（JST）で入力してください</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  講義時間 <span className="text-red-500">*</span>
                </label>
                <select
                  value={durationHours}
                  onChange={(e) => setDurationHours(parseFloat(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  required
                >
                  {[0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10].map((hours) => (
                    <option key={hours} value={hours}>
                      {hours === 0.5 ? '30分' : hours % 1 === 0 ? `${hours}時間` : `${Math.floor(hours)}時間30分`}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-sm text-gray-500">講義の長さを選択してください</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  定員 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={capacity}
                  onChange={(e) => setCapacity(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  required
                />
                <p className="mt-1 text-sm text-gray-500">1〜100名まで設定可能</p>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
              >
                {loading ? '作成中...' : '日程枠を作成'}
              </button>
            </div>
          </form>
        </div>

        {/* 日程枠一覧 */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="px-6 md:px-8 py-6 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              日程枠一覧
              <span className="ml-auto text-sm font-normal text-gray-600">
                {slots.length}件
              </span>
            </h2>
          </div>
          <div className="overflow-x-auto">
            {slots.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-lg">日程枠がまだありません</p>
                <p className="text-sm mt-2">上のフォームから新しい日程枠を作成してください</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">日時</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">講義時間</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">定員</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">予約数</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Zoom URL</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">ステータス</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {slots.map((slot) => (
                    <tr key={slot.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatDateTime(slot.starts_at)}
                        </div>
                        {slot.ends_at && (
                          <div className="text-sm text-gray-500">
                            ～ {new Date(slot.ends_at).toLocaleTimeString('ja-JP', {
                              hour: '2-digit',
                              minute: '2-digit',
                              timeZone: 'Asia/Tokyo'
                            })}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          {formatDurationHours(slot.duration_hours || 1)}
                          <button
                            onClick={() => handleUpdateDurationHours(slot.id, slot.duration_hours || 1)}
                            className="text-gray-400 hover:text-gray-600"
                            title="講義時間を変更"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          {slot.capacity}名
                          <button
                            onClick={() => handleUpdateCapacity(slot.id, slot.capacity, slot.booked_count)}
                            className="text-gray-400 hover:text-gray-600"
                            title="定員を変更"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                          slot.booked_count >= slot.capacity
                            ? 'bg-red-100 text-red-800'
                            : slot.booked_count > 0
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {slot.booked_count}名
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {slot.zoom_url ? (
                          <div className="flex items-center gap-2">
                            <a
                              href={slot.zoom_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-sm truncate max-w-[200px] inline-block"
                              title={slot.zoom_url}
                            >
                              {slot.zoom_url}
                            </a>
                            <button
                              onClick={() => handleUpdateZoomUrl(slot.id, slot.zoom_url)}
                              className="text-gray-400 hover:text-gray-600"
                              title="編集"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleUpdateZoomUrl(slot.id, null)}
                            className="text-sm text-gray-400 hover:text-blue-600 transition-colors"
                          >
                            + URLを追加
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                          slot.status === 'open'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {slot.status === 'open' ? '受付中' : '受付終了'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <button
                          onClick={() => handleDeleteSlot(slot.id, slot.booked_count > 0)}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium transition-colors bg-red-50 text-red-600 hover:bg-red-100"
                          title={slot.booked_count > 0 ? `予約${slot.booked_count}件と一緒に削除` : '削除'}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          削除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
