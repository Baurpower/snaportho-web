"use client";

import Link from "next/link";
import { useState } from "react";

export default function Nav() {
  const [open, setOpen] = useState(false);

  const modules = [
    { title: "Trauma", href: "/learn/modules/trauma" },
    { title: "Oncology", href: "/learn/modules/oncology" },
  ];

  return (
    <nav className="fixed inset-x-0 top-0 z-50 shadow-sm" style={{ backgroundColor: "#597498" }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between text-white">
        <Link
          href="/"
          className="text-xl font-semibold tracking-tight hover:text-blue-300 transition"
        >
          SnapOrtho
        </Link>

        <div className="flex items-center gap-8 text-base font-medium capitalize relative">
          <Link href="/" className="hover:text-blue-300 transition">
            Home
          </Link>

          <div className="relative">
            <button
              onClick={() => setOpen((prev) => !prev)}
              className="hover:text-blue-300 transition flex items-center gap-1 focus:outline-none"
            >
              Learn
              <svg
                className={`w-4 h-4 transform transition-transform ${
                  open ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {open && (
              <div
                className="absolute right-0 mt-2 w-44 bg-white text-navy rounded-md border border-gray-200 shadow-lg z-10"
                onMouseLeave={() => setOpen(false)} // Optional: close when leaving the dropdown
              >
                {modules.map((m) => (
                  <Link
                    key={m.href}
                    href={m.href}
                    className="block px-4 py-2 text-[#597498] hover:bg-sky-50 transition whitespace-nowrap"
                  >
                    {m.title}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link href="/practice" className="hover:text-blue-300 transition">
            Practice
          </Link>
        </div>
      </div>
    </nav>
  );
}
