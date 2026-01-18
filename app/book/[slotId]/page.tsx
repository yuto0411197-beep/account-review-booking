'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Slot } from '@/lib/types';
import Link from 'next/link';
import { validatePreworkUrl, normalizePreworkUrl, getUrlTypeDescription } from '@/lib/url-validation';

export default function BookingPage() {
  const params = useParams();
  const router = useRouter();
  const slotId = params.slotId as string;

  const [slot, setSlot] = useState<Slot | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [urlWarning, setUrlWarning] = useState('');
  const [urlSuggestions, setUrlSuggestions] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    coach_name: '',
    genre: '',
    prework_url: ''
  });

  useEffect(() => {
    fetchSlot();
  }, [slotId]);

  const fetchSlot = async () => {
    try {
      const response = await fetch('/api/slots');
      if (response.ok) {
        const slots = await response.json();
        const foundSlot = slots.find((s: Slot) => s.id === slotId);
        if (foundSlot) {
          setSlot(foundSlot);
        } else {
          setError('日程枠が見つかりません');
        }
      }
    } catch (err) {
      setError('日程枠の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setUrlWarning('');
    setUrlSuggestions([]);

    // 事前資料URLのバリデーション
    const urlValidation = validatePreworkUrl(formData.prework_url);

    if (!urlValidation.valid) {
      setError(urlValidation.error || 'URLが無効です');
      if (urlValidation.suggestions) {
        setUrlSuggestions(urlValidation.suggestions);
      }
      setSubmitting(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // URLを正規化
    const normalizedUrl = normalizePreworkUrl(formData.prework_url);

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          slot_id: slotId,
          ...formData,
          prework_url: normalizedUrl,
        })
      });

      const data = await response.json();

      if (!response.ok) {
        // エラーレスポンスのハンドリング
        if (response.status === 400) {
          // バリデーションエラーまたは満席
          if (data.error?.includes('満席')) {
            setError('申し訳ございません。この日程枠は既に満席になりました。他の日程をお選びください。');
          } else if (data.error?.includes('既に予約済み')) {
            setError('このメールアドレスで既に予約されています。別のメールアドレスをご利用ください。');
          } else {
            setError(data.error || '入力内容を確認してください');
          }
        } else if (response.status === 500) {
          setError('サーバーエラーが発生しました。しばらく待ってから再度お試しください。');
        } else {
          setError(data.error || '予約に失敗しました');
        }
        setSubmitting(false);
        // エラー時はページトップにスクロール
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      // 予約成功 - 完了ページへ遷移
      router.push(`/book/success?bookingId=${data.id}`);
    } catch (err) {
      console.error('Booking submission error:', err);
      setError('ネットワークエラーが発生しました。インターネット接続を確認してから再度お試しください。');
      setSubmitting(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: value
    });

    // 事前資料URLのリアルタイムバリデーション
    if (name === 'prework_url' && value.trim() !== '') {
      const urlValidation = validatePreworkUrl(value);

      if (!urlValidation.valid) {
        setUrlWarning(urlValidation.error || '');
        setUrlSuggestions(urlValidation.suggestions || []);
      } else if (urlValidation.warning) {
        setUrlWarning(urlValidation.warning);
        setUrlSuggestions(urlValidation.suggestions || []);
      } else {
        setUrlWarning('');
        setUrlSuggestions([]);
      }
    } else if (name === 'prework_url' && value.trim() === '') {
      setUrlWarning('');
      setUrlSuggestions([]);
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

  if (error || !slot) {
    return (
      <div className="min-h-screen p-4 sm:p-8 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 border-l-4 border-red-500">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <h2 className="text-xl font-bold text-red-800 mb-2">エラー</h2>
                <p className="text-red-700">{error || '日程枠が見つかりません'}</p>
                <Link
                  href="/"
                  className="inline-flex items-center mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  日程一覧に戻る
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (slot.status === 'closed') {
    return (
      <div className="min-h-screen p-4 sm:p-8 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 border-l-4 border-yellow-500">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="ml-4">
                <h2 className="text-xl font-bold text-yellow-800 mb-2">満席です</h2>
                <p className="text-yellow-700">この日程枠は既に満席です。</p>
                <Link
                  href="/"
                  className="inline-flex items-center mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  日程一覧に戻る
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen p-4 sm:p-8 bg-gradient-to-br from-slate-50 to-blue-50">
      <main className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center mb-6 text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          日程一覧に戻る
        </Link>

        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg mb-6">
          <h1 className="text-3xl font-bold mb-6 text-gray-900 flex items-center">
            <svg className="w-8 h-8 mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            予約フォーム
          </h1>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 p-5 rounded-xl mb-8 shadow-sm">
            <h2 className="font-bold text-blue-900 mb-3 flex items-center text-lg">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              選択した日程
            </h2>
            <div className="text-blue-800">
              <p className="font-semibold text-lg">{formatDateTime(slot.starts_at)} - {slot.ends_at && formatDateTime(slot.ends_at)}</p>
              <p className="text-sm mt-2 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                残席: <strong className="ml-1">{slot.capacity - slot.booked_count}名</strong>
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                お名前 <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                メールアドレス <span className="text-red-600">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                講師名 <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                name="coach_name"
                value={formData.coach_name}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                ジャンル <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                name="genre"
                value={formData.genre}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
                placeholder="例: ビジネス、エンタメ、教育など"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                事前課題URL（任意）
              </label>
              <input
                type="url"
                name="prework_url"
                value={formData.prework_url}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-lg transition-all duration-200 shadow-sm ${
                  urlWarning && formData.prework_url
                    ? 'border-yellow-400 bg-yellow-50 focus:ring-2 focus:ring-yellow-500'
                    : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                }`}
                placeholder="https://docs.google.com/spreadsheets/d/xxxxx/edit"
              />

              {/* URLガイダンス */}
              <div className="mt-3 text-xs space-y-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="text-gray-700 flex items-start">
                  <span className="mr-2">📌</span>
                  <span><strong>推奨:</strong> Googleスプレッドシート、Googleドキュメント、Notion</span>
                </p>
                <p className="text-gray-700 flex items-start">
                  <span className="mr-2">📝</span>
                  <span><strong>共有設定:</strong> 「リンクを知っている全員」に設定してください</span>
                </p>
                <details className="text-gray-600">
                  <summary className="cursor-pointer hover:text-gray-800 font-medium flex items-center">
                    <span className="mr-2">📖</span>
                    設定手順を見る
                  </summary>
                  <div className="mt-3 pl-6 space-y-2 border-l-2 border-blue-300">
                    <p><strong>Googleスプレッドシート/ドキュメント:</strong></p>
                    <ol className="list-decimal list-inside space-y-1.5 text-gray-700">
                      <li>ファイルを開いて、右上の「共有」ボタンをクリック</li>
                      <li>「リンクを知っている全員」に変更</li>
                      <li>権限を「閲覧者」または「編集者」に設定</li>
                      <li>「リンクをコピー」をクリックしてURLを取得</li>
                    </ol>
                    <p className="mt-2"><strong>例:</strong></p>
                    <code className="text-xs bg-white px-3 py-1.5 rounded border border-gray-300 block">
                      https://docs.google.com/spreadsheets/d/1abc.../edit
                    </code>
                  </div>
                </details>
              </div>

              {/* URLの警告・エラーメッセージ */}
              {urlWarning && formData.prework_url && (
                <div className="mt-4 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg shadow-sm">
                  <div className="flex items-start">
                    <svg className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-yellow-800 font-semibold text-sm">{urlWarning}</p>
                      {urlSuggestions.length > 0 && (
                        <div className="mt-2">
                          <p className="text-yellow-700 text-xs font-semibold mb-1">対処法:</p>
                          <ul className="space-y-1">
                            {urlSuggestions.map((suggestion, index) => (
                              <li key={index} className="text-yellow-700 text-xs flex items-start">
                                <span className="mr-2">•</span>
                                <span>{suggestion}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg shadow-sm">
                <div className="flex items-start">
                  <svg className="h-5 w-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-red-800 font-bold">エラー</p>
                    <p className="text-red-700 text-sm mt-1">{error}</p>
                    {urlSuggestions.length > 0 && (
                      <div className="mt-2">
                        <p className="text-red-700 text-xs font-semibold mb-1">対処法:</p>
                        <ul className="space-y-1">
                          {urlSuggestions.map((suggestion, index) => (
                            <li key={index} className="text-red-700 text-xs flex items-start">
                              <span className="mr-2">•</span>
                              <span>{suggestion}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 px-6 rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 disabled:transform-none flex items-center justify-center"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  予約中...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  予約を確定する
                </>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
