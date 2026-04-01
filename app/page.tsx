import Navbar from "@/components/Navbar";
import NewsSection from "@/components/NewsSection";
import BestSellingSection from "@/components/BestSellingSection";
import StoriesSection from "@/components/StoriesSection";
import Footer from "@/components/Footer";
import { getTopSellingEVs } from "@/lib/evs";
import { getEvNews } from "@/lib/news";

export default async function HomePage() {
  const evNews = await getEvNews();
  const evModels = await getTopSellingEVs();

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />
      <NewsSection items={evNews} />
      <BestSellingSection models={evModels} />
      <StoriesSection />
      <Footer />
    </main>
  );
}