import type { ContentBlock, FaqItem } from "@/lib/seo";

// ─── Block renderers ──────────────────────────────────────────────────────────

function HeroBlock({ block }: { block: ContentBlock }) {
  return (
    <div className="mb-8 text-center">
      {block.badge && (
        <span className="mb-3 inline-block rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
          {block.badge}
        </span>
      )}
      {block.heading && (
        <h1 className="text-3xl font-bold text-slate-900 md:text-4xl">{block.heading}</h1>
      )}
      {block.subheading && (
        <p className="mt-3 text-lg text-slate-500">{block.subheading}</p>
      )}
    </div>
  );
}

function TextBlock({ block }: { block: ContentBlock }) {
  return (
    <div className="mb-8 rounded-2xl border border-slate-100 bg-white p-6">
      {block.heading && (
        <h2 className="mb-3 text-xl font-semibold text-slate-900">{block.heading}</h2>
      )}
      {block.body && <p className="text-slate-600 leading-relaxed">{block.body}</p>}
    </div>
  );
}

function FeaturesBlock({ block }: { block: ContentBlock }) {
  if (!block.items?.length) return null;
  return (
    <div className="mb-8">
      {block.heading && (
        <h2 className="mb-4 text-xl font-semibold text-slate-900">{block.heading}</h2>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {block.items.map((item, i) => (
          <div key={i} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="font-semibold text-slate-900">{item.label}</p>
            {item.description && (
              <p className="mt-1 text-sm text-slate-500">{item.description}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatsBlock({ block }: { block: ContentBlock }) {
  if (!block.items?.length) return null;
  return (
    <div className="mb-8">
      {block.heading && (
        <h2 className="mb-4 text-xl font-semibold text-slate-900">{block.heading}</h2>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {block.items.map((item, i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-100 bg-white p-5 text-center shadow-sm"
          >
            {item.value && (
              <p className="text-3xl font-bold text-emerald-600">{item.value}</p>
            )}
            <p className="mt-1 text-sm text-slate-600">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CtaBlock({ block }: { block: ContentBlock }) {
  return (
    <div className="mb-8 rounded-2xl bg-emerald-600 p-8 text-center text-white">
      {block.heading && (
        <h2 className="text-2xl font-bold">{block.heading}</h2>
      )}
      {block.body && <p className="mt-2 text-emerald-100">{block.body}</p>}
      {block.href && block.label && (
        <a
          href={block.href}
          className="mt-5 inline-block rounded-xl bg-white px-6 py-3 text-sm font-bold text-emerald-700 hover:bg-emerald-50"
        >
          {block.label}
        </a>
      )}
    </div>
  );
}

function FaqBlock({ block }: { block: ContentBlock }) {
  if (!block.items?.length) return null;
  return (
    <div className="mb-8">
      {block.heading && (
        <h2 className="mb-5 text-xl font-semibold text-slate-900">{block.heading}</h2>
      )}
      <div className="space-y-3">
        {block.items.map((item, i) => (
          <details
            key={i}
            className="group rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm"
          >
            <summary className="cursor-pointer list-none font-medium text-slate-900 group-open:text-emerald-700">
              {item.question}
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.answer}</p>
          </details>
        ))}
      </div>
    </div>
  );
}

// ─── Schema.org JSON-LD for FAQ ───────────────────────────────────────────────

export function FaqJsonLd({ items }: { items: FaqItem[] }) {
  if (!items.length) return null;

  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// ─── Main renderer ────────────────────────────────────────────────────────────

export default function DynamicContentBlocks({
  blocks,
  faqSchema,
}: {
  blocks: ContentBlock[];
  faqSchema?: FaqItem[];
}) {
  if (!blocks.length && !faqSchema?.length) return null;

  return (
    <>
      {faqSchema && faqSchema.length > 0 && <FaqJsonLd items={faqSchema} />}

      {blocks.map((block, i) => {
        switch (block.type) {
          case "hero":     return <HeroBlock key={i} block={block} />;
          case "text":     return <TextBlock key={i} block={block} />;
          case "features": return <FeaturesBlock key={i} block={block} />;
          case "stats":    return <StatsBlock key={i} block={block} />;
          case "cta":      return <CtaBlock key={i} block={block} />;
          case "faq":      return <FaqBlock key={i} block={block} />;
          default:         return null;
        }
      })}
    </>
  );
}
