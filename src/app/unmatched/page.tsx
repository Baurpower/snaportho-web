import type { Metadata } from "next";
import UnmatchedPageClient from "./unmatchedpageclient";

export const metadata: Metadata = {
  title: "Unmatched",
  description:
    "Guidance for orthopaedic surgery applicants who did not match. Explore whether to reapply, pursue a research year, or SOAP into a categorical/1-year position through an interactive decision guide.",
  alternates: {
    canonical: "/unmatched",
  },
  keywords: [
    "unmatched orthopaedics",
    "orthopaedic surgery unmatched",
    "reapply orthopaedics",
    "SOAP orthopaedics",
    "orthopaedic research year",
    "prelim surgery year",
    "orthopaedic match guidance",
    "SnapOrtho",
    "orthopaedic residency match",
    "medical student unmatched",
    "orthopaedic reapplicant",
  ],
  openGraph: {
    title: "Unmatched | SnapOrtho",
    description:
      "An interactive guide for orthopaedic applicants navigating the difficult decisions after not matching.",
    url: "/unmatched",
    siteName: "SnapOrtho",
    images: [
      {
        url: "/og-image-unmatched.png",
        width: 1200,
        height: 630,
        alt: "SnapOrtho Unmatched",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Unmatched | SnapOrtho",
    description:
      "An interactive guide for orthopaedic applicants deciding whether to reapply, SOAP, or pursue a research year.",
    images: ["/og-image-unmatched.png"],
  },
};

export default function Page() {
  return <UnmatchedPageClient />;
}