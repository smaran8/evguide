import Navbar from "@/components/Navbar";
import FeaturedBlogPostsSection from "@/components/FeaturedBlogPostsSection";
import NewsSection from "@/components/NewsSection";
import BestSellingSection from "@/components/BestSellingSection";
import StoriesSection from "@/components/StoriesSection";
import Footer from "@/components/Footer";
import RecommendedForYou from "@/components/personalization/RecommendedForYou";
import PersonalizedCTA from "@/components/personalization/PersonalizedCTA";
import { getTopSellingEVs } from "@/lib/evs";
import { getEvNews } from "@/lib/news";
import { getFeaturedBlogPosts } from "@/lib/blog";
import { getLatestApprovedReviews } from "@/lib/reviews";
import { getApprovedFeedbackStories } from "@/lib/feedback";

export default async function HomePage() {
  const [featuredPosts, evNews, verifiedReviews, evModels, feedbackStories] = await Promise.all([
    getFeaturedBlogPosts(3),
    getEvNews(),
    getLatestApprovedReviews(8),
    getTopSellingEVs(),
    getApprovedFeedbackStories(),
  ]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />
      <FeaturedBlogPostsSection posts={featuredPosts} />
      <NewsSection items={evNews} />
      <BestSellingSection models={evModels} />
      <RecommendedForYou />
      <StoriesSection feedbackStories={feedbackStories} models={evModels} verifiedReviews={verifiedReviews} />
      <PersonalizedCTA />
      <Footer />
    </main>
  );
}