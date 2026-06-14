export type CampaignDisplayType =
  | "static"
  | "marquee"
  | "liquid_glass_shimmer"
  | "shining"
  | "fade"
  | "bounce";

export interface CampaignPage {
  id: string;
  campaign_id: string;
  text: string | null;
  image_url: string | null;
  image_path: string | null;
  duration_seconds: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  title: string;
  display_type: CampaignDisplayType;
  active: boolean;
  created_at: string;
  updated_at: string;
  pages?: CampaignPage[];
}

export interface PageFormInput {
  id?: string;
  clientKey?: string;
  text: string;
  durationSeconds: number;
  imageFieldName?: string | null;
  existingImageUrl?: string | null;
  existingImagePath?: string | null;
  sortOrder: number;
}

export const DISPLAY_TYPE_OPTIONS: {
  value: CampaignDisplayType;
  label: string;
}[] = [
  { value: "static", label: "Static" },
  { value: "marquee", label: "Marquee" },
  { value: "liquid_glass_shimmer", label: "Liquid Glass Shimmer" },
  { value: "shining", label: "Shining Text" },
  { value: "fade", label: "Fade" },
  { value: "bounce", label: "Bounce" },
];

export const DISPLAY_TYPE_CLASS: Record<CampaignDisplayType, string> = {
  static: "display-static",
  marquee: "display-marquee",
  liquid_glass_shimmer: "display-liquid-glass-shimmer",
  shining: "display-shining",
  fade: "display-fade",
  bounce: "display-bounce",
};
