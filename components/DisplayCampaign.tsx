"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_DURATION_SECONDS } from "@/lib/duration-options";
import { DISPLAY_TYPE_CLASS, type Campaign, type CampaignPage } from "@/types/campaign";

function normalizeDuration(seconds: number | null | undefined): number {
  if (!seconds || seconds <= 0 || !Number.isFinite(seconds)) {
    return DEFAULT_DURATION_SECONDS;
  }
  return seconds;
}

export default function DisplayCampaign() {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [pages, setPages] = useState<CampaignPage[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [remainingMs, setRemainingMs] = useState(DEFAULT_DURATION_SECONDS * 1000);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<number | null>(null);
  const progressRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);

  const loadActiveCampaign = useCallback(async () => {
    try {
      const response = await fetch("/api/campaigns/active", { cache: "no-store" });
      const data = (await response.json()) as { campaign: Campaign | null };
      const nextCampaign = data.campaign;
      const nextPages = [...(nextCampaign?.pages ?? [])].sort(
        (a, b) => a.sort_order - b.sort_order,
      );

      setCampaign(nextCampaign);
      setPages(nextPages);
      setCurrentPageIndex(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadInitialCampaign() {
      try {
        const response = await fetch("/api/campaigns/active", { cache: "no-store" });
        const data = (await response.json()) as { campaign: Campaign | null };
        if (cancelled) {
          return;
        }

        const nextCampaign = data.campaign;
        const nextPages = [...(nextCampaign?.pages ?? [])].sort(
          (a, b) => a.sort_order - b.sort_order,
        );

        setCampaign(nextCampaign);
        setPages(nextPages);
        setCurrentPageIndex(0);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadInitialCampaign();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("display-campaign-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "campaigns" },
        () => {
          void loadActiveCampaign();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "campaign_pages" },
        () => {
          void loadActiveCampaign();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadActiveCampaign]);

  const currentPage = pages[currentPageIndex];

  useEffect(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (progressRef.current) {
      window.clearInterval(progressRef.current);
      progressRef.current = null;
    }

    if (!currentPage || pages.length === 0) {
      return;
    }

    const durationMs = normalizeDuration(currentPage.duration_seconds) * 1000;
    startedAtRef.current = Date.now();

    progressRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startedAtRef.current;
      setRemainingMs(Math.max(durationMs - elapsed, 0));
    }, 200);

    timerRef.current = window.setTimeout(() => {
      setCurrentPageIndex((index) => (index + 1) % pages.length);
    }, durationMs);

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
      if (progressRef.current) {
        window.clearInterval(progressRef.current);
      }
    };
  }, [currentPage, pages, currentPageIndex]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white">
        <p className="text-xl text-slate-300">불러오는 중...</p>
      </main>
    );
  }

  if (!campaign || pages.length === 0 || !currentPage) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-black px-6">
        <p className="text-center text-2xl font-medium text-slate-200 sm:text-4xl">
          현재 표시할 캠페인이 없습니다.
        </p>
      </main>
    );
  }

  const durationMs = normalizeDuration(currentPage.duration_seconds) * 1000;
  const progress = durationMs > 0 ? ((durationMs - remainingMs) / durationMs) * 100 : 0;
  const displayClass = DISPLAY_TYPE_CLASS[campaign.display_type] ?? DISPLAY_TYPE_CLASS.static;

  return (
    <main className="relative flex min-h-screen flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white">
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-10">
        <h1 className="mb-8 text-center text-3xl font-bold tracking-tight sm:text-5xl">
          {campaign.title}
        </h1>

        <div className="flex w-full max-w-6xl flex-col items-center gap-8">
          {currentPage.image_url ? (
            <div className="relative aspect-video w-full max-h-[55vh] overflow-hidden rounded-3xl border border-white/10 bg-black/20 shadow-2xl">
              <Image
                src={currentPage.image_url}
                alt={currentPage.text ?? campaign.title}
                fill
                unoptimized
                className="object-contain"
                sizes="(max-width: 1200px) 100vw, 1200px"
              />
            </div>
          ) : null}

          {currentPage.text ? (
            <div className={`w-full max-w-5xl text-center text-2xl sm:text-4xl ${displayClass}`}>
              <span>{currentPage.text}</span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="border-t border-white/10 bg-black/30 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 text-sm text-slate-300">
          <span>
            {currentPageIndex + 1} / {pages.length}
          </span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-indigo-400 transition-[width] duration-200"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <span>{Math.ceil(remainingMs / 1000)}초</span>
        </div>
      </div>
    </main>
  );
}
