import ImgApplySmartPageClient from "./applypageclient";

export const metadata = {
  title: "Apply Smart (ERAS Strategy) | SnapOrtho",
  description:
    "IMG Path to Ortho Step 6: apply strategically through ERAS with realistic program targeting, a cohesive narrative, strong signals, and interview readiness.",
  keywords: [
    "orthopaedics",
    "education",
    "SnapOrtho",
    "IMG",
    "international medical graduate",
    "IMG orthopaedic residency",
    "ERAS application",
    "application strategy",
    "program targeting",
    "personal statement",
    "letters of recommendation",
    "signals",
    "interviews",
    "NRMP",
    "visa requirements",
  ],
  openGraph: {
    title: "Apply Smart (ERAS Strategy) | SnapOrtho",
    description:
      "A practical ERAS application strategy for IMGs pursuing US Orthopaedic Surgery residency.",
    url: "https://snap-ortho.com/imgpathtoortho/apply",
    siteName: "SnapOrtho",
    images: [
      {
        url: "https://snap-ortho.com/og-image-img-apply.png",
        width: 1200,
        height: 630,
        alt: "SnapOrtho IMG Apply Smart OG Image",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "IMG Apply Smart | SnapOrtho",
    description:
      "How IMGs apply strategically: program targeting, narrative, signals, and interview preparation.",
    images: ["https://snap-ortho.com/og-image-img-apply.png"],
  },
};

export default function Page() {
  return <ImgApplySmartPageClient />; // ✅ render the client component
}
