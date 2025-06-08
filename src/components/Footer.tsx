// components/Footer.tsx
import Link from "next/link";

export default function Footer() {
  return (
    <>
      

      {/* Main Footer */}
      <footer className="w-full bg-navy text-white pt-12 pb-8">
        <div className="max-w-5xl mx-auto px-10 grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* About */}
          <div>
            <h4 className="font-semibold mb-4">About</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about" className="hover:text-sky">Our Story</Link></li>
              <li><Link href="/team" className="hover:text-sky">Team</Link></li>
              <li><Link href="/careers" className="hover:text-sky">Careers</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/terms" className="hover:text-sky">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-sky">Privacy Policy</Link></li>
              <li><Link href="/support" className="hover:text-sky">Support</Link></li>
            </ul>
          </div>

          {/* Contact & Social */}
          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <p className="text-sm mb-4">hello@snaportho.com</p>
            <div className="flex space-x-4 text-xl">
              <Link href="#" className="hover:text-sky">🐦</Link>
              <Link href="#" className="hover:text-sky">📘</Link>
              <Link href="#" className="hover:text-sky">📸</Link>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 border-t border-white/20 pt-6 text-center text-xs text-white/70">
          © {new Date().getFullYear()} SnapOrtho. All rights reserved.
        </div>
      </footer>
    </>
  );
}
