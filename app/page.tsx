import PremiumNavbar from "@/components/home/PremiumNavbar";
import { Suspense } from "react";
import HeroSection from "@/components/home/HeroSection";
import HeroFeaturedCard, {
  HeroFeaturedCardSkeleton,
} from "@/components/home/HeroFeaturedCard";
import TrustStrip from "@/components/home/TrustStrip";
import HowItWorks from "@/components/home/HowItWorks";
import FeaturedEVs from "@/components/home/FeaturedEVs";
import AIRecommendation from "@/components/home/AIRecommendation";
import FinancePreview from "@/components/home/FinancePreview";
import Testimonials from "@/components/home/Testimonials";
import BlogPreview from "@/components/home/BlogPreview";
import FinalCTA from "@/components/home/FinalCTA";
import PremiumFooter from "@/components/home/PremiumFooter";

import { getTopSellingEVs } from "@/lib/evs";
import { getFeaturedBlogPosts } from "@/lib/blog";

export const revalidate = 1800;

async function HomeHeroFeaturedCard() {
  const evModels = await getTopSellingEVs();
  return <HeroFeaturedCard model={evModels[0] ?? null} />;
}

async function HomeFeaturedEVsSection() {
  const evModels = await getTopSellingEVs();
  return <FeaturedEVs models={evModels} />;
}

async function HomeBlogPreviewSection() {
  const featuredPosts = await getFeaturedBlogPosts(3);
  return <BlogPreview posts={featuredPosts} />;
}

function DeferredSectionSkeleton() {
  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="h-10 w-52 animate-pulse rounded-full bg-[#E8F8F5]" />
        <div className="mt-6 h-14 max-w-3xl animate-pulse rounded-[1.75rem] bg-[#F8FAF9]" />
        <div className="mt-5 h-8 max-w-2xl animate-pulse rounded-[1.25rem] bg-[#F8FAF9]" />
        <div className="mt-12 grid gap-6 xl:grid-cols-3">
          <div className="h-[480px] animate-pulse rounded-[2rem] bg-[#F8FAF9]" />
          <div className="h-[480px] animate-pulse rounded-[2rem] bg-[#F8FAF9]" />
          <div className="h-[480px] animate-pulse rounded-[2rem] bg-[#F8FAF9]" />
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F8FAF9] font-sans text-[#1A1A1A] selection:bg-[#D1F2EB]">
      <PremiumNavbar />
      <HeroSection
        featuredCard={
          <Suspense fallback={<HeroFeaturedCardSkeleton />}>
            <HomeHeroFeaturedCard />
          </Suspense>
        }
      />
      <TrustStrip />
      <Suspense fallback={<DeferredSectionSkeleton />}>
        <HomeFeaturedEVsSection />
      </Suspense>
      <FinancePreview />
      <FinalCTA />
      <HowItWorks />
      <AIRecommendation />
      <Testimonials />
      <Suspense fallback={<DeferredSectionSkeleton />}>
        <HomeBlogPreviewSection />
      </Suspense>
      <PremiumFooter />
    </main>
  );
}
