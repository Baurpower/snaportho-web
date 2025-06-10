"use client";

import Link from "next/link";
import Image from "next/image";

// You can make this a reusable component:
function TeamMemberCard({
  name,
  title,
  image,
  linkedIn,
}: {
  name: string;
  title: string;
  image: string;
  linkedIn?: string;
}) {
  return (
    <div className="flex flex-col items-center text-center bg-white rounded-2xl shadow-md p-6 transition-transform hover:scale-[1.03] hover:shadow-lg">
      <div className="w-28 h-28 mb-4 overflow-hidden rounded-full border-4 border-[#f9f7f4] shadow-sm">
        <Image
          src={image}
          alt={name}
          width={112}
          height={112}
          className="object-cover w-full h-full"
        />
      </div>
      <h3 className="text-lg font-semibold text-[#333] mb-1">{name}</h3>
      <p className="text-sm text-gray-600 mb-3">{title}</p>
      {linkedIn && (
        <a
          href={linkedIn}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:text-blue-600 text-sm"
        >
          View LinkedIn →
        </a>
      )}
    </div>
  );
}

export default function OurTeamPage() {
  const team = [
    {
      name: "Alexander Baur",
      title: "Founder, CEO, Developer",
      image: "/team/alexbaurheadshot.jpg",
      linkedIn: "",
    },
    {
      name: "Bradford Baur",
      title: "Chief Operating Officer (COO)",
      image: "/team/bradbaurheadshot.jpeg",
      linkedIn: "",
    },
    {
      name: "Austin Nguyen, MD",
      title: "Senior Division Manager, Developer",
      image: "/team/austinheadshot.jpg",
      linkedIn: "",
    },
    {
      name: "Rebecca Baur",
      title: "Chief Marketing Officer (CMO)",
      image: "/team/beccaheadshot.jpg",
      linkedIn: "",
    },
  ];

  return (
    <main className="min-h-screen bg-[#f9f7f4] text-navy px-6 sm:px-10 lg:px-24 py-22 space-y-16">
      {/* Header */}
      <section className="max-w-3xl mx-auto text-center space-y-4">
        <h1 className="text-5xl font-bold text-[#444] tracking-tight">Our Team</h1>
        <p className="text-lg text-gray-600 leading-relaxed">
          SnapOrtho is built by a dedicated team of innovators and educators, committed to making orthopaedic learning more accessible, engaging, and effective.
        </p>
      </section>

      {/* Leadership Team */}
      <section className="max-w-6xl mx-auto space-y-8">
        <h2 className="text-3xl font-semibold text-[#444] mb-4">Leadership Team</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-10">
          {team.map((person) => (
            <TeamMemberCard
              key={person.name}
              name={person.name}
              title={person.title}
              image={person.image}
              linkedIn={person.linkedIn}
            />
          ))}
        </div>
      </section>

      {/* Consultants */}
      <section className="max-w-6xl mx-auto space-y-4 mt-16">
        <h2 className="text-3xl font-semibold text-[#444]">Clinical Advisors & Consultants</h2>
        <div className="bg-white border border-gray-200 rounded-2xl shadow-md p-8 text-lg text-gray-700 leading-relaxed">
          SnapOrtho is backed by a growing network of physicians, residents, and educators who ensure our platform remains clinically sharp and educationally relevant. Their insight shapes every aspect of our content — from clinical accuracy to educational clarity.
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto text-center space-y-4 mt-16">
        <p className="text-lg text-gray-700 leading-relaxed">
          Interested in contributing or collaborating? We’re always open to new perspectives and ideas.
        </p>
        <Link
          href="/contact"
          className="inline-block bg-[#597498] text-white px-8 py-4 rounded-xl font-medium hover:bg-[#4e6886] transition text-lg"
        >
          Contact Us
        </Link>
      </section>
    </main>
  );
}
