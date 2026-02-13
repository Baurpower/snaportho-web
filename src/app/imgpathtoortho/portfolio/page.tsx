import ImgPortfolioPageClient from "./portfoliopageclient";

export const metadata = {
  title: "Build a VERY Strong CV | SnapOrtho",
  description:
    "IMG Path to Ortho Step 3: how international medical graduates build a competitive orthopaedic CV through publications, presentations, leadership, and high-value skills.",
  keywords: [
    "orthopaedics",
    "education",
    "SnapOrtho",
    "IMG",
    "international medical graduate",
    "IMG orthopaedic residency",
    "orthopaedic CV",
    "research portfolio",
    "publications",
    "presentations",
    "leadership",
    "US research",
    "letters of recommendation",
    "ERAS",
    "NRMP",
  ],
  openGraph: {
    title: "Build a VERY Strong CV | SnapOrtho",
    description:
      "How IMGs overcome the uphill battle of orthopaedic residency by building a CV that proves productivity, reliability, and readiness for U.S. training.",
    url: "https://snap-ortho.com/imgpathtoortho/portfolio",
    siteName: "SnapOrtho",
    images: [
      {
        url: "https://snap-ortho.com/og-image-img-portfolio.png",
        width: 1200,
        height: 630,
        alt: "SnapOrtho IMG Portfolio OG Image",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "IMG Portfolio Building | SnapOrtho",
    description:
      "Publications, presentations, leadership, and skills that help IMGs stand out in orthopaedic residency applications.",
    images: ["https://snap-ortho.com/og-image-img-portfolio.png"],
  },
};

export default function Page() {
  return <ImgPortfolioPageClient />; // ✅ render the client component
}
