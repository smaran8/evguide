import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-6 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-slate-900">
            EV Guide
          </Link>
          
          <div className="flex items-center space-x-6">
            <Link href="/" className="text-slate-600 hover:text-slate-900">
              Home
            </Link>
            <Link href="/compare" className="text-slate-600 hover:text-slate-900">
              Compare
            </Link>
            <Link href="/finance" className="text-slate-600 hover:text-slate-900">
              Finance
            </Link>
            <Link href="/assistant" className="text-slate-600 hover:text-slate-900">
              Assistant
            </Link>
            <Link href="/login" className="text-slate-600 hover:text-slate-900">
              Login
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}