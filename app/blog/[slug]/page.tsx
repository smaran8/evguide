import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PremiumFooter from "@/components/home/PremiumFooter";
import PremiumNavbar from "@/components/home/PremiumNavbar";
import ArticleContent from "@/components/blog/article/ArticleContent";
import ArticleHero from "@/components/blog/article/ArticleHero";
import FinalCTA from "@/components/blog/article/FinalCTA";
import RelatedArticles from "@/components/blog/article/RelatedArticles";
import type {
  ArticleBlock,
  ArticlePageModel,
  InlineEVRecommendation,
  RelatedArticleItem,
} from "@/components/blog/article/types";
import { getFeaturedBlogPosts, type FeaturedBlogPost } from "@/lib/blog";
import { createPublicServerClient } from "@/lib/supabase/public-server";
import { evModels } from "@/data/evModels";

const ARTICLE_AUTHOR = "EVGuide AI Editorial";
const DEFAULT_SITE_URL = "https://www.evguide.ai";
const DEFAULT_GEO_LOCATION = "UK";
const PUBLISHER_NAME = "EVGuide";
const BLOG_SELECT_FULL =
  "id, slug, title, excerpt, content, category, cover_image, meta_title, meta_description, keywords, geo_location, author, created_at, published_at";
const BLOG_SELECT_LEGACY =
  "id, slug, title, excerpt, content, category, cover_image, published_at";

export const revalidate = 3600;

type BlogPostPageProps = {
  params: Promise<{ slug: string }>;
};

type BlogPostRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  category: string | null;
  cover_image: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  keywords?: string[] | string | null;
  geo_location?: string | null;
  author?: string | null;
  created_at?: string | null;
  published_at: string | null;
};

function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL;
}

function buildCanonicalUrl(slug: string) {
  return `${getSiteUrl().replace(/\/$/, "")}/blog/${slug}`;
}

function normalizeKeywords(keywords: string[] | string | null | undefined) {
  if (!keywords) return [];

  if (Array.isArray(keywords)) {
    return keywords.map((item) => item.trim()).filter(Boolean);
  }

  return keywords
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeGeoLocation(geoLocation: string | null | undefined) {
  return geoLocation?.trim() || DEFAULT_GEO_LOCATION;
}

function geoSuffix(geoLocation: string) {
  const lowered = geoLocation.toLowerCase();

  if (lowered === "uk" || lowered === "united kingdom" || lowered.includes(" uk")) {
    return "in the UK";
  }

  return `in ${geoLocation}`;
}

function ensureGeoInText(text: string, geoLocation: string) {
  if (!text.trim()) {
    return text;
  }

  const loweredText = text.toLowerCase();
  const loweredGeo = geoLocation.toLowerCase();
  const loweredSuffix = geoSuffix(geoLocation).toLowerCase();

  if (loweredText.includes(loweredGeo) || loweredText.includes(loweredSuffix)) {
    return text;
  }

  return `${text} ${geoSuffix(geoLocation)}`;
}

function isMissingColumnError(message: string | undefined) {
  return typeof message === "string" && message.includes("column blog_posts.");
}

function mapPostRow(row: BlogPostRow): FeaturedBlogPost {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    content: row.content,
    category: row.category,
    coverImage: row.cover_image,
    metaTitle: row.meta_title ?? null,
    metaDescription: row.meta_description ?? null,
    keywords: normalizeKeywords(row.keywords),
    geoLocation: row.geo_location ?? null,
    author: row.author ?? null,
    createdAt: row.created_at ?? null,
    publishedAt: row.published_at,
  };
}

