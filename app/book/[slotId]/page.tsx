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
      <div className="min-h-screen p-8 bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (error || !slot) {
    return (
      <div className="min-h-screen p-8 bg-gray-50">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 p-6 rounded-lg">
            <h2 className="text-xl font-semibold text-red-800 mb-2">エラー</h2>
            <p className="text-red-700">{error || '日程枠が見つかりません'}</p>
            <Link
              href="/"
              className="inline-block mt-4 text-blue-600 hover:text-blue-800"
            >
              ← 日程一覧に戻る
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (slot.status === 'closed') {
    return (
      <div className="min-h-screen p-8 bg-gray-50">
        <div className="max-w-2xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg">
            <h2 className="text-xl font-semibold text-yellow-800 mb-2">満席です</h2>
            <p className="text-yellow-700">この日程枠は既に満席です。</p>
            <Link
              href="/"
              className="inline-block mt-4 text-blue-600 hover:text-blue-800"
            >
              ← 日程一覧に戻る
            </Link>
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
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <main className="max-w-2xl mx-auto">
        <Link
          href="/"
          className="inline-block mb-6 text-blue-600 hover:text-blue-800"
        >
          ← 日程一覧に戻る
        </Link>

        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h1 className="text-2xl font-bold mb-4">予約フォーム</h1>

          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
            <h2 className="font-semibold text-blue-900 mb-2">選択した日程</h2>
            <div className="text-blue-800">
              <p className="font-medium">{formatDateTime(slot.starts_at)} - {slot.ends_at && formatDateTime(slot.ends_at)}</p>
              <p className="text-sm mt-1">残席: {slot.capacity - slot.booked_count}名</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                お名前 <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                メールアドレス <span className="text-red-600">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                講師名 <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                name="coach_name"
                value={formData.coach_name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                ジャンル <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                name="genre"
                value={formData.genre}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="例: ビジネス、エンタメ、教育など"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                事前課題URL（任意）
              </label>
              <input
                type="url"
                name="prework_url"
                value={formData.prework_url}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md ${
                  urlWarning && formData.prework_url
                    ? 'border-yellow-400 bg-yellow-50'
                    : 'border-gray-300'
                }`}
                placeholder="https://docs.google.com/spreadsheets/d/xxxxx/edit"
              />

              {/* URLガイダンス */}
              <div className="mt-2 text-xs space-y-1">
                <p className="text-gray-600">
                  📌 <strong>推奨:</strong> Googleスプレッドシート、Googleドキュメント、Notion
                </p>
                <p className="text-gray-600">
                  📝 <strong>共有設定:</strong> 「リンクを知っている全員」に設定してください
                </p>
                <details className="text-gray-500">
                  <summary className="cursor-pointer hover:text-gray-700">
                    📖 設定手順を見る
                  </summary>
                  <div className="mt-2 pl-4 space-y-1 border-l-2 border-gray-300">
                    <p><strong>Googleスプレッドシート/ドキュメント:</strong></p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>ファイルを開いて、右上の「共有」ボタンをクリック</li>
                      <li>「リンクを知っている全員」に変更</li>
                      <li>権限を「閲覧者」または「編集者」に設定</li>
                      <li>「リンクをコピー」をクリックしてURLを取得</li>
                    </ol>
                    <p className="mt-2"><strong>例:</strong></p>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                      https://docs.google.com/spreadsheets/d/1abc.../edit
                    </code>
                  </div>
                </details>
              </div>

              {/* URLの警告・エラーメッセージ */}
              {urlWarning && formData.prework_url && (
                <div className="mt-3 bg-yellow-50 border border-yellow-300 p-3 rounded-lg">
                  <p className="text-yellow-800 font-medium text-sm flex items-center">
                    ⚠️ {urlWarning}
                  </p>
                  {urlSuggestions.length > 0 && (
                    <div className="mt-2">
                      <p className="text-yellow-700 text-xs font-medium">対処法:</p>
                      <ul className="list-disc list-inside text-yellow-700 text-xs space-y-1 mt-1">
                        {urlSuggestions.map((suggestion, index) => (
                          <li key={index}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                <p className="text-red-800 font-medium">エラー</p>
                <p className="text-red-700 text-sm mt-1">{error}</p>
                {urlSuggestions.length > 0 && (
                  <div className="mt-2">
                    <p className="text-red-700 text-xs font-medium">対処法:</p>
                    <ul className="list-disc list-inside text-red-700 text-xs space-y-1 mt-1">
                      {urlSuggestions.map((suggestion, index) => (
                        <li key={index}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              {submitting ? '予約中...' : '予約を確定する'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
