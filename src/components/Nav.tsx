// components/Nav.tsx
import Link from "next/link";
import { useState } from "react";

export default function Nav() {
  const [open, setOpen] = useState(false);

  // adjust these as your real module slugs/titles
  const modules = [
    { title: "Trauma", href: "/learn/modules/trauma" },
    { title: "Oncology", href: "/learn/modules/oncology" },
    // add more modules here...
  ];

  return (
    <nav className="bg-navy text-white fixed inset-x-0 top-0 z-50 shadow-md">
      <div className="max-w-5xl mx-auto px-6 md:px-10 py-3 flex items-center justify-between">
        <Link href="/" className="text-2xl font-semibold">
          SnapOrtho
        </Link>

        <div className="flex items-center space-x-8 text-sm uppercase">
          {/* Home */}
          <Link href="/" className="hover:text-sky transition">
            Home
          </Link>

          {/* Learn dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
          >
            <button className="hover:text-sky transition flex items-center">
              Learn
              <svg
                className="ml-1 w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {open && (
              <div className="absolute right-0 mt-2 w-48 bg-white text-navy rounded-lg shadow-lg overflow-hidden">
                {modules.map((m) => (
                  <Link
                    key={m.href}
                    href={m.href}
                    className="block px-4 py-2 hover:bg-sky/10 transition"
                  >
                    {m.title}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Practice */}
          <Link
            href="/practice"
            className="hover:text-sky transition"
          >
            Practice
          </Link>
        </div>
      </div>
    </nav>
  );
}
