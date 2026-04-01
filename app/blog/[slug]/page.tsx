type BlogPostPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;

  const title = slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <p className="text-sm font-semibold text-blue-600">Blog Article</p>
        <h1 className="mt-2 text-4xl font-bold text-slate-900">{title}</h1>
        <p className="mt-4 text-slate-600">
          This is your dynamic blog page. Later we will connect real blog content here
          for SEO and traffic growth.
        </p>
      </div>
    </main>
  );
}