async function getPost(slug: string): Promise<FeaturedBlogPost | null> {
  const supabase = createPublicServerClient();

  if (!supabase) {
    return null;
  }
  const fullQuery = await supabase
    .from("blog_posts")
    .select(BLOG_SELECT_FULL)
    .eq("slug", slug)
    .eq("published", true)
    .single();

  if (!fullQuery.error && fullQuery.data) {
    return mapPostRow(fullQuery.data as BlogPostRow);
  }

  if (fullQuery.error && !isMissingColumnError(fullQuery.error.message)) {
    return null;
  }

  const legacyQuery = await supabase
    .from("blog_posts")
    .select(BLOG_SELECT_LEGACY)
    .eq("slug", slug)
    .eq("published", true)
    .single();

  if (legacyQuery.error || !legacyQuery.data) {
    return null;
  }

  return mapPostRow(legacyQuery.data as BlogPostRow);
}

async function getAllPublishedSlugs() {
  const supabase = createPublicServerClient();

  if (!supabase) {
    return [];
  }
  const { data, error } = await supabase
    .from("blog_posts")
    .select("slug")
    .eq("published", true);

  if (error || !data) {
    return [];
  }

  return data
    .map((item) => item.slug)
    .filter((slug): slug is string => Boolean(slug));
}

