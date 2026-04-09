import { createPublicServerClient } from "@/lib/supabase/public-server";

export type FeaturedBlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  category: string | null;
  coverImage: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  keywords?: string[] | null;
  geoLocation?: string | null;
  author?: string | null;
  createdAt?: string | null;
  publishedAt: string | null;
  isDummy?: boolean;
};

type RawBlogRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  category: string | null;
  cover_image: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  keywords?: string[] | null;
  geo_location?: string | null;
  author?: string | null;
  created_at?: string | null;
  published_at: string | null;
};

const BLOG_SELECT_FULL =
  "id, slug, title, excerpt, content, category, cover_image, meta_title, meta_description, keywords, geo_location, author, created_at, published_at";
const BLOG_SELECT_LEGACY =
  "id, slug, title, excerpt, content, category, cover_image, published_at";

function isMissingColumnError(message: string | undefined) {
  return typeof message === "string" && message.includes("column blog_posts.");
}

function mapBlogRow(item: RawBlogRow): FeaturedBlogPost {
  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    excerpt: item.excerpt,
    content: item.content,
    category: item.category,
    coverImage: item.cover_image,
    metaTitle: item.meta_title ?? null,
    metaDescription: item.meta_description ?? null,
    keywords: item.keywords ?? null,
    geoLocation: item.geo_location ?? null,
    author: item.author ?? null,
    createdAt: item.created_at ?? null,
    publishedAt: item.published_at,
  };
}

const DUMMY_BLOG_POSTS: FeaturedBlogPost[] = [
  {
    id: "dummy-blog-1",
    slug: "",
    title: "First EV purchase guide: what to check before you pay booking money",
    excerpt: "A clear buyer framework for range, charging access, cost control, and resale confidence.",
    content:
      "If this is your first EV, do not start with brand hype. Start with your week. Note your daily commute, weekend usage, and one long monthly trip. That gives you a realistic range target. Then decide your main charging location. Home charging usually wins on cost and convenience, but only if your parking and electrical setup are practical. If home charging is difficult, map dependable public stations near your route and check real user reliability, not only charger count. Next, compare efficiency, not only battery size. A bigger battery may look better on paper, but an efficient model often delivers stronger real-world value. Review battery warranty years, capacity retention terms, service support, and software update policy. During test drive, focus on visibility, ride comfort, turning ease, and regen behavior in traffic because these affect daily satisfaction more than acceleration numbers. Finally, compare total ownership cost across three years, including charging, insurance, service, financing, and resale. A smart EV decision is less about the loudest launch and more about fit, predictability, and confidence after purchase.",
    category: "EVs",
    coverImage:
      "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?q=80&w=1400&auto=format&fit=crop",
    metaTitle: "First EV purchase guide for UK buyers",
    metaDescription: "A practical UK EV buying guide covering range, charging, finance, and resale confidence.",
    keywords: ["first EV", "UK EV buying guide", "EV finance", "EV charging"],
    geoLocation: "UK",
    author: "EVGuide AI Editorial",
    createdAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    isDummy: true,
  },
  {
    id: "dummy-blog-2",
    slug: "",
    title: "How to cut EV charging bills with simple weekly habits",
    excerpt: "Practical charging decisions that lower monthly cost without changing your lifestyle.",
    content:
      "You do not need complex apps to save money on EV charging. Start with timing. If your utility gives off-peak rates, schedule charging overnight and avoid random daytime top-ups. That one habit alone can significantly reduce monthly cost. Next, stop charging to one hundred percent every day unless you need full range for a long trip. Most routines work better with moderate charging windows. Keep tire pressure accurate because low pressure quietly increases energy use. Pre-cool or pre-heat the cabin while plugged in so grid power handles comfort before you start driving. For public charging, compare real effective cost by checking waiting time, reliability, idle fees, and app pricing differences. Fast charging is great for urgency, but slower destination charging can be cheaper when you already plan to park. Finally, track your cost per kilometer once a month. Numbers create discipline. After two months, you will see clear patterns and can optimize quickly without changing where you drive.",
    category: "Charging",
    coverImage:
      "https://images.unsplash.com/photo-1593941707874-ef25b8b4a92b?q=80&w=1400&auto=format&fit=crop",
    metaTitle: "How to cut EV charging bills in the UK",
    metaDescription: "Reduce EV charging costs with smarter timing, off-peak habits, and practical public charging choices.",
    keywords: ["EV charging UK", "off-peak EV charging", "EV running costs"],
    geoLocation: "UK",
    author: "EVGuide AI Editorial",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    publishedAt: new Date(Date.now() - 86400000).toISOString(),
    isDummy: true,
  },
  {
    id: "dummy-blog-3",
    slug: "",
    title: "Real-world EV range explained: why your numbers differ from brochure claims",
    excerpt: "Weather, speed, route type, and load all change range, and that is normal.",
    content:
      "Official EV range is useful for comparison, but real driving conditions always shift the outcome. Cold weather can lower efficiency because the battery and cabin need more energy. High motorway speed also cuts range due to aerodynamic drag. In city traffic, regenerative braking can recover energy, but aggressive acceleration still raises consumption. Elevation, road quality, tire pressure, passenger load, and heavy AC usage all influence real numbers. This does not mean the vehicle is bad. It means range is contextual. The smart approach is to match EV efficiency to your own route pattern. Test drive on roads similar to your daily routine, then compare consumption trends instead of one advertised figure. Build a practical range buffer for long routes and seasonal weather changes. When expectations are realistic, ownership becomes easier, charging feels predictable, and buyers make stronger decisions with less stress.",
    category: "Updated Features",
    coverImage:
      "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=1400&auto=format&fit=crop",
    metaTitle: "Real-world EV range explained for UK drivers",
    metaDescription: "Understand why official EV range differs from real-world UK driving and what matters before you buy.",
    keywords: ["EV range UK", "real-world EV range", "EV buying advice"],
    geoLocation: "UK",
    author: "EVGuide AI Editorial",
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    publishedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    isDummy: true,
  },
  {
    id: "dummy-blog-4",
    slug: "",
    title: "Used EV checklist: battery health checks that actually matter",
    excerpt: "How to inspect a used EV with confidence before final payment.",
    content:
      "A used EV can be a great deal when inspection is disciplined. Start with full service and software history. Consistent records usually mean responsible ownership. Ask for battery health details if available, and compare expected range against age and mileage. During a drive, test mixed roads and watch efficiency behavior instead of one instant reading. Check AC and fast charging once if possible to confirm stable charging performance. Inspect warning lights, infotainment response, tire wear pattern, and suspension comfort on rough surfaces. Verify battery warranty transfer and remaining coverage because warranty strength reduces purchase risk more than cosmetic condition. Finally, compare total price with a new EV after incentives and finance terms. The best used EV is the one with clear history, stable battery behavior, and predictable monthly ownership cost.",
    category: "EVs",
    coverImage:
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1400&auto=format&fit=crop",
    metaTitle: "Used EV checklist for UK buyers",
    metaDescription: "A used EV inspection checklist covering battery health, warranty, charging, and ownership costs.",
    keywords: ["used EV UK", "used EV checklist", "battery health EV"],
    geoLocation: "UK",
    author: "EVGuide AI Editorial",
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    publishedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    isDummy: true,
  },
];

