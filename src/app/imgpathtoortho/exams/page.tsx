import ImgExamsPageClient from "./examspageclient";

export const metadata = {
  title: "Exams & ECFMG | SnapOrtho",
  description:
    "IMG Path to Ortho Step 2: understand the USMLE stack (Step 1, Step 2 CK, Step 3) and high-level ECFMG certification timing for orthopaedic residency.",
  keywords: [
    "orthopaedics",
    "education",
    "SnapOrtho",
    "IMG",
    "international medical graduate",
    "IMG orthopaedic residency",
    "USMLE",
    "Step 1",
    "Step 2 CK",
    "Step 3",
    "ECFMG",
    "ECFMG certification",
    "visa requirements",
    "NRMP",
    "ERAS",
  ],
  openGraph: {
    title: "Exams & ECFMG | SnapOrtho",
    description:
      "USMLE essentials and high-level ECFMG certification timing for IMGs pursuing US Orthopaedic Surgery residency.",
    url: "https://snap-ortho.com/imgpathtoortho/exams",
    siteName: "SnapOrtho",
    images: [
      {
        url: "https://snap-ortho.com/og-image-img-exams.png",
        width: 1200,
        height: 630,
        alt: "SnapOrtho IMG Exams & ECFMG OG Image",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "IMG Exams & ECFMG | SnapOrtho",
    description:
      "Step 1 baseline, Step 2 CK differentiator, Step 3 strategic—plus high-level ECFMG timing for your target cycle.",
    images: ["https://snap-ortho.com/og-image-img-exams.png"],
  },
};

export default function Page() {
  return <ImgExamsPageClient />; // ✅ render the client component
}
