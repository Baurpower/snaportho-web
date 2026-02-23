import type { Metadata } from "next";
import PathToOrthoPageClient from "./pathtoorthopageclient";

export const metadata: Metadata = {
  title: "Path to Ortho",
  description:
    "A step-by-step guide through the orthopaedic surgery match. Modules on away rotations, ERAS, interviews, research fellowships, and more.",
  alternates: {
    canonical: "/pathtoortho",
  },
  keywords: [
    "orthopaedic surgery match",
    "orthopaedics",
    "SnapOrtho",
    "away rotations",
    "VSLO",
    "ERAS",
    "orthopaedic interviews",
    "eSLOR",
    "residency applications",
    "medical student resources",
    "DO orthopaedics",
    "orthopaedic research fellowship",
  ],
  openGraph: {
    title: "Path to Ortho | SnapOrtho",
    description:
      "A step-by-step roadmap for the orthopaedic surgery match: away rotations, ERAS, interviews, and more.",
    url: "/pathtoortho",
    siteName: "SnapOrtho",
    images: [
      {
        url: "/og-image-pathtoortho.png",
        width: 1200,
        height: 630,
        alt: "SnapOrtho Path to Ortho",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Path to Ortho | SnapOrtho",
    description:
      "Your step-by-step roadmap for the ortho match: away rotations, ERAS, interviews, and more.",
    images: ["/og-image-pathtoortho.png"],
  },
};

export default function Page() {
  return <PathToOrthoPageClient />;
}