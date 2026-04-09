import type { Metadata } from "next";
import "./globals.css";
import BookTestDriveWidget from "@/components/BookTestDriveWidget";
import CookieBanner from "@/components/legal/CookieBanner";
import TrackEngagement from "@/components/tracking/TrackEngagement";
import TrackPageView from "@/components/tracking/TrackPageView";
import TrackRepeatVisit from "@/components/tracking/TrackRepeatVisit";

export const metadata: Metadata = {
  title: "EVGuide AI",
  description: "AI-powered EV research, comparison, and affordability tools for UK buyers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        <TrackPageView />
        <TrackEngagement />
        <TrackRepeatVisit />
        {children}
        <BookTestDriveWidget />
        <CookieBanner />
      </body>
    </html>
  );
}
