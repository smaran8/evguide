import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ClaudeAssistant from "@/components/ClaudeAssistant";

export default function AssistantPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />
      <div className="mx-auto max-w-4xl px-6 py-16">
        <p className="text-sm font-semibold text-blue-600">AI Assistant</p>
        <h1 className="mt-2 text-4xl font-bold">Talk to Claude</h1>
        <p className="mt-3 text-slate-600">
          Use Claude from inside your EV Guide app.
        </p>

        <div className="mt-10">
          <ClaudeAssistant />
        </div>
      </div>
      <Footer />
    </main>
  );
}
