'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

export default function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openLearn, setOpenLearn] = useState(false);
  const [openRef, setOpenRef] = useState(false);

  const modules = [
    { title: 'Trauma', href: '/learn/modules/trauma' },
    { title: 'Oncology', href: '/learn/modules/oncology' },
  ];

  return (
    <nav className="fixed inset-x-0 top-0 z-50 shadow-sm bg-[#597498] text-white">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-xl font-semibold tracking-tight hover:text-blue-300 transition">
          SnapOrtho
        </Link>

        <div className="md:hidden">
          <button onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
            {menuOpen ? (
              <XMarkIcon className="h-6 w-6" />
            ) : (
              <Bars3Icon className="h-6 w-6" />
            )}
          </button>
        </div>

        <div className={`md:flex gap-8 font-medium capitalize ${menuOpen ? 'block mt-4' : 'hidden'} md:mt-0 md:items-center`}>
          <Link href="/" className="block hover:text-blue-300 transition py-2 md:py-0">
            Home
          </Link>

          {/* Learn Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setOpenLearn((prev) => !prev);
                setOpenRef(false);
              }}
              className="hover:text-blue-300 transition flex items-center gap-1 py-2 md:py-0 focus:outline-none"
            >
              Learn
              <svg className={`w-4 h-4 transform transition-transform ${openLearn ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {openLearn && (
              <div className="md:absolute md:right-0 mt-1 md:mt-2 w-full md:w-44 bg-white text-[#597498] rounded-md border border-gray-200 shadow-lg z-10">
                <Link
                  href="/learn"
                  className="block px-4 py-2 hover:bg-sky-50 font-semibold"
                  onClick={() => {
                    setOpenLearn(false);
                    setMenuOpen(false);
                  }}
                >
                  Learn Home
                </Link>
                <div className="border-t border-gray-200 my-1" />
                {modules.map((m) => (
                  <Link
                    key={m.href}
                    href={m.href}
                    className="block px-4 py-2 hover:bg-sky-50"
                    onClick={() => {
                      setOpenLearn(false);
                      setMenuOpen(false);
                    }}
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
                setOpenLearn(false);
              }}
              className="hover:text-blue-300 transition flex items-center gap-1 py-2 md:py-0 focus:outline-none"
            >
              Reference
              <svg className={`w-4 h-4 transform transition-transform ${openRef ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {openRef && (
              <div className="md:absolute md:right-0 mt-1 md:mt-2 w-full md:w-48 bg-white text-[#597498] rounded-md border border-gray-200 shadow-lg z-10">
                <Link
                  href="/reference/read-xray"
                  className="block px-4 py-2 hover:bg-sky-50"
                  onClick={() => {
                    setOpenRef(false);
                    setMenuOpen(false);
                  }}
                >
                  Read X-Rays
                </Link>
                <Link
                  href="/reference/case-prep"
                  className="block px-4 py-2 hover:bg-sky-50"
                  onClick={() => {
                    setOpenRef(false);
                    setMenuOpen(false);
                  }}
                >
                  Case Prep
                </Link>
              </div>
            )}
          </div>

          <Link
            href="/practice"
            className="block hover:text-blue-300 transition py-2 md:py-0"
            onClick={() => setMenuOpen(false)}
          >
            Practice
          </Link>
        </div>
      </div>
    </nav>
  );
}
