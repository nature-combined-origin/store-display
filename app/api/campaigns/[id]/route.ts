import { verifyAdminSession } from "@/lib/admin-session";
import {
  deactivateOtherCampaigns,
  deleteCampaignById,
  deleteStorageObject,
  fetchCampaignWithPages,
  getImageFile,
  isValidDisplayType,
  jsonError,
  parsePagesJson,
  requireAdmin,
  uploadCampaignImage,
  validateAllImages,
} from "@/lib/campaigns";
import { createAdminClient } from "@/lib/supabase/admin";
import { randomUUID } from "crypto";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const campaign = await fetchCampaignWithPages(id);

    if (!campaign) {
      return Response.json({ error: "Campaign not found" }, { status: 404 });
    }

    return Response.json({ campaign });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch campaign";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const unauthorized = requireAdmin(await verifyAdminSession());
    if (unauthorized) {
      return unauthorized;
    }

    const { id } = await context.params;
    const existing = await fetchCampaignWithPages(id);
    if (!existing) {
      return Response.json({ error: "Campaign not found" }, { status: 404 });
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

    const { error: updateError } = await supabase
      .from("campaigns")
      .update({
        title,
        display_type: displayType,
        active: isActive,
      })
      .eq("id", id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    if (isActive) {
      await deactivateOtherCampaigns(id);
      await supabase.from("campaigns").update({ active: true }).eq("id", id);
    }

    const existingPages = existing.pages ?? [];
    const incomingIds = new Set(
      pages.map((page) => page.id).filter((pageId): pageId is string => Boolean(pageId)),
    );

    const pagesToDelete = existingPages.filter((page) => !incomingIds.has(page.id));
    for (const page of pagesToDelete) {
      await deleteStorageObject(page.image_path);
      await supabase.from("campaign_pages").delete().eq("id", page.id);
    }

    const updatedPages = [];

    for (const page of pages) {
      const file = getImageFile(formData, page.imageFieldName);
      let imageUrl = page.existingImageUrl ?? null;
      let imagePath = page.existingImagePath ?? null;

      if (file) {
        if (page.id) {
          const oldPage = existingPages.find((item) => item.id === page.id);
          if (oldPage?.image_path) {
            await deleteStorageObject(oldPage.image_path);
          }
        }

        const pageKey = page.id ?? page.clientKey ?? randomUUID();
        const uploaded = await uploadCampaignImage(id, pageKey, file);
        imageUrl = uploaded.imageUrl;
        imagePath = uploaded.imagePath;
      }

      if (page.id) {
        const { data, error } = await supabase
          .from("campaign_pages")
          .update({
            text: page.text,
            duration_seconds: page.durationSeconds,
            sort_order: page.sortOrder,
            image_url: imageUrl,
            image_path: imagePath,
          })
          .eq("id", page.id)
          .select("*")
          .single();

        if (error) {
          throw new Error(error.message);
        }

        updatedPages.push(data);
      } else {
        const { data, error } = await supabase
          .from("campaign_pages")
          .insert({
            campaign_id: id,
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

        updatedPages.push(data);
      }
    }

    const campaign = await fetchCampaignWithPages(id);
    return Response.json({ campaign, pages: campaign?.pages ?? updatedPages });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update campaign";
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const unauthorized = requireAdmin(await verifyAdminSession());
    if (unauthorized) {
      return unauthorized;
    }

    const { id } = await context.params;
    await deleteCampaignById(id);
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete campaign";
    return Response.json({ error: message }, { status: 400 });
  }
}
