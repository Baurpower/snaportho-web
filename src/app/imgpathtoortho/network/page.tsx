import ImgNetworkMentorshipPageClient from "./networkpageclient";

export const metadata = {
  title: "Network + Mentorship | SnapOrtho",
  description:
    "IMG Path to Ortho Step 5: build a mentor team, network the right way, use conferences strategically, and avoid common networking mistakes that stall IMG applicants.",
  keywords: [
    "orthopaedics",
    "education",
    "SnapOrtho",
    "IMG",
    "international medical graduate",
    "IMG orthopaedic residency",
    "networking",
    "mentorship",
    "orthopaedic research fellowship",
    "letters of recommendation",
    "conferences",
    "program leadership",
    "NRMP",
    "ERAS",
    "visa requirements",
  ],
  openGraph: {
    title: "Network + Mentorship | SnapOrtho",
    description:
      "A practical guide to networking and mentorship for IMGs pursuing US Orthopaedic Surgery residency.",
    url: "https://snap-ortho.com/imgpathtoortho/network",
    siteName: "SnapOrtho",
    images: [
      {
        url: "https://snap-ortho.com/og-image-img-network.png",
        width: 1200,
        height: 630,
        alt: "SnapOrtho IMG Network + Mentorship OG Image",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "IMG Network + Mentorship | SnapOrtho",
    description:
      "Build a mentor team, network well, and use conferences strategically—without wasting months.",
    images: ["https://snap-ortho.com/og-image-img-network.png"],
  },
};

export default function Page() {
  return <ImgNetworkMentorshipPageClient />; // ✅ render the client component
}
