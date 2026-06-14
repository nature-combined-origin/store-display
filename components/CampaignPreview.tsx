import type { CampaignDisplayType } from "@/types/campaign";
import { DISPLAY_TYPE_CLASS } from "@/types/campaign";

interface CampaignPreviewProps {
  text: string;
  displayType: CampaignDisplayType;
}

export default function CampaignPreview({ text, displayType }: CampaignPreviewProps) {
  const displayClass = DISPLAY_TYPE_CLASS[displayType];

  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-black p-6 text-white">
      <p className="mb-3 text-sm text-slate-400">미리보기</p>
      <div className={`text-xl ${displayClass}`}>
        <span>{text || "미리보기 문구"}</span>
      </div>
    </div>
  );
}
