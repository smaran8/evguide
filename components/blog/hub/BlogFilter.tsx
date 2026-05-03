import type { BlogCategory } from "./types";

interface BlogFilterProps {
  categories: readonly BlogCategory[];
  activeCategory: BlogCategory;
  onCategoryChange: (value: BlogCategory) => void;
}

export default function BlogFilter({
  categories,
  activeCategory,
  onCategoryChange,
}: BlogFilterProps) {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="inline-flex w-full flex-wrap gap-3 rounded-[2rem] border border-white/10 bg-white/[0.06] p-3 shadow-[0_20px_50px_rgba(0,0,0,0.18)] backdrop-blur-xl">
        {categories.map((category) => {
          const active = activeCategory === category;

          return (
            <button
              key={category}
              type="button"
              onClick={() => onCategoryChange(category)}
              className={`rounded-full px-4 py-2.5 text-sm font-medium transition duration-300 ${
                active
                  ? "bg-white text-black shadow-[0_10px_24px_rgba(255,255,255,0.12)]"
                  : "text-zinc-400 hover:bg-white/[0.05] hover:text-white"
              }`}
            >
              {category}
            </button>
          );
        })}
      </div>
    </div>
  );
}