function formatDate(value: string | null) {
  if (!value) return "Updated for UK buyers";

  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function estimateMonthlyCost(price: number) {
  const deposit = price * 0.1;
  const principal = price - deposit;
  const monthlyRate = 0.069 / 12;
  const months = 48;
  const financePayment =
    (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
    (Math.pow(1 + monthlyRate, months) - 1);

  return Math.round(financePayment + 112);
}

function getReadTime(text: string) {
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(4, Math.ceil(wordCount / 180));
  return `${minutes} min read`;
}

function splitIntoParagraphs(content: string) {
  const clean = content.replace(/\s+/g, " ").trim();
  const sentences = clean
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  if (sentences.length === 0) {
    return [];
  }

  const paragraphSize = Math.max(2, Math.ceil(sentences.length / 4));
  const paragraphs: string[] = [];

  for (let index = 0; index < sentences.length; index += paragraphSize) {
    paragraphs.push(sentences.slice(index, index + paragraphSize).join(" "));
  }

  return paragraphs;
}

function getThemeKeywords(post: FeaturedBlogPost) {
  const text = `${post.title} ${post.excerpt ?? ""} ${post.content} ${(post.keywords ?? []).join(" ")} ${post.geoLocation ?? ""}`.toLowerCase();
  return {
    budget: /(budget|afford|under|cheap|value|used)/.test(text),
    range: /(range|motorway|distance|long|road trip)/.test(text),
    family: /(family|space|boot|kids|practical)/.test(text),
    charging: /(charge|charging|off-peak|home charger|public charger)/.test(text),
    performance: /(performance|fast|premium|luxury|tech)/.test(text),
  };
}

function getSeoTitle(post: FeaturedBlogPost) {
  return ensureGeoInText(post.metaTitle ?? post.title, normalizeGeoLocation(post.geoLocation));
}

function getSeoDescription(post: FeaturedBlogPost) {
  return ensureGeoInText(
    post.metaDescription ??
      post.excerpt ??
      "Premium EV buying guidance built to help readers compare, finance, and choose the right EV.",
    normalizeGeoLocation(post.geoLocation),
  );
}

function getArticleAuthor(post: FeaturedBlogPost) {
  return post.author?.trim() || ARTICLE_AUTHOR;
}

function getPublishedDate(post: FeaturedBlogPost) {
  return post.publishedAt ?? post.createdAt ?? new Date().toISOString();
}

function getKeywordList(post: FeaturedBlogPost) {
  const geoLocation = normalizeGeoLocation(post.geoLocation);
  const baseKeywords = normalizeKeywords(post.keywords);
  const geoKeywords = [
    `${geoLocation} EV guide`,
    `${geoLocation} electric car buying guide`,
    `${geoLocation} EV finance`,
  ];

  return Array.from(new Set([...baseKeywords, ...geoKeywords]));
}

function scoreRecommendation(post: FeaturedBlogPost, vehicleId: string) {
  const vehicle = evModels.find((candidate) => candidate.id === vehicleId);
  if (!vehicle) {
    return 0;
  }

  const flags = getThemeKeywords(post);
  let score = 68;

  if (flags.budget && vehicle.price <= 35000) score += 12;
  if (flags.range && vehicle.rangeKm >= 500) score += 12;
  if (flags.family && vehicle.bootLitres >= 440) score += 10;
  if (flags.charging && vehicle.fastChargeTime.includes("18")) score += 8;
  if (flags.performance && Number.parseFloat(vehicle.acceleration) <= 6.2) score += 8;
  if (vehicle.badge === "Best Value") score += 4;
  if (vehicle.badge === "Long Range") score += 4;

  return Math.min(96, score);
}

function buildRecommendationSummary(post: FeaturedBlogPost, vehicleId: string) {
  const vehicle = evModels.find((candidate) => candidate.id === vehicleId);
  if (!vehicle) {
    return "Strong all-rounder for UK buyers weighing range, running cost, and daily usability.";
  }

  const flags = getThemeKeywords(post);

  if (flags.budget && vehicle.price <= 35000) {
    return `Keeps entry cost under control while still delivering ${vehicle.rangeKm} km of quoted range and a strong everyday ownership story.`;
  }

  if (flags.range && vehicle.rangeKm >= 500) {
    return `Builds confidence for longer UK trips with ${vehicle.rangeKm} km range and charging that feels realistic for motorway use.`;
  }

  if (flags.family && vehicle.bootLitres >= 440) {
    return `Matches family practicality with ${vehicle.bootLitres} litres of boot space, five-seat usability, and finance-friendly appeal.`;
  }

  if (flags.charging) {
    return `Makes charging easier to live with thanks to ${vehicle.fastChargeTime} fast-charge capability and a mainstream CCS setup.`;
  }

  return `${vehicle.description} It stands out for UK buyers who want a clearer path from research into comparison and finance.`;
}

function pickVehicleIds(post: FeaturedBlogPost) {
  const flags = getThemeKeywords(post);

  if (flags.range) {
    return ["hyundai-ioniq-6", "kia-ev6", "tesla-model-3"];
  }

  if (flags.family) {
    return ["tesla-model-y", "byd-atto-3", "vw-id4"];
  }

  if (flags.budget) {
    return ["mg-4", "byd-dolphin", "hyundai-kona-electric"];
  }

  if (flags.performance) {
    return ["tesla-model-3", "byd-seal", "polestar-2"];
  }

  return ["tesla-model-3", "mg-4", "byd-atto-3"];
}

function buildInlineRecommendations(post: FeaturedBlogPost): InlineEVRecommendation[] {
  return pickVehicleIds(post)
    .map((vehicleId) => evModels.find((vehicle) => vehicle.id === vehicleId))
    .filter((vehicle): vehicle is NonNullable<typeof vehicle> => Boolean(vehicle))
    .map((vehicle) => ({
      model: vehicle,
      monthlyCost: estimateMonthlyCost(vehicle.price),
      dealScore: scoreRecommendation(post, vehicle.id),
      summary: buildRecommendationSummary(post, vehicle.id),
    }));
}

function buildArticleBlocks(post: FeaturedBlogPost): ArticleBlock[] {
  const paragraphs = splitIntoParagraphs(post.content);
  const recommendations = buildInlineRecommendations(post);
  const compareHref = `/compare?vehicles=${recommendations.map((item) => item.model.id).join(",")}`;
  const geoLocation = normalizeGeoLocation(post.geoLocation);
  const intro = ensureGeoInText(
    post.excerpt ?? paragraphs[0] ?? "Understand the EV trade-offs that matter before you buy.",
    geoLocation,
  );

  return [
    {
      type: "paragraph",
      id: "lead",
      content: intro,
      lead: true,
    },
    {
      type: "heading",
      id: "decision-framework",
      title: ensureGeoInText("What smart EV buyers should focus on first", geoLocation),
      eyebrow: "Buying guide",
    },
    {
      type: "paragraph",
      id: "body-1",
      content:
        paragraphs[0] ??
        `The best EV decision usually starts with usage, charging confidence, and monthly comfort rather than a badge alone ${geoSuffix(geoLocation)}.`,
    },
    {
      type: "paragraph",
      id: "body-2",
      content:
        paragraphs[1] ??
        "A stronger shortlist comes from balancing range, charging, warranty strength, and the kind of finance pressure you are happy to live with each month.",
    },
    {
      type: "list",
      id: "buyer-checklist",
      title: `Use this shortlist lens before you commit ${geoSuffix(geoLocation)}`,
      items: [
        "Work out whether your real weekly mileage needs everyday efficiency or long-range confidence.",
        "Check where charging will happen most often, because home and public charging create very different ownership experiences.",
        "Compare quoted range, charge speed, and warranty together instead of over-weighting one headline number.",
        "Pressure test monthly affordability early so a great EV does not become a bad finance decision later.",
      ],
    },
    {
      type: "insight",
      id: "why-this-matters",
      title: ensureGeoInText("Choosing the right EV is not just about price", geoLocation),
      content:
        "Range, charging friction, software quality, and monthly ownership cost all shape whether an EV still feels right after the first few weeks. Smart buyers compare the whole ownership system, not only the list price.",
    },
    {
      type: "evs",
      id: "inline-evs",
      title: ensureGeoInText("Three EVs worth putting on your shortlist", geoLocation),
      description:
        "These models align with the themes in this article and give readers a faster path into comparison, finance, and next-step decision making.",
      items: recommendations,
    },
    {
      type: "cta",
      id: "mid-article-cta",
      title: "Not sure which EV fits you?",
      description:
        "Answer a few quick questions and get a personalised shortlist based on your budget, charging setup, and real-world priorities.",
      primaryLabel: "Start AI Match",
      primaryHref: "/ai-match",
      secondaryLabel: "Explore EVs",
      secondaryHref: "/vehicles",
    },
    {
      type: "heading",
      id: "ownership-cost",
      title: ensureGeoInText("Where the monthly cost really changes the decision", geoLocation),
      eyebrow: "Ownership reality",
    },
    {
      type: "paragraph",
      id: "body-3",
      content:
        paragraphs[2] ??
        "Two EVs can look close on paper but feel very different once you account for deposit, APR, running cost, and how often you need to fast charge.",
    },
    {
      type: "paragraph",
      id: "body-4",
      content:
        paragraphs[3] ??
        `That is why the strongest content pages ${geoSuffix(geoLocation)} should not stop at advice. They should help buyers move directly into affordability checks and side-by-side trade-off decisions.`,
    },
    {
      type: "finance",
      id: "finance-cta",
      title: "Check if you can afford this EV",
      description:
        "Estimate monthly payment, running costs, and overall affordability in seconds so you can move from research into a more confident next step.",
      href: "/finance",
    },
    {
      type: "compare",
      id: "compare-cta",
      title: "Want to compare these EVs?",
      description:
        "See the shortlist side by side to understand how price, range, and charging speed trade off before you speak to a dealer.",
      compareHref,
      viewHref: "/compare",
    },
  ];
}

function toRelatedArticle(post: FeaturedBlogPost): RelatedArticleItem {
  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt ?? "EV buying guidance for UK drivers who want a smarter shortlist and clearer monthly cost.",
    readTime: getReadTime(post.content),
    image: post.coverImage,
    category: post.category ?? "Buying Guide",
  };
}

async function buildArticlePageModel(slug: string): Promise<ArticlePageModel | null> {
  const post = await getPost(slug);
  if (!post) {
    return null;
  }

  const related = (await getFeaturedBlogPosts(6))
    .filter((item) => item.slug && item.slug !== post.slug)
    .slice(0, 3)
    .map(toRelatedArticle);

  return {
    hero: {
      category: post.category ?? "Buying Guide",
      title: ensureGeoInText(post.title, normalizeGeoLocation(post.geoLocation)),
      subtitle: getSeoDescription(post),
      author: getArticleAuthor(post),
      readTime: getReadTime(post.content),
      publishedAt: formatDate(post.publishedAt),
      image:
        post.coverImage ??
        "https://images.unsplash.com/photo-1553440569-bcc63803a83d?auto=format&fit=crop&w=1400&q=80",
      geoLocation: normalizeGeoLocation(post.geoLocation),
    },
    blocks: buildArticleBlocks(post),
    relatedArticles: related,
    finalCta: {
      title: "Find your perfect EV today",
      description:
        "Use AI Match, compare your shortlist, and pressure-test affordability in one premium EV decision flow designed for UK buyers.",
      primaryLabel: "Start AI Match",
      primaryHref: "/ai-match",
      secondaryLabel: "Explore EVs",
      secondaryHref: "/vehicles",
    },
    sourcePost: post,
  };
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await buildArticlePageModel(slug);

  if (!page) {
    return {
      title: "Article not found | EVGuide.AI",
    };
  }

  return {
    metadataBase: new URL(getSiteUrl()),
    title: `${getSeoTitle(page.sourcePost)} | EVGuide.AI`,
    description: getSeoDescription(page.sourcePost),
    keywords: getKeywordList(page.sourcePost),
    alternates: {
      canonical: buildCanonicalUrl(page.sourcePost.slug),
      languages: {
        "en-GB": buildCanonicalUrl(page.sourcePost.slug),
      },
    },
    openGraph: {
      title: getSeoTitle(page.sourcePost),
      description: getSeoDescription(page.sourcePost),
      url: buildCanonicalUrl(page.sourcePost.slug),
      siteName: "EVGuide.AI",
      locale: "en_GB",
      images: page.hero.image ? [{ url: page.hero.image }] : undefined,
      type: "article",
      publishedTime: getPublishedDate(page.sourcePost),
      authors: [getArticleAuthor(page.sourcePost)],
    },
    twitter: {
      card: "summary_large_image",
      title: getSeoTitle(page.sourcePost),
      description: getSeoDescription(page.sourcePost),
      images: page.hero.image ? [page.hero.image] : undefined,
    },
  };
}

export async function generateStaticParams() {
  const slugs = await getAllPublishedSlugs();
  return slugs.map((slug) => ({ slug }));
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const page = await buildArticlePageModel(slug);

  if (!page) {
    notFound();
  }

  const canonicalUrl = buildCanonicalUrl(page.sourcePost.slug);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: getSeoTitle(page.sourcePost),
    description: getSeoDescription(page.sourcePost),
    image: page.hero.image,
    author: {
      "@type": "Person",
      name: getArticleAuthor(page.sourcePost),
    },
    publisher: {
      "@type": "Organization",
      name: PUBLISHER_NAME,
      logo: {
        "@type": "ImageObject",
        url: `${getSiteUrl().replace(/\/$/, "")}/favicon.ico`,
      },
    },
    datePublished: getPublishedDate(page.sourcePost),
    dateModified: getPublishedDate(page.sourcePost),
    mainEntityOfPage: canonicalUrl,
    keywords: getKeywordList(page.sourcePost).join(", "),
    contentLocation: normalizeGeoLocation(page.sourcePost.geoLocation),
  };

  return (
    <main className="min-h-screen bg-[#0B0B0B] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <PremiumNavbar />
      <ArticleHero hero={page.hero} />
      <ArticleContent blocks={page.blocks} />
      <RelatedArticles articles={page.relatedArticles} />
      <FinalCTA {...page.finalCta} />
      <PremiumFooter />
    </main>
  );
}
