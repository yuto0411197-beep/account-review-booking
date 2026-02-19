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
        // 過去の日程を非表示にする
        const now = new Date();
        const futureSlots = data.filter((slot: Slot) => new Date(slot.starts_at) > now);
        setSlots(futureSlots);
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
      month: 'numeric',
      day: 'numeric',
      timeZone: 'Asia/Tokyo'
    });
  };

  const formatWeekday = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
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

  // カード背景色 - サンドベージュで統一
  const cardBgColor = 'bg-[#f0e6d8]';

  return (
    <div className="min-h-screen bg-white">
      {/* ヘッダー - ライトグレー */}
      <header className="sticky top-0 z-50 bg-[#f5f5f7] border-b border-[#d2d2d7]/50">
        <div className="max-w-[980px] mx-auto px-6">
          <div className="flex justify-between items-center h-11">
            <span className="text-[#1d1d1f] font-medium text-[12px] tracking-[-0.01em]">
              アカウント添削会
            </span>
            <Link
              href="/admin"
              className="text-[12px] text-[#6e6e73] hover:text-[#1d1d1f] transition-colors"
            >
              管理画面
            </Link>
          </div>
        </div>
      </header>

      {/* ヒーローセクション */}
      <section className="bg-white pt-16 sm:pt-20 pb-10 sm:pb-14 text-center">
        <div className="max-w-[980px] mx-auto px-6">
          <h1 className="text-[40px] sm:text-[56px] font-semibold text-[#1d1d1f] tracking-[-0.015em] leading-[1.05] mb-3 sm:mb-4">
            予約する
          </h1>
          <p className="text-[17px] sm:text-[21px] text-[#6e6e73] font-normal leading-[1.4] max-w-[500px] mx-auto">
            ご希望の日程を選んで、<br className="sm:hidden" />予約を完了してください。
          </p>
        </div>
      </section>

      {/* 日程カードセクション */}
      <section className="bg-[#f5f5f7] py-14 sm:py-20">
        <div className="max-w-[1000px] mx-auto px-6">
          <div className="text-center mb-10 sm:mb-14">
            <p className="text-[12px] sm:text-[13px] text-[#6e6e73] uppercase tracking-[0.06em] mb-2">
              SCHEDULE
            </p>
            <h2 className="text-[28px] sm:text-[40px] font-semibold text-[#1d1d1f] tracking-[-0.015em] leading-[1.1]">
              予約可能な日程
            </h2>
          </div>

          {loading ? (
            <div className="text-center py-20">
              <div className="inline-block w-8 h-8 border-2 border-[#d2d2d7] border-t-[#1d1d1f] rounded-full animate-spin"></div>
            </div>
          ) : slots.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-[17px] text-[#6e6e73]">
                現在予約可能な日程はありません。
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {slots.map((slot) => {
                const remainingSeats = slot.capacity - slot.booked_count;
                const isFull = slot.status === 'closed';

                return (
                  <div
                    key={slot.id}
                    className={`
                      group relative rounded-[20px] overflow-hidden
                      transition-all duration-500 ease-out
                      ${isFull
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(0,0,0,0.12)] cursor-pointer'
                      }
                    `}
                    onClick={() => !isFull && handleBooking(slot.id)}
                  >
                    {/* カード全体 - サンドベージュ */}
                    <div className={`${cardBgColor} p-7 sm:p-8 min-h-[280px] flex flex-col`}>
                      {/* カテゴリラベル */}
                      <p className="text-[11px] sm:text-[12px] text-[#6e6e73] uppercase tracking-[0.08em] font-medium mb-3">
                        Available
                      </p>

                      {/* 日付 - 大きく目立つように */}
                      <div className="mb-4">
                        <span className="text-[42px] sm:text-[52px] font-semibold text-[#1d1d1f] tracking-[-0.02em] leading-none">
                          {formatDate(slot.starts_at)}
                        </span>
                        <span className="text-[18px] sm:text-[21px] text-[#1d1d1f] ml-2 font-medium">
                          ({formatWeekday(slot.starts_at)})
                        </span>
                      </div>

                      {/* 時間 */}
                      <p className="text-[15px] sm:text-[17px] text-[#1d1d1f] mb-2 font-normal">
                        {formatTime(slot.starts_at)} – {slot.ends_at && formatTime(slot.ends_at)}
                      </p>

                      {/* 残席 */}
                      <p className="text-[14px] sm:text-[15px] text-[#6e6e73] mb-auto">
                        {isFull ? '満席' : `残り ${remainingSeats} 席`}
                      </p>

                      {/* ボタン */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          !isFull && handleBooking(slot.id);
                        }}
                        disabled={isFull}
                        className={`
                          mt-6 w-full py-3 sm:py-3.5 rounded-[980px] text-[14px] sm:text-[15px] font-medium
                          transition-all duration-200
                          ${isFull
                            ? 'bg-[#d2d2d7] text-[#86868b] cursor-not-allowed'
                            : 'bg-[#1d1d1f] text-white hover:bg-[#000] cursor-pointer'
                          }
                        `}
                      >
                        {isFull ? '満席です' : '予約する'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 予約の流れセクション */}
      <section className="bg-white py-16 sm:py-24">
        <div className="max-w-[800px] mx-auto px-6">
          <div className="text-center mb-12 sm:mb-16">
            <p className="text-[12px] sm:text-[13px] text-[#6e6e73] uppercase tracking-[0.06em] mb-2">
              HOW IT WORKS
            </p>
            <h2 className="text-[28px] sm:text-[40px] font-semibold text-[#1d1d1f] tracking-[-0.015em] leading-[1.1]">
              予約の流れ
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 sm:gap-12">
            <div className="text-center">
              <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto mb-4 sm:mb-5 rounded-full bg-[#1d1d1f] flex items-center justify-center">
                <span className="text-[17px] sm:text-[19px] font-semibold text-white">1</span>
              </div>
              <h3 className="text-[17px] sm:text-[19px] font-semibold text-[#1d1d1f] mb-2">日程を選ぶ</h3>
              <p className="text-[14px] sm:text-[15px] text-[#6e6e73] leading-[1.5]">ご希望の日程を<br />選択してください</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto mb-4 sm:mb-5 rounded-full bg-[#1d1d1f] flex items-center justify-center">
                <span className="text-[17px] sm:text-[19px] font-semibold text-white">2</span>
              </div>
              <h3 className="text-[17px] sm:text-[19px] font-semibold text-[#1d1d1f] mb-2">情報を入力</h3>
              <p className="text-[14px] sm:text-[15px] text-[#6e6e73] leading-[1.5]">講師名、ジャンルを入力</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto mb-4 sm:mb-5 rounded-full bg-[#1d1d1f] flex items-center justify-center">
                <span className="text-[17px] sm:text-[19px] font-semibold text-white">3</span>
              </div>
              <h3 className="text-[17px] sm:text-[19px] font-semibold text-[#1d1d1f] mb-2">予約完了</h3>
              <p className="text-[14px] sm:text-[15px] text-[#6e6e73] leading-[1.5]">Googleカレンダーに登録し、<br />完了です</p>
            </div>
          </div>
        </div>
      </section>

      {/* フッター */}
      <footer className="bg-[#f5f5f7] border-t border-[#d2d2d7]/50">
        <div className="max-w-[980px] mx-auto px-6 py-4">
          <p className="text-[11px] sm:text-[12px] text-[#6e6e73] text-center">
            Copyright © 2026 アカウント添削会. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
