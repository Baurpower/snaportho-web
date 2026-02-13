import ImgTimelinePageClient from "./timelinepageclient";

export const metadata = {
  title: "Define Your Starting Point & Timeline | SnapOrtho",
  description:
    "IMG Path to Ortho timeline planning: define your starting point, set a realistic 12–36 month plan, and understand the key signals your application must prove.",
  keywords: [
    "orthopaedics",
    "education",
    "SnapOrtho",
    "IMG",
    "international medical graduate",
    "IMG orthopaedic residency",
    "timeline planning",
    "ECFMG",
    "Step 2",
    "US research",
    "letters of recommendation",
    "visa requirements",
    "NRMP",
    "ERAS",
  ],
  openGraph: {
    title: "Define Your Starting Point & Timeline | SnapOrtho",
    description:
      "A realistic timeline and starting-point guide for IMGs pursuing US Orthopaedic Surgery residency.",
    url: "https://snap-ortho.com/imgpathtoortho/timeline",
    siteName: "SnapOrtho",
    images: [
      {
        url: "https://snap-ortho.com/og-image-img-timeline.png",
        width: 1200,
        height: 630,
        alt: "SnapOrtho IMG Timeline OG Image",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "IMG Timeline Planning | SnapOrtho",
    description:
      "Define your starting point, choose a realistic timeline, and build the signals IMGs need for US Ortho.",
    images: ["https://snap-ortho.com/og-image-img-timeline.png"],
  },
};

export default function Page() {
  return <ImgTimelinePageClient />; // ✅ render the client component
}
