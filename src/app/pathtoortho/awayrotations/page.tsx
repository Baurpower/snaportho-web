import AwayRotationsPageClient from "./awayrotationspageclient";

export const metadata = {
  title: "Away Rotations",
  description: "How to excel on orthopaedic away rotations: VSLO timing, on-service habits, LOR strategy, and what to bring.",
  alternates: {
    canonical: "/pathtoortho/awayrotations",
  },
  keywords: [
    "orthopaedics",
    "education",
    "SnapOrtho",
    "away rotations",
    "VSLO",
    "letters of recommendation",
    "residency applications",
    "medical student resources",
  ],
  openGraph: {
    title: "Away Rotations",
    description: "Your guide to excelling on orthopaedic away rotations.",
    url: "https://snap-ortho.com/pathtoortho/awayrotations",
    siteName: "SnapOrtho",
    images: [
      {
        url: "https://snap-ortho.com/og-image-away-rotations.png",
        width: 1200,
        height: 630,
        alt: "SnapOrtho Away Rotations OG Image",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Away Rotations Guide",
    description: "VSLO timing, on-service success, and LOR strategy for ortho away rotations.",
    images: ["https://snap-ortho.com/og-image-away-rotations.png"],
  },
};

export default function Page() {
  return <AwayRotationsPageClient />; // ✅ render the client component
}
