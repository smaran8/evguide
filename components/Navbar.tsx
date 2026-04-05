"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const NAV_LINKS = [
  { href: "/vehicles", label: "All Vehicles" },
  { href: "/assistant", label: "Consultation" },
];

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadAuth() {
      try {
        const { data } = await supabase.auth.getUser();
        if (mounted) setIsLoggedIn(Boolean(data.user));
      } catch {
        if (mounted) setIsLoggedIn(false);
      } finally {
        if (mounted) setAuthLoading(false);
      }
    }

    loadAuth();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(Boolean(session?.user));
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setMenuOpen(false);
    setProfileOpen(false);
    router.push("/");
    router.refresh();
  }

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <nav
      className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled || menuOpen
          ? "border-b border-slate-200/80 bg-white/90 shadow-sm shadow-slate-200/60 backdrop-blur-xl"
          : "border-b border-slate-100/60 bg-white/80 backdrop-blur-md"
      }`}
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex h-16 items-center justify-between">

          {/* Logo */}
          <Link
            href="/"
            onClick={() => setMenuOpen(false)}
            className="group flex items-center gap-2.5"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white transition-transform duration-200 group-hover:scale-110">
              EV
            </span>
            <span className="text-lg font-semibold tracking-tight text-slate-900 transition-colors duration-200 group-hover:text-blue-600">
              Guide
            </span>
          </Link>

          {/* Desktop nav — centered */}
          <nav aria-label="Primary" className="hidden md:block">
            <ul className="flex items-center gap-1">
              {NAV_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className={`relative rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
                      isActive(href)
                        ? "bg-blue-50 text-blue-600"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    {label}
                    {isActive(href) && (
                      <span className="absolute bottom-1 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-blue-500" />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Right — CTAs + auth */}
          <div className="hidden items-center gap-2.5 md:flex">
            <Link
              href="/compare"
              className="inline-flex h-10 items-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-px hover:bg-blue-700 hover:shadow-md active:translate-y-0"
            >
              Compare EVs
            </Link>
            <Link
              href="/finance"
              className="inline-flex h-10 items-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-px hover:bg-blue-700 hover:shadow-md active:translate-y-0"
            >
              Check EMI
            </Link>

            {!authLoading && isLoggedIn ? (
              <div className="relative" ref={profileRef}>
                <button
                  type="button"
                  aria-label="Account menu"
                  onClick={() => setProfileOpen((o) => !o)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-sm font-semibold text-white transition-all duration-200 hover:bg-slate-700 hover:shadow-md"
                >
                  {/* User silhouette icon */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-5 w-5"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-slate-200 bg-white py-1.5 shadow-xl shadow-slate-200/60">
                    <div className="border-t border-slate-100" />
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full px-4 py-2.5 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : !authLoading ? (
              <Link
                href="/login"
                className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-px hover:border-slate-300 hover:shadow-md active:translate-y-0"
              >
                Sign In
              </Link>
            ) : null}
          </div>

          {/* Mobile: Sign up/out + hamburger */}
          <div className="flex items-center gap-2 md:hidden">
            {!authLoading && !isLoggedIn ? (
              <Link
                href="/signup"
                onClick={() => setMenuOpen(false)}
                className="inline-flex h-9 items-center rounded-xl bg-blue-600 px-3.5 text-sm font-semibold text-white"
              >
                Sign Up
              </Link>
            ) : !authLoading ? (
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex h-9 items-center rounded-xl bg-slate-900 px-3.5 text-sm font-semibold text-white"
              >
                Sign Out
              </button>
            ) : null}

            <button
              type="button"
              aria-label="Toggle navigation menu"
              onClick={() => setMenuOpen((o) => !o)}
              className="flex h-9 w-9 flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white"
            >
              <span
                className={`block h-0.5 w-5 rounded-full bg-slate-700 transition-transform duration-300 ${
                  menuOpen ? "translate-y-2 rotate-45" : ""
                }`}
              />
              <span
                className={`block h-0.5 w-5 rounded-full bg-slate-700 transition-opacity duration-300 ${
                  menuOpen ? "opacity-0" : ""
                }`}
              />
              <span
                className={`block h-0.5 w-5 rounded-full bg-slate-700 transition-transform duration-300 ${
                  menuOpen ? "-translate-y-2 -rotate-45" : ""
                }`}
              />
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="border-t border-slate-100 py-3 md:hidden">
            <ul className="flex flex-col gap-0.5">
              {NAV_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setMenuOpen(false)}
                    className={`block rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                      isActive(href)
                        ? "bg-blue-50 text-blue-600"
                        : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
              <Link
                href="/compare"
                onClick={() => setMenuOpen(false)}
                className="rounded-xl bg-blue-600 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                Compare EVs
              </Link>
              <Link
                href="/finance"
                onClick={() => setMenuOpen(false)}
                className="rounded-xl bg-blue-600 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                Check EMI
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}