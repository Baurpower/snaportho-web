import type { Metadata } from "next";
import SoapPageClient from "./soappageclient";

export const metadata: Metadata = {
  title: "SOAP",
  description:
    "Guidance for orthopaedic surgery applicants navigating SOAP after not matching. Explore one-year positions, categorical options, and next-step strategy through an interactive decision guide.",
  alternates: {
    canonical: "/soap",
  },
  keywords: [
    "SOAP orthopaedics",
    "orthopaedic SOAP",
    "orthopaedic surgery SOAP",
    "SOAP residency guidance",
    "unmatched orthopaedics SOAP",
    "categorical surgery SOAP",
    "prelim surgery SOAP",
    "orthopaedic match guidance",
    "SnapOrtho",
    "residency SOAP strategy",
    "medical student unmatched",
  ],
  openGraph: {
    title: "SOAP | SnapOrtho",
    description:
      "An interactive guide for orthopaedic applicants navigating SOAP, one-year positions, and next-step strategy after not matching.",
    url: "/soap",
    siteName: "SnapOrtho",
    images: [
      {
        url: "/og-image-unmatched.png",
        width: 1200,
        height: 630,
        alt: "SnapOrtho SOAP Guidance",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SOAP | SnapOrtho",
    description:
      "An interactive guide for orthopaedic applicants considering SOAP, one-year positions, and next-step planning.",
    images: ["/og-image-unmatched.png"],
  },
};

export default function Page() {
  return <SoapPageClient />;
}