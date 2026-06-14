"use client";

import Image from "next/image";
import {
  DURATION_OPTIONS,
  DEFAULT_DURATION_SECONDS,
  MAX_IMAGE_SIZE_BYTES,
} from "@/lib/duration-options";
import type { PageFormInput } from "@/types/campaign";

export interface PageFieldState extends PageFormInput {
  previewUrl?: string | null;
}

interface CampaignPageFieldsProps {
  page: PageFieldState;
  index: number;
  total: number;
  imageFieldName: string;
  onChange: (index: number, next: Partial<PageFieldState>) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onRemove: (index: number) => void;
}

export default function CampaignPageFields({
  page,
  index,
  total,
  imageFieldName,
  onChange,
  onMoveUp,
  onMoveDown,
  onRemove,
}: CampaignPageFieldsProps) {
  const handleFileChange = (file: File | null) => {
    if (!file) {
      onChange(index, { previewUrl: page.existingImageUrl ?? null });
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      alert("이미지 1장당 최대 10MB까지 업로드할 수 있습니다.");
      return;
    }

    onChange(index, {
      imageFieldName,
      previewUrl: URL.createObjectURL(file),
    });
  };

  const preview = page.previewUrl ?? page.existingImageUrl;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-900">Page {index + 1}</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onMoveUp(index)}
            disabled={index === 0}
            className="rounded-lg border px-3 py-1 text-sm disabled:opacity-40"
          >
            위로
          </button>
          <button
            type="button"
            onClick={() => onMoveDown(index)}
            disabled={index === total - 1}
            className="rounded-lg border px-3 py-1 text-sm disabled:opacity-40"
          >
            아래로
          </button>
          <button
            type="button"
            onClick={() => onRemove(index)}
            disabled={total <= 1}
            className="rounded-lg border border-red-200 px-3 py-1 text-sm text-red-600 disabled:opacity-40"
          >
            삭제
          </button>
        </div>
      </div>

      <div className="grid gap-4">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">이미지</span>
          <input
            type="file"
            name={imageFieldName}
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(event) =>
              handleFileChange(event.target.files?.[0] ?? null)
            }
            className="block w-full text-sm"
          />
        </label>

        {preview ? (
          <div className="relative h-40 w-full overflow-hidden rounded-xl bg-slate-100">
            <Image
              src={preview}
              alt={`page-${index + 1}`}
              fill
              unoptimized
              className="object-contain"
            />
          </div>
        ) : null}

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">문구</span>
          <textarea
            value={page.text}
            onChange={(event) => onChange(index, { text: event.target.value })}
            rows={3}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            placeholder="표시할 문구를 입력하세요"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">Duration</span>
          <select
            value={page.durationSeconds ?? DEFAULT_DURATION_SECONDS}
            onChange={(event) =>
              onChange(index, { durationSeconds: Number(event.target.value) })
            }
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          >
            {DURATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
