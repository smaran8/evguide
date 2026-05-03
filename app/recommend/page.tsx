import type { Metadata } from "next";
import PremiumNavbar from "@/components/home/PremiumNavbar";
import EVChatInterface from "@/components/assistant/EVChatInterface";

export const metadata: Metadata = {
  title: "AI Match | EV Guide",
  description:
    "Chat with our AI and find your perfect EV based on your budget, driving habits, and lifestyle.",
};

export default function RecommendPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#07090B]">
      <PremiumNavbar />
      {/* PremiumNavbar is fixed h-20 (80px) */}
      <div className="pt-20 flex-1">
        <EVChatInterface navOffset={80} />
      </div>
    </div>
  );
}