async function getFeaturedBlogRows(limit: number) {
  const supabase = createPublicServerClient();

  if (!supabase) {
    return { data: [], usedLegacySelect: false };
  }

  const fullQuery = await supabase
    .from("blog_posts")
    .select(BLOG_SELECT_FULL)
    .eq("published", true)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (!fullQuery.error) {
    return { data: (fullQuery.data as RawBlogRow[]) ?? [], usedLegacySelect: false };
  }

  if (!isMissingColumnError(fullQuery.error.message)) {
    console.error("Error fetching featured blog posts:", fullQuery.error.message);
    return { data: [], usedLegacySelect: false };
  }

  const legacyQuery = await supabase
    .from("blog_posts")
    .select(BLOG_SELECT_LEGACY)
    .eq("published", true)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (legacyQuery.error) {
    console.error("Error fetching featured blog posts:", legacyQuery.error.message);
    return { data: [], usedLegacySelect: true };
  }

  return { data: (legacyQuery.data as RawBlogRow[]) ?? [], usedLegacySelect: true };
}

export async function getFeaturedBlogPosts(limit = 4): Promise<FeaturedBlogPost[]> {
  const { data, usedLegacySelect } = await getFeaturedBlogRows(limit);

  if (data.length === 0) {
    return DUMMY_BLOG_POSTS.slice(0, limit);
  }

  const posts = data.map(mapBlogRow);

  if (usedLegacySelect || posts.length >= limit) {
    return posts;
  }

  const padded = [...posts];
  for (const dummy of DUMMY_BLOG_POSTS) {
    if (padded.length >= limit) break;
    padded.push(dummy);
  }

  return padded;
}
