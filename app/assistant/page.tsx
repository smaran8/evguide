import Navbar from "@/components/Navbar";
import EVChatInterface from "@/components/assistant/EVChatInterface";

export const metadata = {
  title: "AI Car Match Advisor — EV Guide",
  description: "Find your perfect EV with our AI-powered car advisor.",
};

export default function AssistantPage() {
  return (
    <>
      <Navbar />
      <EVChatInterface navOffset={64} />
    </>
  );
}
