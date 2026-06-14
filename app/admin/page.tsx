"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DISPLAY_TYPE_OPTIONS, type Campaign } from "@/types/campaign";

function getDisplayTypeLabel(value: string): string {
  return DISPLAY_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export default function AdminPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadCampaigns = async () => {
    setError(null);

    try {
      const response = await fetch("/api/campaigns", { cache: "no-store" });
      const data = (await response.json()) as {
        campaigns?: Campaign[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "목록을 불러오지 못했습니다.");
      }

      setCampaigns(data.campaigns ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "목록을 불러오지 못했습니다.",
      );
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function loadInitialCampaigns() {
      try {
        const response = await fetch("/api/campaigns", { cache: "no-store" });
        const data = (await response.json()) as {
          campaigns?: Campaign[];
          error?: string;
        };

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          throw new Error(data.error ?? "목록을 불러오지 못했습니다.");
        }

        setCampaigns(data.campaigns ?? []);
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "목록을 불러오지 못했습니다.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadInitialCampaigns();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  const handleActivate = async (campaign: Campaign) => {
    setActionLoadingId(campaign.id);

    try {
      const detailResponse = await fetch(`/api/campaigns/${campaign.id}`);
      const detailData = (await detailResponse.json()) as { campaign?: Campaign };
      const current = detailData.campaign;

      if (!current) {
        throw new Error("캠페인을 찾을 수 없습니다.");
      }

      const formData = new FormData();
      formData.set("title", current.title);
      formData.set("displayType", current.display_type);
      formData.set("isActive", "true");

      const pagesJson = (current.pages ?? []).map((page, index) => ({
        id: page.id,
        text: page.text ?? "",
        durationSeconds: page.duration_seconds,
        existingImageUrl: page.image_url,
        existingImagePath: page.image_path,
        imageFieldName: null,
        sortOrder: index,
      }));

      formData.set("pagesJson", JSON.stringify(pagesJson));

      const response = await fetch(`/api/campaigns/${campaign.id}`, {
        method: "PATCH",
        body: formData,
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "활성화에 실패했습니다.");
      }

      await loadCampaigns();
    } catch (activateError) {
      alert(
        activateError instanceof Error
          ? activateError.message
          : "활성화에 실패했습니다.",
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (campaign: Campaign) => {
    if (!window.confirm(`"${campaign.title}" 캠페인을 삭제하시겠습니까?`)) {
      return;
    }

    setActionLoadingId(campaign.id);

    try {
      const response = await fetch(`/api/campaigns/${campaign.id}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "삭제에 실패했습니다.");
      }

      await loadCampaigns();
    } catch (deleteError) {
      alert(
        deleteError instanceof Error ? deleteError.message : "삭제에 실패했습니다.",
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Admin</h1>
            <p className="text-sm text-slate-600">캠페인 관리</p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/admin/campaigns/new"
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
            >
              새 캠페인
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border px-4 py-2 text-sm font-semibold"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6">
        {loading ? <p className="text-slate-600">불러오는 중...</p> : null}
        {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-red-700">{error}</p> : null}

        <div className="mt-4 grid gap-4">
          {campaigns.map((campaign) => {
            const thumbnail = campaign.pages?.[0]?.image_url;
            const pageCount = campaign.pages?.length ?? 0;

            return (
              <article
                key={campaign.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row">
                  <div className="relative h-32 w-full shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:w-48">
                    {thumbnail ? (
                      <Image
                        src={thumbnail}
                        alt={campaign.title}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-slate-400">
                        No Image
                      </div>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col gap-3">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900">
                        {campaign.title}
                      </h2>
                      <p className="text-sm text-slate-600">
                        {getDisplayTypeLabel(campaign.display_type)} · Page {pageCount}개
                      </p>
                      <p
                        className={`mt-1 inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          campaign.active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {campaign.active ? "활성" : "비활성"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/admin/campaigns/${campaign.id}/edit`}
                        className="rounded-lg border px-3 py-2 text-sm font-medium"
                      >
                        수정
                      </Link>
                      <button
                        type="button"
                        disabled={actionLoadingId === campaign.id || campaign.active}
                        onClick={() => void handleActivate(campaign)}
                        className="rounded-lg border border-emerald-200 px-3 py-2 text-sm font-medium text-emerald-700 disabled:opacity-50"
                      >
                        활성화
                      </button>
                      <button
                        type="button"
                        disabled={actionLoadingId === campaign.id}
                        onClick={() => void handleDelete(campaign)}
                        className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 disabled:opacity-50"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {!loading && campaigns.length === 0 ? (
          <p className="mt-8 text-center text-slate-600">등록된 캠페인이 없습니다.</p>
        ) : null}
      </div>
    </main>
  );
}
