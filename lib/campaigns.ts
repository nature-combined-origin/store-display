import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ALLOWED_IMAGE_MIME_TYPES,
  DEFAULT_DURATION_SECONDS,
  MAX_CAMPAIGN_PAGES,
  MAX_IMAGE_SIZE_BYTES,
} from "@/lib/duration-options";
import type { Campaign, CampaignDisplayType, CampaignPage } from "@/types/campaign";
import type { PageFormInput } from "@/types/campaign";

export const STORAGE_BUCKET = "campaign-images";

const DISPLAY_TYPES: CampaignDisplayType[] = [
  "static",
  "marquee",
  "liquid_glass_shimmer",
  "shining",
  "fade",
  "bounce",
];

export function isValidDisplayType(value: string): value is CampaignDisplayType {
  return DISPLAY_TYPES.includes(value as CampaignDisplayType);
}

export function parsePagesJson(raw: string): PageFormInput[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("pagesJson 형식이 올바르지 않습니다.");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("pagesJson은 배열이어야 합니다.");
  }

  if (parsed.length > MAX_CAMPAIGN_PAGES) {
    throw new Error(`캠페인 page는 최대 ${MAX_CAMPAIGN_PAGES}개까지 등록할 수 있습니다.`);
  }

  return parsed.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`page ${index + 1} 데이터가 올바르지 않습니다.`);
    }

    const page = item as Record<string, unknown>;
    const durationSeconds =
      typeof page.durationSeconds === "number" && page.durationSeconds > 0
        ? page.durationSeconds
        : DEFAULT_DURATION_SECONDS;

    return {
      id: typeof page.id === "string" ? page.id : undefined,
      clientKey: typeof page.clientKey === "string" ? page.clientKey : undefined,
      text: typeof page.text === "string" ? page.text : "",
      durationSeconds,
      imageFieldName:
        typeof page.imageFieldName === "string" ? page.imageFieldName : null,
      existingImageUrl:
        typeof page.existingImageUrl === "string" ? page.existingImageUrl : null,
      existingImagePath:
        typeof page.existingImagePath === "string" ? page.existingImagePath : null,
      sortOrder:
        typeof page.sortOrder === "number" ? page.sortOrder : index,
    };
  });
}

export function validateImageFile(file: File): void {
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_MIME_TYPES)[number])) {
    throw new Error(
      `허용되지 않는 이미지 형식입니다: ${file.name} (${file.type || "unknown"})`,
    );
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error(`이미지 1장당 최대 10MB까지 업로드할 수 있습니다: ${file.name}`);
  }
}

function getExtension(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && ["jpg", "jpeg", "png", "webp", "gif"].includes(fromName)) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }

  switch (file.type) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "jpg";
  }
}

export async function uploadCampaignImage(
  campaignId: string,
  pageKey: string,
  file: File,
): Promise<{ imageUrl: string; imagePath: string }> {
  validateImageFile(file);

  const supabase = createAdminClient();
  const ext = getExtension(file);
  const imagePath = `campaigns/${campaignId}/${pageKey}/${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(imagePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    throw new Error(`이미지 업로드 실패: ${error.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(imagePath);

  return { imageUrl: publicUrl, imagePath };
}

export async function deleteStorageObject(imagePath: string | null | undefined): Promise<void> {
  if (!imagePath) {
    return;
  }

  const supabase = createAdminClient();
  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([imagePath]);

  if (error) {
    console.error("Storage delete failed:", error.message);
  }
}

export async function deactivateOtherCampaigns(campaignId: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("campaigns")
    .update({ active: false })
    .eq("active", true)
    .neq("id", campaignId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function fetchCampaignWithPages(id: string): Promise<Campaign | null> {
  const supabase = createAdminClient();

  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (campaignError) {
    throw new Error(campaignError.message);
  }

  if (!campaign) {
    return null;
  }

  const { data: pages, error: pagesError } = await supabase
    .from("campaign_pages")
    .select("*")
    .eq("campaign_id", id)
    .order("sort_order", { ascending: true });

  if (pagesError) {
    throw new Error(pagesError.message);
  }

  return {
    ...(campaign as Campaign),
    pages: (pages ?? []) as CampaignPage[],
  };
}

export async function fetchAllCampaigns(): Promise<Campaign[]> {
  const supabase = createAdminClient();

  const { data: campaigns, error: campaignsError } = await supabase
    .from("campaigns")
    .select("*")
    .order("created_at", { ascending: false });

  if (campaignsError) {
    throw new Error(campaignsError.message);
  }

  const { data: pages, error: pagesError } = await supabase
    .from("campaign_pages")
    .select("*")
    .order("sort_order", { ascending: true });

  if (pagesError) {
    throw new Error(pagesError.message);
  }

  const pagesByCampaign = new Map<string, CampaignPage[]>();
  for (const page of (pages ?? []) as CampaignPage[]) {
    const list = pagesByCampaign.get(page.campaign_id) ?? [];
    list.push(page);
    pagesByCampaign.set(page.campaign_id, list);
  }

  return ((campaigns ?? []) as Campaign[]).map((campaign) => ({
    ...campaign,
    pages: pagesByCampaign.get(campaign.id) ?? [],
  }));
}

export async function fetchActiveCampaign(): Promise<Campaign | null> {
  const supabase = createAdminClient();

  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (campaignError) {
    throw new Error(campaignError.message);
  }

  if (!campaign) {
    return null;
  }

  const { data: pages, error: pagesError } = await supabase
    .from("campaign_pages")
    .select("*")
    .eq("campaign_id", campaign.id)
    .order("sort_order", { ascending: true });

  if (pagesError) {
    throw new Error(pagesError.message);
  }

  return {
    ...(campaign as Campaign),
    pages: (pages ?? []) as CampaignPage[],
  };
}

export function getImageFile(
  formData: FormData,
  fieldName: string | null | undefined,
): File | null {
  if (!fieldName) {
    return null;
  }

  const value = formData.get(fieldName);
  if (!(value instanceof File) || value.size === 0) {
    return null;
  }

  return value;
}

export function validateAllImages(formData: FormData, pages: PageFormInput[]): void {
  for (const page of pages) {
    const file = getImageFile(formData, page.imageFieldName);
    if (file) {
      validateImageFile(file);
    }
  }
}

export async function deleteCampaignById(id: string): Promise<void> {
  const supabase = createAdminClient();
  const campaign = await fetchCampaignWithPages(id);

  if (!campaign) {
    throw new Error("Campaign not found");
  }

  for (const page of campaign.pages ?? []) {
    await deleteStorageObject(page.image_path);
  }

  const { error } = await supabase.from("campaigns").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

export function jsonError(message: string, status = 400): Response {
  return Response.json({ error: message }, { status });
}

export function requireAdmin(isAdmin: boolean): Response | null {
  if (!isAdmin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
