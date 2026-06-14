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
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<number | null>(null);

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

    if (!currentPage || pages.length === 0) {
      return;
    }

    const durationMs = normalizeDuration(currentPage.duration_seconds) * 1000;

    timerRef.current = window.setTimeout(() => {
      setCurrentPageIndex((index) => (index + 1) % pages.length);
    }, durationMs);

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
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

  const displayClass = DISPLAY_TYPE_CLASS[campaign.display_type] ?? DISPLAY_TYPE_CLASS.static;
  const hasImage = Boolean(currentPage.image_url);
  const hasText = Boolean(currentPage.text?.trim());

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white">
      {hasImage ? (
        <div className="relative min-h-0 w-full flex-1">
          <Image
            src={currentPage.image_url!}
            alt={currentPage.text?.trim() || "display image"}
            fill
            unoptimized
            className="object-cover object-center"
            sizes="100vw"
            priority
          />
        </div>
      ) : null}

      {hasText ? (
        <div
          className={`shrink-0 px-6 py-8 ${
            hasImage ? "bg-black/30" : "flex flex-1 items-center justify-center"
          }`}
        >
          <div
            className={`mx-auto w-full max-w-6xl text-center text-2xl sm:text-4xl lg:text-5xl ${displayClass}`}
          >
            <span>{currentPage.text}</span>
          </div>
        </div>
      ) : null}
    </main>
  );
}
