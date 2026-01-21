'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Slot } from '@/lib/types';
import Link from 'next/link';
import { validatePreworkUrl, normalizePreworkUrl } from '@/lib/url-validation';

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
        if (response.status === 400) {
          if (data.error?.includes('満席')) {
            setError('申し訳ございません。この日程枠は既に満席になりました。');
          } else if (data.error?.includes('既に予約済み')) {
            setError('このメールアドレスで既に予約されています。');
          } else {
            setError(data.error || '入力内容を確認してください');
          }
        } else {
          setError('予約に失敗しました。もう一度お試しください。');
        }
        setSubmitting(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      router.push(`/book/success?bookingId=${data.id}`);
    } catch (err) {
      setError('ネットワークエラーが発生しました。');
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#d2d2d7] border-t-[#1d1d1f] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error && !slot) {
    return (
      <div className="min-h-screen bg-white">
        <header className="sticky top-0 z-50 bg-[#f5f5f7] border-b border-[#d2d2d7]/50">
          <div className="max-w-[680px] mx-auto px-6">
            <div className="flex items-center h-11">
              <Link href="/" className="text-[12px] text-[#6e6e73] hover:text-[#1d1d1f] transition-colors">
                ← 戻る
              </Link>
            </div>
          </div>
        </header>
        <main className="max-w-[680px] mx-auto px-6 py-20 text-center">
          <p className="text-[17px] text-[#86868b]">{error}</p>
        </main>
      </div>
    );
  }

  if (!slot || slot.status === 'closed') {
    return (
      <div className="min-h-screen bg-white">
        <header className="sticky top-0 z-50 bg-[#f5f5f7] border-b border-[#d2d2d7]/50">
          <div className="max-w-[680px] mx-auto px-6">
            <div className="flex items-center h-11">
              <Link href="/" className="text-[12px] text-[#6e6e73] hover:text-[#1d1d1f] transition-colors">
                ← 戻る
              </Link>
            </div>
          </div>
        </header>
        <main className="max-w-[680px] mx-auto px-6 py-20 text-center">
          <p className="text-[17px] text-[#86868b]">この日程は満席です。</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      {/* ヘッダー - Apple Store風ダークナビゲーション */}
      <header className="sticky top-0 z-50 bg-[#1d1d1f]">
        <div className="max-w-[680px] mx-auto px-6">
          <div className="flex items-center h-11">
            <Link href="/" className="text-[12px] text-[#f5f5f7]/80 hover:text-white transition-colors">
              ← 戻る
            </Link>
          </div>
        </div>
      </header>

      {/* ヒーローセクション - 白背景 */}
      <section className="bg-white pt-16 pb-12 text-center">
        <div className="max-w-[680px] mx-auto px-6">
          <h1 className="text-[40px] sm:text-[48px] font-semibold text-[#1d1d1f] tracking-[-0.003em] leading-[1.07] mb-3">
            予約フォーム
          </h1>
          <p className="text-[17px] sm:text-[19px] text-[#86868b]">
            必要事項を入力してください
          </p>
        </div>
      </section>

      <main className="max-w-[680px] mx-auto px-6 py-10">
        {/* 選択日程 - サンドベージュ */}
        <div className="bg-[#f0e6d8] rounded-[20px] p-8 mb-8">
          <p className="text-[11px] sm:text-[12px] text-[#6e6e73] uppercase tracking-[0.08em] font-medium mb-3">
            Selected Date
          </p>
          <div className="text-[32px] sm:text-[40px] font-semibold text-[#1d1d1f] tracking-[-0.02em] leading-tight mb-2">
            {formatDate(slot.starts_at)}
          </div>
          <div className="text-[15px] sm:text-[17px] text-[#1d1d1f]">
            {formatTime(slot.starts_at)} – {slot.ends_at && formatTime(slot.ends_at)}
          </div>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="bg-[#fff5f5] border border-[#fecaca] rounded-[12px] p-4 mb-6">
            <p className="text-[15px] text-[#dc2626]">{error}</p>
            {urlSuggestions.length > 0 && (
              <ul className="mt-2 text-[13px] text-[#86868b]">
                {urlSuggestions.map((s, i) => <li key={i}>・{s}</li>)}
              </ul>
            )}
          </div>
        )}

        {/* フォーム */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-[18px] p-8 space-y-6">
            {/* お名前 */}
            <div>
              <label className="block text-[13px] font-semibold text-[#1d1d1f] mb-2">
                お名前 <span className="text-[#ff3b30]">*</span>
              </label>
              <input
                type="text"
                name="coach_name"
                value={formData.coach_name}
                onChange={handleChange}
                placeholder="例: 【講師】〇〇"
                className="w-full px-4 py-3.5 bg-[#f5f5f7] border-0 rounded-[12px] text-[17px] text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-all"
                required
              />
            </div>

            {/* ジャンル */}
            <div>
              <label className="block text-[13px] font-semibold text-[#1d1d1f] mb-2">
                ジャンル <span className="text-[#ff3b30]">*</span>
              </label>
              <input
                type="text"
                name="genre"
                value={formData.genre}
                onChange={handleChange}
                placeholder="例: ビジネス、エンタメ、教育など"
                className="w-full px-4 py-3.5 bg-[#f5f5f7] border-0 rounded-[12px] text-[17px] text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-all"
                required
              />
            </div>

            {/* 事前提出物URL */}
            <div>
              <label className="block text-[13px] font-semibold text-[#1d1d1f] mb-2">
                事前提出物URL（添削をスムーズに進めるため）
              </label>
              <input
                type="url"
                name="prework_url"
                value={formData.prework_url}
                onChange={handleChange}
                placeholder="https://docs.google.com/..."
                className={`w-full px-4 py-3.5 bg-[#f5f5f7] border-0 rounded-[12px] text-[17px] text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:ring-2 transition-all ${
                  urlWarning ? 'ring-2 ring-[#ff9500]' : 'focus:ring-[#0071e3]'
                }`}
              />
              <p className="mt-3 text-[12px] text-[#86868b]">
                推奨: Googleスプレッドシート、Googleドキュメント、Notion
              </p>
              {urlWarning && formData.prework_url && (
                <p className="mt-2 text-[13px] text-[#ff9500]">{urlWarning}</p>
              )}
            </div>
          </div>

          {/* 送信ボタン */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 rounded-[980px] text-[17px] font-medium bg-[#0071e3] text-white hover:bg-[#0077ed] disabled:bg-[#d2d2d7] disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                予約中...
              </>
            ) : (
              '予約を確定する'
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
