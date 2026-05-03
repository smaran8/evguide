import type { Metadata } from "next";
import BlogHubClient from "@/components/blog/hub/BlogHubClient";
import type { BlogHubArticle } from "@/components/blog/hub/types";
import PremiumFooter from "@/components/home/PremiumFooter";
import PremiumNavbar from "@/components/home/PremiumNavbar";
import { getFeaturedBlogPosts } from "@/lib/blog";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.evguide.ai";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "EV guides, comparisons, and buying insights | EVGuide AI",
  description:
    "Premium EV content for UK buyers covering buying guides, EV comparisons, charging advice, finance insights, and product-led next steps.",
  alternates: {
    canonical: "/blog",
    languages: {
      "en-GB": "/blog",
    },
  },
  openGraph: {
    title: "EV guides, comparisons, and buying insights",
    description:
      "Make smarter EV decisions with expert content, comparisons, and cost breakdowns built for UK buyers.",
    url: "/blog",
    siteName: "EVGuide AI",
    locale: "en_GB",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "EV guides, comparisons, and buying insights",
    description:
      "A premium EV content hub that helps UK buyers research, compare, and move into smarter next steps.",
  },
};

export const revalidate = 1800;

const MOCK_ARTICLES: BlogHubArticle[] = [
  {
    id: "mock-buying-guide-1",
    href: "/blog",
    title: "Best EV under GBP 20k in the UK",
    excerpt:
      "A shortlist of affordable EVs that still deliver usable range, sensible charging speed, and low ownership stress.",
    description:
      "Buying Guide for UK drivers balancing upfront price, charging practicality, and everyday confidence without overspending.",
    category: "Buying Guides",
    image:
      "https://images.unsplash.com/photo-1553440569-bcc63803a83d?auto=format&fit=crop&w=1400&q=80",
    readTime: "6 min read",
    publishedAt: "Updated for UK buyers",
    author: "EVGuide AI Editorial",
  },
  {
    id: "mock-comparison-1",
    href: "/blog",
    title: "Tesla Model 3 vs Hyundai Ioniq 6: which makes more sense in 2026?",
    excerpt:
      "One leans harder into software and charging network confidence, while the other wins on comfort and efficiency feel.",
    category: "Comparisons",
    image:
      "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1400&q=80",
    readTime: "8 min read",
    publishedAt: "Fresh this week",
    author: "EVGuide AI Editorial",
  },
  {
    id: "mock-charging-1",
    href: "/blog",
    title: "Home charging vs public charging: what actually matters for UK buyers",
    excerpt:
      "The real decision is not charger speed alone. It is whether your routine supports low-friction charging week after week.",
    category: "Charging",
    image:
      "https://images.unsplash.com/photo-1593941707874-ef25b8b4a92b?auto=format&fit=crop&w=1400&q=80",
    readTime: "5 min read",
    publishedAt: "Charging essentials",
    author: "EVGuide AI Editorial",
  },
  {
    id: "mock-finance-1",
    href: "/blog",
    title: "How much EV can you really afford on a GBP 450 monthly budget?",
    excerpt:
      "A practical affordability lens that helps you compare deposit, monthly cost, and running costs before falling for the wrong car.",
    category: "Finance",
    image:
      "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1400&q=80",
    readTime: "7 min read",
    publishedAt: "Affordability guide",
    author: "EVGuide AI Editorial",
  },
  {
    id: "mock-news-1",
    href: "/blog",
    title: "What falling battery prices could mean for UK EV buyers",
    excerpt:
      "Cheaper battery packs may reshape entry pricing, lease deals, and how quickly mainstream EV value improves.",
    category: "News",
    image:
      "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1400&q=80",
    readTime: "4 min read",
    publishedAt: "Market outlook",
    author: "EVGuide AI Editorial",
  },
  {
    id: "mock-buying-guide-2",
    href: "/blog",
    title: "7 mistakes first-time EV buyers still make",
    excerpt:
      "From overbuying range to ignoring home charging fit, these are the avoidable mistakes that create regret after purchase.",
    category: "Buying Guides",
    image:
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1400&q=80",
    readTime: "6 min read",
    publishedAt: "Buyer checklist",
    author: "EVGuide AI Editorial",
  },
  {
    id: "mock-comparison-2",
    href: "/blog",
    title: "BYD Dolphin vs MG4: the smarter value EV for UK roads",
    excerpt:
      "A clear look at range, practicality, cabin quality, and the trade-off between price leadership and all-round polish.",
    category: "Comparisons",
    image:
      "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=1400&q=80",
    readTime: "7 min read",
    publishedAt: "Value comparison",
    author: "EVGuide AI Editorial",
  },
  {
    id: "mock-charging-2",
    href: "/blog",
    title: "Public rapid charging etiquette and cost traps to avoid",
    excerpt:
      "A faster guide to finding reliable chargers, reducing wait time, and avoiding expensive charging habits on longer trips.",
    category: "Charging",
    image:
      "https://images.unsplash.com/photo-1617886322168-72b886573c5f?auto=format&fit=crop&w=1400&q=80",
    readTime: "5 min read",
    publishedAt: "Practical charging",
    author: "EVGuide AI Editorial",
  },
  {
    id: "mock-finance-2",
    href: "/blog",
    title: "Lease, PCP, or bank loan: which EV finance path gives you the most control?",
    excerpt:
      "Choose the right structure for flexibility, monthly comfort, and long-term value before signing the wrong agreement.",
    category: "Finance",
    image:
      "https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=1400&q=80",
    readTime: "8 min read",
    publishedAt: "Finance strategy",
    author: "EVGuide AI Editorial",
  },
  {
    id: "mock-news-2",
    href: "/blog",
    title: "Why more EV buyers are prioritising software quality over badge prestige",
    excerpt:
      "Connected features, update cadence, and route planning quality are becoming part of the purchase decision, not a nice extra.",
    category: "News",
    image:
      "https://images.unsplash.com/photo-1486496572940-2bb2341fdbdf?auto=format&fit=crop&w=1400&q=80",
    readTime: "4 min read",
    publishedAt: "Industry signal",
    author: "EVGuide AI Editorial",
  },
];

