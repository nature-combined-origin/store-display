import { fetchActiveCampaign } from "@/lib/campaigns";

export async function GET() {
  try {
    const campaign = await fetchActiveCampaign();
    return Response.json({ campaign });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch active campaign";
    return Response.json({ error: message }, { status: 500 });
  }
}
