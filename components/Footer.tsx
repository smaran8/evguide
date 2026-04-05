"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function Footer() {
  const supabase = useMemo(() => createClient(), []);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadAuth() {
      try {
        const { data } = await supabase.auth.getUser();
        if (mounted) {
          setIsLoggedIn(Boolean(data.user));
        }
      } catch {
        if (mounted) {
          setIsLoggedIn(false);
        }
      }
    }

    loadAuth();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(Boolean(session?.user));
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

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
          <Link href="/appointment">Reviews</Link>
          {!isLoggedIn ? <Link href="/login">Sign In</Link> : null}
          {!isLoggedIn ? <Link href="/signup">Sign Up</Link> : null}
        </div>

        <p className="mt-6 text-xs text-slate-400">
          © 2026 EV Guide
        </p>
      </div>
    </footer>
  );
}