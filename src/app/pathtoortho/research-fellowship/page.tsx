import ResearchYearPageClient from "./researchpageclient";

export const metadata = {
  title: "Ortho Research Year",
  description:
    "A practical guide to orthopaedic research fellowships: what a research year is, who should do one, where to go, and how to apply.",
  keywords: [
    "orthopaedics",
    "orthopaedic surgery",
    "education",
    "SnapOrtho",
    "research year",
    "research fellowship",
    "orthopaedic research fellowship",
    "unmatched ortho",
    "match ortho",
    "medical student resources",
    "research productivity",
    "OrthoGate",
  ],
  openGraph: {
    title: "Ortho Research Year",
    description:
      "Everything you need to know about an orthopaedic research year: how it works, who should do it, where to do it, and how to apply.",
    url: "https://snap-ortho.com/pathtoortho/research-fellowship",
    siteName: "SnapOrtho",
    images: [
      {
        url: "https://snap-ortho.com/og-image-research-fellowship.png",
        width: 1200,
        height: 630,
        alt: "SnapOrtho Research Year OG Image",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ortho Research Year Guide",
    description:
      "Your guide to orthopaedic research fellowships: what it is, whether to do it, where to go, and how to apply.",
    images: ["https://snap-ortho.com/og-image-research-fellowship.png"],
  },
};

export default function Page() {
  return <ResearchYearPageClient />; // ✅ render the client component
}
