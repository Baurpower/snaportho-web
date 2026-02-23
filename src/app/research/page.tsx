import ResearchPageClient from "./researchpageclient";

export const metadata = {
  title: "Research 101 | SnapOrtho",
  description:
    "A strategic guide to orthopaedic research for medical students: why it matters, when to start, how to find projects, and how to excel.",
    alternates: {
    canonical: "/research",
  },
  keywords: [
    "orthopaedics",
    "SnapOrtho",
    "research",
    "medical student",
    "orthopaedic residency",
    "ERAS",
    "research mentorship",
    "how to find research",
    "systematic review",
    "database study",
  ],
  openGraph: {
    title: "Research 101",
    description:
      "Your roadmap to orthopaedic research: build momentum, find mentors, and execute.",
    url: "https://snap-ortho.com/research",
    siteName: "SnapOrtho",
    images: [
      {
        url: "https://snap-ortho.com/og-image-research-101.png",
        width: 1200,
        height: 630,
        alt: "SnapOrtho Research 101 OG Image",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Research 101",
    description:
      "Why research matters, when to start, how to find projects, and how to excel.",
    images: ["https://snap-ortho.com/og-image-research-101.png"],
  },
};

export default function Page() {
  return <ResearchPageClient />;
}