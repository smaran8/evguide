export type EVNewsItem = {
  id: string;
  title: string;
  summary: string;
  source: string;
  category: string;
  image: string;
  url: string;
  publishedAt: string;
};

function inferCategory(text: string): string {
  const value = text.toLowerCase();

  if (value.includes("tesla")) return "Tesla";
  if (value.includes("byd")) return "BYD";
  if (value.includes("battery")) return "Battery";
  if (value.includes("charging") || value.includes("charger")) return "Charging";
  return "EV News";
}

function formatPublishedDate(dateString: string): string {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return "Recently";

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export async function getEvNews(): Promise<EVNewsItem[]> {
  const apiKey = process.env.GNEWS_API_KEY;

  if (!apiKey) {
    console.error("Missing GNEWS_API_KEY in .env.local");
    return [];
  }

  const query = encodeURIComponent("electric vehicle");
  const url = `https://gnews.io/api/v4/search?q=${query}&lang=en&max=10&apikey=${apiKey}`;

  try {
    const response = await fetch(url, {
      cache: "no-store",
    });

    const text = await response.text();

    if (!response.ok) {
      console.error("GNEWS ERROR:", text);
      return [];
    }

    const data = JSON.parse(text);

    if (!data.articles || !Array.isArray(data.articles)) {
      return [];
    }

    return data.articles.map((article: any, index: number) => {
      const combinedText = `${article.title ?? ""} ${article.description ?? ""}`;

      return {
        id: `${index}-${article.url ?? index}`,
        title: article.title ?? "Untitled article",
        summary: article.description ?? "No summary available.",
        source: article.source?.name ?? "Unknown source",
        category: inferCategory(combinedText),
        image:
          article.image ||
          "https://images.unsplash.com/photo-1553440569-bcc63803a83d?q=80&w=1200&auto=format&fit=crop",
        url: article.url || "",
        publishedAt: formatPublishedDate(article.publishedAt ?? ""),
      };
    });
  } catch (error) {
    console.error("NEWS FETCH ERROR:", error);
    return [];
  }
}