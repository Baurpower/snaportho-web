import FindProjectsPageClient from "./findprojectspageclient";

export const metadata = {
  title: "Find Ortho Research | SnapOrtho",
  description:
    "How to find orthopaedic research projects: where to look, how to pick mentors, how to pitch, and outreach templates.",
  keywords: [
    "orthopaedics",
    "SnapOrtho",
    "research",
    "medical student",
    "orthopaedic research",
    "how to find research",
    "email template",
    "mentorship",
    "residency applications",
  ],
  openGraph: {
    title: "Find Ortho Research | SnapOrtho",
    description:
      "A practical guide to finding orthopaedic research: initiative framework, mentor selection, and a copy/paste pitch.",
    url: "https://snap-ortho.com/research/find-projects",
    siteName: "SnapOrtho",
    images: [
      {
        url: "https://snap-ortho.com/og-image-find-projects.png",
        width: 1200,
        height: 630,
        alt: "SnapOrtho Find Ortho Research OG Image",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Find Ortho Research | SnapOrtho",
    description:
      "Where to look, who to contact, and how to pitch a small project mentors say yes to.",
    images: ["https://snap-ortho.com/og-image-find-projects.png"],
  },
};

export default function Page() {
  return <FindProjectsPageClient />;
}