function estimateReadTime(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return `${Math.max(4, Math.ceil(words / 180))} min read`;
}

function formatPublishedAt(value: string | null) {
  if (!value) {
    return "Updated for UK buyers";
  }

  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function normalizeCategory(category: string | null | undefined): BlogHubArticle["category"] {
  const value = category?.trim().toLowerCase();

  if (!value) return "Buying Guides";
  if (value.includes("comparison")) return "Comparisons";
  if (value.includes("charging")) return "Charging";
  if (value.includes("finance")) return "Finance";
  if (value.includes("news") || value.includes("market") || value.includes("updated")) return "News";

  return "Buying Guides";
}

async function getBlogHubArticles() {
  const sourcePosts = await getFeaturedBlogPosts(12);
  const liveArticles: BlogHubArticle[] = sourcePosts.map((post, index) => ({
    id: post.id || `post-${index}`,
    href: post.slug ? `/blog/${post.slug}` : "/blog",
    slug: post.slug || undefined,
    title: post.title,
    excerpt:
      post.excerpt ??
      "Product-integrated EV insight built to help readers move from research into AI Match, Compare EVs, and Check affordability.",
    description: post.excerpt ?? undefined,
    category: normalizeCategory(post.category),
    image:
      post.coverImage ??
      "https://images.unsplash.com/photo-1553440569-bcc63803a83d?auto=format&fit=crop&w=1400&q=80",
    readTime: estimateReadTime(post.content),
    publishedAt: formatPublishedAt(post.publishedAt),
    author: post.author ?? "EVGuide AI Editorial",
    featured: index === 0,
  }));

  const merged = [...liveArticles];

  for (const article of MOCK_ARTICLES) {
    if (merged.length >= 12) {
      break;
    }

    const duplicate = merged.some(
      (existing) => existing.title.toLowerCase() === article.title.toLowerCase(),
    );

    if (!duplicate) {
      merged.push(article);
    }
  }

  return merged;
}

export default async function BlogPage() {
  const articles = await getBlogHubArticles();
  const collectionStructuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "EV guides, comparisons, and buying insights",
    description:
      "A premium EV content hub for UK buyers covering buying guides, comparisons, charging, finance, and market intelligence.",
    url: `${SITE_URL.replace(/\/$/, "")}/blog`,
    inLanguage: "en-GB",
    about: [
      "Electric vehicles",
      "EV buying guides",
      "EV comparisons",
      "EV charging",
      "EV finance",
    ],
    isPartOf: {
      "@type": "WebSite",
      name: "EVGuide AI",
      url: SITE_URL,
    },
  };

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionStructuredData) }}
      />
      <PremiumNavbar />
      <BlogHubClient articles={articles} />
      <PremiumFooter />
    </main>
  );
}
