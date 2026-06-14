export const DURATION_OPTIONS = [
  { label: "10초", value: 10 },
  { label: "30초", value: 30 },
  { label: "1분", value: 60 },
  { label: "3분", value: 180 },
  { label: "5분", value: 300 },
  { label: "10분", value: 600 },
  { label: "30분", value: 1800 },
  { label: "60분", value: 3600 },
  { label: "3시간", value: 10800 },
  { label: "6시간", value: 21600 },
  { label: "12시간", value: 43200 },
  { label: "24시간", value: 86400 },
] as const;

export const DEFAULT_DURATION_SECONDS = 60;
export const MAX_CAMPAIGN_PAGES = 20;
export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;
