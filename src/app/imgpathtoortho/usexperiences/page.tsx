import ImgUSExperiencesPageClient from "./usexperiencespageclient";

export const metadata = {
  title: "US Experiences & Letters | SnapOrtho",
  description:
    "IMG Path to Ortho Step 4: secure meaningful US experiences (research + clinical exposure), earn strong US orthopaedic letters of recommendation, and avoid common professionalism pitfalls.",
  keywords: [
    "orthopaedics",
    "education",
    "SnapOrtho",
    "IMG",
    "international medical graduate",
    "IMG orthopaedic residency",
    "US clinical experience",
    "observership",
    "US electives",
    "research fellowship",
    "orthopaedic research",
    "letters of recommendation",
    "LOR",
    "visa requirements",
    "ERAS",
    "NRMP",
  ],
  openGraph: {
    title: "US Experiences & Letters | SnapOrtho",
    description:
      "A practical guide for IMGs to secure US research and clinical exposure, earn strong letters, and build credibility for US Orthopaedic Surgery residency.",
    url: "https://snap-ortho.com/imgpathtoortho/usexperiences",
    siteName: "SnapOrtho",
    images: [
      {
        url: "https://snap-ortho.com/og-image-img-usexperiences.png",
        width: 1200,
        height: 630,
        alt: "SnapOrtho IMG US Experiences OG Image",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "IMG US Experiences & Letters | SnapOrtho",
    description:
      "What US exposure counts, how IMGs earn strong ortho letters, and why research fellowships are the most common bridge.",
    images: ["https://snap-ortho.com/og-image-img-usexperiences.png"],
  },
};

export default function Page() {
  return <ImgUSExperiencesPageClient />; // ✅ render the client component
}
