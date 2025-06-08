// components/Nav.tsx
import Link from "next/link";

export default function Nav() {
  return (
    <nav className="bg-white shadow-md">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold">
          SnapOrtho
        </Link>
        <div className="space-x-6">
          <Link href="/" className="hover:text-blue-600">
            Home
          </Link>
          <Link href="/about" className="hover:text-blue-600">
            About
          </Link>
          <Link href="/account/update-password" className="hover:text-blue-600">
            Reset Password
          </Link>
        </div>
      </div>
    </nav>
  );
}
