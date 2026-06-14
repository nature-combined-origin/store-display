"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CampaignPageFields, { type PageFieldState } from "@/components/CampaignPageFields";
import {
  DEFAULT_DURATION_SECONDS,
  MAX_CAMPAIGN_PAGES,
} from "@/lib/duration-options";
import {
  DISPLAY_TYPE_OPTIONS,
  type Campaign,
  type CampaignDisplayType,
} from "@/types/campaign";

interface CampaignFormProps {
  mode: "create" | "edit";
  initialCampaign?: Campaign;
}

function createEmptyPage(index: number): PageFieldState {
  return {
    clientKey: `page-${Date.now()}-${index}`,
    text: "",
    durationSeconds: DEFAULT_DURATION_SECONDS,
    imageFieldName: `image_${index}`,
    sortOrder: index,
    previewUrl: null,
  };
}

function mapCampaignToPages(campaign?: Campaign): PageFieldState[] {
  if (!campaign?.pages?.length) {
    return [createEmptyPage(0)];
  }

  return [...campaign.pages]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((page, index) => ({
      id: page.id,
      text: page.text ?? "",
      durationSeconds: page.duration_seconds,
      sortOrder: index,
      imageFieldName: null,
      existingImageUrl: page.image_url,
      existingImagePath: page.image_path,
      previewUrl: page.image_url,
    }));
}

export default function CampaignForm({ mode, initialCampaign }: CampaignFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialCampaign?.title ?? "");
  const [displayType, setDisplayType] = useState<CampaignDisplayType>(
    initialCampaign?.display_type ?? "static",
  );
  const [isActive, setIsActive] = useState(initialCampaign?.active ?? false);
  const [pages, setPages] = useState<PageFieldState[]>(() =>
    mapCampaignToPages(initialCampaign),
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const imageFieldNames = useMemo(
    () => pages.map((_, index) => `image_${index}`),
    [pages],
  );

  const updatePage = (index: number, next: Partial<PageFieldState>) => {
    setPages((current) =>
      current.map((page, pageIndex) =>
        pageIndex === index ? { ...page, ...next, sortOrder: pageIndex } : page,
      ),
    );
  };

  const addPage = () => {
    if (pages.length >= MAX_CAMPAIGN_PAGES) {
      setError(`캠페인 page는 최대 ${MAX_CAMPAIGN_PAGES}개까지 등록할 수 있습니다.`);
      return;
    }

    setPages((current) => [
      ...current,
      {
        ...createEmptyPage(current.length),
        imageFieldName: `image_${current.length}`,
      },
    ]);
  };

  const removePage = (index: number) => {
    if (pages.length <= 1) {
      return;
    }

    setPages((current) =>
      current
        .filter((_, pageIndex) => pageIndex !== index)
        .map((page, pageIndex) => ({
          ...page,
          sortOrder: pageIndex,
          imageFieldName: page.imageFieldName ?? `image_${pageIndex}`,
        })),
    );
  };

  const movePage = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= pages.length) {
      return;
    }

    setPages((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((page, pageIndex) => ({ ...page, sortOrder: pageIndex }));
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (pages.length > MAX_CAMPAIGN_PAGES) {
      setError(`캠페인 page는 최대 ${MAX_CAMPAIGN_PAGES}개까지 등록할 수 있습니다.`);
      return;
    }

    setLoading(true);

    try {
      const formElement = event.currentTarget;
      const formData = new FormData(formElement);
      formData.set("title", title);
      formData.set("displayType", displayType);
      formData.set("isActive", String(isActive));

      const pagesJson = pages.map((page, index) => ({
        id: page.id,
        clientKey: page.clientKey,
        text: page.text,
        durationSeconds: page.durationSeconds ?? DEFAULT_DURATION_SECONDS,
        imageFieldName: page.imageFieldName,
        existingImageUrl: page.existingImageUrl,
        existingImagePath: page.existingImagePath,
        sortOrder: index,
      }));

      formData.set("pagesJson", JSON.stringify(pagesJson));

      const endpoint =
        mode === "create"
          ? "/api/campaigns"
          : `/api/campaigns/${initialCampaign?.id}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const response = await fetch(endpoint, {
        method,
        body: formData,
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "저장에 실패했습니다.");
      }

      router.push("/admin");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "저장에 실패했습니다.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!initialCampaign?.id) {
      return;
    }

    if (!window.confirm("이 캠페인을 삭제하시겠습니까?")) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/campaigns/${initialCampaign.id}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "삭제에 실패했습니다.");
      }

      router.push("/admin");
      router.refresh();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "삭제에 실패했습니다.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">
          {mode === "create" ? "새 캠페인 만들기" : "캠페인 수정"}
        </h1>

        <div className="mt-6 grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">캠페인 제목</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              className="rounded-xl border border-slate-300 px-3 py-2"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">글 표시 유형</span>
            <select
              value={displayType}
              onChange={(event) =>
                setDisplayType(event.target.value as CampaignDisplayType)
              }
              className="rounded-xl border border-slate-300 px-3 py-2"
            >
              {DISPLAY_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
            />
            <span className="text-sm font-medium text-slate-700">활성화</span>
          </label>
        </div>
      </div>

      <div className="grid gap-4">
        {pages.map((page, index) => (
          <CampaignPageFields
            key={page.id ?? page.clientKey ?? index}
            page={{
              ...page,
              imageFieldName: page.imageFieldName ?? imageFieldNames[index],
            }}
            index={index}
            total={pages.length}
            imageFieldName={imageFieldNames[index]}
            onChange={updatePage}
            onMoveUp={(pageIndex) => movePage(pageIndex, -1)}
            onMoveDown={(pageIndex) => movePage(pageIndex, 1)}
            onRemove={removePage}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={addPage}
        className="rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm font-medium text-slate-700"
      >
        Page 추가
      </button>

      {error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? "저장 중..." : "저장"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin")}
          className="rounded-xl border px-5 py-3 text-sm font-semibold"
        >
          취소
        </button>
        {mode === "edit" ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="rounded-xl border border-red-200 px-5 py-3 text-sm font-semibold text-red-600 disabled:opacity-60"
          >
            삭제
          </button>
        ) : null}
      </div>
    </form>
  );
}
