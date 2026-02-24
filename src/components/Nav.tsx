'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

export default function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openLearn, setOpenLearn] = useState(false);
  const [openRef, setOpenRef] = useState(false);
  const [openPath, setOpenPath] = useState(false);
  const [openResearch, setOpenResearch] = useState(false);

  const navRef = useRef<HTMLElement | null>(null);

  const closeAll = () => {
    setMenuOpen(false);
    setOpenLearn(false);
    setOpenRef(false);
    setOpenPath(false);
    setOpenResearch(false);
  };

  const modules = [
    { title: 'Trauma', href: '/learn/modules/trauma' },
    { title: 'Oncology', href: '/learn/modules/oncology' },
  ];

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const el = navRef.current;
      if (!el) return;
      if (el.contains(e.target as Node)) return; // click inside nav -> ignore
      closeAll(); // click outside -> close everything
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAll();
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return (
    <nav
      ref={navRef}
      className="fixed inset-x-0 top-0 z-50 shadow-sm bg-[#597498] text-white"
    >
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link
          href="/"
          className="text-xl font-semibold tracking-tight hover:text-blue-300 transition"
          onClick={closeAll}
        >
          SnapOrtho
        </Link>

        {/* Mobile toggle button */}
        <div className="md:hidden">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            {menuOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
          </button>
        </div>

        {/* Nav links */}
        <div
          className={`md:flex gap-8 font-medium capitalize ${
            menuOpen ? 'block mt-4' : 'hidden'
          } md:mt-0 md:items-center`}
        >
          <Link href="/" className="block hover:text-blue-300 transition py-2 md:py-0" onClick={closeAll}>
            Home
          </Link>

          <Link href="/brobot" className="block hover:text-blue-300 transition py-2 md:py-0" onClick={closeAll}>
            BroBot
          </Link>

          {/* Learn Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setOpenLearn((prev) => !prev);
                setOpenRef(false);
                setOpenPath(false);
                setOpenResearch(false);
              }}
              className="hover:text-blue-300 transition flex items-center gap-1 py-2 md:py-0 focus:outline-none"
              aria-haspopup="menu"
              aria-expanded={openLearn}
              aria-controls="learn-menu"
            >
              Learn
              <svg
                className={`w-4 h-4 transform transition-transform ${openLearn ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {openLearn && (
              <div
                id="learn-menu"
                role="menu"
                className="md:absolute md:right-0 mt-1 md:mt-2 w-full md:w-44 bg-white text-[#597498] rounded-md border border-gray-200 shadow-lg z-10"
              >
                <Link
                  href="/learn"
                  className="block px-4 py-2 hover:bg-sky-50 font-semibold"
                  role="menuitem"
                  onClick={closeAll}
                >
                  Learn Home
                </Link>
                <div className="border-t border-gray-200 my-1" />
                {modules.map((m) => (
                  <Link
                    key={m.href}
                    href={m.href}
                    className="block px-4 py-2 hover:bg-sky-50"
                    role="menuitem"
                    onClick={closeAll}
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
                setOpenPath(false);
                setOpenResearch(false);
              }}
              className="hover:text-blue-300 transition flex items-center gap-1 py-2 md:py-0 focus:outline-none"
              aria-haspopup="menu"
              aria-expanded={openRef}
              aria-controls="reference-menu"
            >
              Reference
              <svg
                className={`w-4 h-4 transform transition-transform ${openRef ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {openRef && (
              <div
                id="reference-menu"
                role="menu"
                className="md:absolute md:right-0 mt-1 md:mt-2 w-full md:w-48 bg-white text-[#597498] rounded-md border border-gray-200 shadow-lg z-10"
              >
                <Link
                  href="/reference/read-xray"
                  className="block px-4 py-2 hover:bg-sky-50"
                  role="menuitem"
                  onClick={closeAll}
                >
                  Read X-Rays
                </Link>
              </div>
            )}
          </div>

          {/* Path to Ortho Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setOpenPath((prev) => !prev);
                setOpenLearn(false);
                setOpenRef(false);
                setOpenResearch(false);
              }}
              className="hover:text-blue-300 transition flex items-center gap-1 py-2 md:py-0 focus:outline-none"
              aria-haspopup="menu"
              aria-expanded={openPath}
              aria-controls="path-to-ortho-menu"
            >
              Path to Ortho
              <svg
                className={`w-4 h-4 transform transition-transform ${openPath ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {openPath && (
              <div
                id="path-to-ortho-menu"
                role="menu"
                className="md:absolute md:right-0 mt-1 md:mt-2 w-full md:w-56 bg-white text-[#597498] rounded-md border border-gray-200 shadow-lg z-10 overflow-hidden"
              >
                <Link href="/pathtoortho" className="block px-4 py-2 hover:bg-sky-50 font-semibold" role="menuitem" onClick={closeAll}>
                  Path to Ortho Home
                </Link>
                <div className="border-t border-gray-200 my-1" />
                <Link href="/pathtoortho/awayrotations" className="block px-4 py-2 hover:bg-sky-50" role="menuitem" onClick={closeAll}>
                  Away Rotations
                </Link>
                <Link href="/pathtoortho/eras" className="block px-4 py-2 hover:bg-sky-50" role="menuitem" onClick={closeAll}>
                  ERAS Application
                </Link>
                <Link href="/pathtoortho/interviews" className="block px-4 py-2 hover:bg-sky-50" role="menuitem" onClick={closeAll}>
                  Interviews
                </Link>
                <Link href="/pathtoortho/research-fellowship" className="block px-4 py-2 hover:bg-sky-50" role="menuitem" onClick={closeAll}>
                  Research Fellowship
                </Link>
                <Link href="/pathtoortho/programs-do" className="block px-4 py-2 hover:bg-sky-50" role="menuitem" onClick={closeAll}>
                  Historically DO Programs
                </Link>
              </div>
            )}
          </div>

          {/* Research 101 Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setOpenResearch((prev) => !prev);
                setOpenLearn(false);
                setOpenRef(false);
                setOpenPath(false);
              }}
              className="hover:text-blue-300 transition flex items-center gap-1 py-2 md:py-0 focus:outline-none"
              aria-haspopup="menu"
              aria-expanded={openResearch}
              aria-controls="research-101-menu"
            >
              Research 101
              <svg
                className={`w-4 h-4 transform transition-transform ${openResearch ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {openResearch && (
              <div
                id="research-101-menu"
                role="menu"
                className="md:absolute md:right-0 mt-1 md:mt-2 w-full md:w-56 bg-white text-[#597498] rounded-md border border-gray-200 shadow-lg z-10 overflow-hidden"
              >
                <Link href="/research" className="block px-4 py-2 hover:bg-sky-50 font-semibold" role="menuitem" onClick={closeAll}>
                  Research 101 Home
                </Link>
                <div className="border-t border-gray-200 my-1" />
                <Link href="/research/playbook" className="block px-4 py-2 hover:bg-sky-50" role="menuitem" onClick={closeAll}>
                  Research Playbook
                </Link>
                <Link href="/research/find-projects" className="block px-4 py-2 hover:bg-sky-50" role="menuitem" onClick={closeAll}>
                  Find Projects
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}