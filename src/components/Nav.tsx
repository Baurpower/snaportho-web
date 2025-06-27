'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function Nav() {
  const [openLearn, setOpenLearn] = useState(false);
  const [openRef, setOpenRef] = useState(false);

  const modules = [
    { title: 'Trauma', href: '/learn/modules/trauma' },
    { title: 'Oncology', href: '/learn/modules/oncology' },
  ];

  return (
    <nav className="fixed inset-x-0 top-0 z-50 shadow-sm" style={{ backgroundColor: '#597498' }}>
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

          {/* Learn Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setOpenLearn((prev) => !prev);
                setOpenRef(false); // close Reference if open
              }}
              className="hover:text-blue-300 transition flex items-center gap-1 focus:outline-none"
            >
              Learn
              <svg
                className={`w-4 h-4 transform transition-transform ${
                  openLearn ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {openLearn && (
              <div
                className="absolute right-0 mt-2 w-44 bg-white text-navy rounded-md border border-gray-200 shadow-lg z-10"
                onMouseLeave={() => setOpenLearn(false)}
              >
                <Link
                  href="/learn"
                  className="block px-4 py-2 text-[#597498] hover:bg-sky-50 transition whitespace-nowrap font-semibold"
                  onClick={() => setOpenLearn(false)}
                >
                  Learn Home
                </Link>

                <div className="border-t border-gray-200 my-1"></div>

                {modules.map((m) => (
                  <Link
                    key={m.href}
                    href={m.href}
                    className="block px-4 py-2 text-[#597498] hover:bg-sky-50 transition whitespace-nowrap"
                    onClick={() => setOpenLearn(false)}
                  >
                    {m.title}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Reference Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setOpenRef((prev) => !prev);
                setOpenLearn(false); // close Learn if open
              }}
              className="hover:text-blue-300 transition flex items-center gap-1 focus:outline-none"
            >
              Reference
              <svg
                className={`w-4 h-4 transform transition-transform ${
                  openRef ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {openRef && (
              <div
                className="absolute right-0 mt-2 w-48 bg-white text-navy rounded-md border border-gray-200 shadow-lg z-10"
                onMouseLeave={() => setOpenRef(false)}
              >
                <Link
                  href="/reference/read-xray"
                  className="block px-4 py-2 text-[#597498] hover:bg-sky-50 transition whitespace-nowrap"
                  onClick={() => setOpenRef(false)}
                >
                  Read X-Rays
                </Link>
                <Link
                  href="/reference/case-prep"
                  className="block px-4 py-2 text-[#597498] hover:bg-sky-50 transition whitespace-nowrap"
                  onClick={() => setOpenRef(false)}
                >
                  Case Prep
                </Link>
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
