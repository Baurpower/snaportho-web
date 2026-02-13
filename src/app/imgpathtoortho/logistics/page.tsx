import ImgLogisticsPageClient from "./logisticspageclient";

export const metadata = {
  title: "Understand Logistics | SnapOrtho",
  description:
    "IMG Path to Ortho Step 7: high-level visa basics (J-1 vs H-1B), how program sponsorship affects your list, and practical tips to avoid surprises—plus official resources.",
  keywords: [
    "orthopaedics",
    "education",
    "SnapOrtho",
    "IMG",
    "international medical graduate",
    "IMG orthopaedic residency",
    "visa",
    "J-1",
    "H-1B",
    "USCIS",
    "Department of State",
    "ECFMG",
    "visa sponsorship",
    "NRMP",
    "ERAS",
  ],
  openGraph: {
    title: "Understand Logistics | SnapOrtho",
    description:
      "High-level visa basics and practical planning tips for IMGs pursuing US Orthopaedic Surgery residency, with official resources.",
    url: "https://snap-ortho.com/imgpathtoortho/logistics",
    siteName: "SnapOrtho",
    images: [
      {
        url: "https://snap-ortho.com/og-image-img-logistics.png",
        width: 1200,
        height: 630,
        alt: "SnapOrtho IMG Logistics OG Image",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "IMG Logistics | SnapOrtho",
    description:
      "Visa basics (J-1 vs H-1B), sponsorship realities, and practical tips so you don’t get blindsided.",
    images: ["https://snap-ortho.com/og-image-img-logistics.png"],
  },
};

export default function Page() {
  return <ImgLogisticsPageClient />; // ✅ render the client component
}
