// components/Nav.tsx
import Link from "next/link";

export default function Nav() {
  return (
    <nav className="bg-navy text-white fixed inset-x-0 top-0 z-50 shadow-md">
      <div className="max-w-5xl mx-auto px-10 py-3 flex items-center justify-between">
        <Link href="/" className="text-2xl font-semibold">
          SnapOrtho
        </Link>
        <div className="space-x-8 text-sm uppercase">
          <Link href="/" className="hover:text-sky transition">
            Home
          </Link>
          <Link href="/about" className="hover:text-sky transition">
            About
          </Link>
          <Link href="/account/update-password" className="hover:text-sky transition">
            Reset Password
          </Link>
        </div>
      </div>
    </nav>
  );
}
