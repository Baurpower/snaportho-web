// app/page.tsx
export default function Home() {
  return (
    <section className="text-center">
      <h1 className="text-5xl font-extrabold mb-4">Welcome to SnapOrtho</h1>
      <p className="text-lg mb-8">
        Master fracture classifications and treatment algorithms with bite-sized modules.
      </p>
      <div className="space-x-4">
        <a
          href="/account/update-password"
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700"
        >
          Get Started
        </a>
        <a
          href="/about"
          className="inline-block text-blue-600 px-6 py-3 rounded border border-blue-600 hover:bg-blue-50"
        >
          Learn More
        </a>
      </div>
    </section>
  );
}
