// components/Footer.tsx
export default function Footer() {
  return (
    <footer className="bg-gray-100 mt-12">
      <div className="container mx-auto px-4 py-6 text-center text-sm text-gray-600">
        © {new Date().getFullYear()} SnapOrtho. All rights reserved.
      </div>
    </footer>
  );
}
