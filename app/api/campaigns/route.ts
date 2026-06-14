import {
  deactivateOtherCampaigns,
  fetchAllCampaigns,
  fetchCampaignWithPages,
  getImageFile,
  isValidDisplayType,
  jsonError,
  parsePagesJson,
  requireAdmin,
  uploadCampaignImage,
  validateAllImages,
} from "@/lib/campaigns";
import { verifyAdminSession } from "@/lib/admin-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { randomUUID } from "crypto";

export async function GET() {
  try {
    const campaigns = await fetchAllCampaigns();
    return Response.json({ campaigns });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch campaigns";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const unauthorized = requireAdmin(await verifyAdminSession());
    if (unauthorized) {
      return unauthorized;
    }

    const formData = await request.formData();
    const title = String(formData.get("title") ?? "").trim();
    const displayType = String(formData.get("displayType") ?? "static");
    const isActive = String(formData.get("isActive") ?? "false") === "true";
    const pagesJson = String(formData.get("pagesJson") ?? "[]");

    if (!title) {
      return jsonError("캠페인 제목을 입력해 주세요.");
    }

    if (!isValidDisplayType(displayType)) {
      return jsonError("유효하지 않은 display type 입니다.");
    }

    const pages = parsePagesJson(pagesJson);
    validateAllImages(formData, pages);

    const supabase = createAdminClient();

    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .insert({
        title,
        display_type: displayType,
        active: isActive,
      })
      .select("*")
      .single();

    if (campaignError || !campaign) {
      throw new Error(campaignError?.message ?? "Campaign create failed");
    }

    if (isActive) {
      await deactivateOtherCampaigns(campaign.id);
      await supabase.from("campaigns").update({ active: true }).eq("id", campaign.id);
    }

    const insertedPages = [];

    for (const page of pages) {
      const pageKey = page.clientKey ?? randomUUID();
      const file = getImageFile(formData, page.imageFieldName);
      let imageUrl: string | null = null;
      let imagePath: string | null = null;

      if (file) {
        const uploaded = await uploadCampaignImage(campaign.id, pageKey, file);
        imageUrl = uploaded.imageUrl;
        imagePath = uploaded.imagePath;
      }

      const { data, error } = await supabase
        .from("campaign_pages")
        .insert({
          campaign_id: campaign.id,
          text: page.text,
          duration_seconds: page.durationSeconds,
          sort_order: page.sortOrder,
          image_url: imageUrl,
          image_path: imagePath,
        })
        .select("*")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      insertedPages.push(data);
    }

    const result = await fetchCampaignWithPages(campaign.id);
    return Response.json({ campaign: result, pages: result?.pages ?? insertedPages }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create campaign";
    return Response.json({ error: message }, { status: 400 });
  }
}
