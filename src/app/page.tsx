// src/app/page.tsx
import type { Metadata } from "next";
import HomePageClient from "./homepageclient";

export const metadata: Metadata = {
  title: "SnapOrtho",
  description:
    "Free orthopaedic education for medical students and residents — master fracture conference, prep cases smarter, and build confidence in orthopaedics.",
  alternates: { canonical: "https://snap-ortho.com/" },
  openGraph: {
    title: "SnapOrtho",
    description:
      "Free orthopaedic education for medical students and residents — master fracture conference, prep cases smarter, and build confidence in orthopaedics.",
    url: "https://snap-ortho.com/",
    siteName: "SnapOrtho",
    images: [{ url: "/og-home.png", width: 1200, height: 630, alt: "SnapOrtho" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SnapOrtho",
    description:
      "Free orthopaedic education for medical students and residents — master fracture conference, prep cases smarter, and build confidence in orthopaedics.",
    images: ["/og-home.png"],
  },
};

export default function Page() {
  return <HomePageClient />;
}