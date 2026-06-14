import CampaignForm from "@/components/CampaignForm";
import { fetchCampaignWithPages } from "@/lib/campaigns";
import { notFound } from "next/navigation";

interface EditCampaignPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCampaignPage({ params }: EditCampaignPageProps) {
  const { id } = await params;
  const campaign = await fetchCampaignWithPages(id);

  if (!campaign) {
    notFound();
  }

  return <CampaignForm mode="edit" initialCampaign={campaign} />;
}
