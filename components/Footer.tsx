import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <h3 className="text-xl font-bold text-slate-900">EV Guide</h3>
        <p className="mt-2 text-sm text-slate-600">
          EV news, comparisons, finance tools, and insights.
        </p>

        <div className="mt-6 flex flex-wrap gap-6 text-sm text-slate-600">
          <Link href="/">Home</Link>
          <Link href="/compare">Compare</Link>
          <Link href="/finance">Finance</Link>
          <Link href="/blog">Blog</Link>
          <Link href="/assistant">Consultation</Link>
          <Link href="/appointment">Reviews</Link>
          <Link href="/login">Sign In</Link>
          <Link href="/signup">Sign Up</Link>
        </div>

        <p className="mt-6 text-xs text-slate-400">
          © 2026 EV Guide
        </p>
      </div>
    </footer>
  );
}