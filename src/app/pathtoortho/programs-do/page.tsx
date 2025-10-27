import DoProgramsPageClient from "./doprogramspageclient";

export const metadata = {
  title: "DO Ortho Programs | SnapOrtho",
  description: "A Database to Help Choose Audition Rotations as a DO",
  keywords: [
    "orthopaedics",
    "education",
    "SnapOrtho",
    "away rotations",
    "audition rotations",
    "sub-i rotations",
    "VSLO",
    "letters of recommendation",
    "residency applications",
    "osteopathic",
    "historically DO",
  ],
  openGraph: {
    title: "DO Ortho Programs | SnapOrtho",
    description: "How to Choose Audition Rotations as a DO: Database of Historically DO-Friendly Programs",
    url: "https://snap-ortho.com/pathtoortho/programs-do",
    siteName: "SnapOrtho",
    images: [
      {
        url: "https://snap-ortho.com/og-image-programs-do.png",
        width: 1200,
        height: 630,
        alt: "SnapOrtho DO Ortho Programs OG Image",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DO Ortho Programs",
    description: "Planning your audition rotations? Explore our database of historically DO-friendly programs to make smarter, data-driven choices this application cycle.",
    images: ["https://snap-ortho.com/og-image-programs-do.png"],
  },
};

export default function Page() {
  return <DoProgramsPageClient />; // ✅ render the client component
}
