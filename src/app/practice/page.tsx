// src/app/practice/page.tsx
import Nav from "../../components/Nav";


export default function PracticePage() {
  return (
    <div className="font-sans text-midnight bg-cream flex flex-col min-h-screen">
      {/* NAVBAR */}
      <Nav />

      {/* HERO */}
      <header className="bg-white shadow py-12">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h1 className="text-4xl font-extrabold mb-4 text-navy">
            Practice
          </h1>
          <p className="text-lg text-midnight/80 mb-6">
            Our Practice feature is currently only available in the mobile app.
          </p>
          <a
            href="https://apps.apple.com/us/app/snaportho/id6742800145"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-6 py-3 bg-sky text-white font-medium rounded-full shadow hover:bg-sky/90 transition"
          >
            Get the SnapOrtho App
          </a>
        </div>
      </header>

      {/* FEATURES */}
      <section className="flex-1 bg-white py-16">
        <div className="max-w-4xl mx-auto px-6 space-y-10">
          <h2 className="text-2xl font-semibold text-navy text-center">
            Why Practice on SnapOrtho?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 bg-cream rounded-2xl shadow hover:shadow-lg transition">
              <h3 className="text-xl font-semibold mb-2 text-navy">
                Spaced Repetition
              </h3>
              <p className="text-midnight/80">
                Our algorithm brings you back to the most challenging cases at just the right moment so you retain key orthopaedic concepts.
              </p>
            </div>
            <div className="p-6 bg-cream rounded-2xl shadow hover:shadow-lg transition">
              <h3 className="text-xl font-semibold mb-2 text-navy">
                X-Ray Interpretation
              </h3>
              <p className="text-midnight/80">
                Practice reading real high-resolution radiographs with embedded annotations and progressive reveal.
              </p>
            </div>
            <div className="p-6 bg-cream rounded-2xl shadow hover:shadow-lg transition">
              <h3 className="text-xl font-semibold mb-2 text-navy">
                Classification & Management
              </h3>
              <p className="text-midnight/80">
                Choose the correct fracture classification and test your decision-making with expert-curated management options.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-navy text-white py-6">
        <div className="max-w-5xl mx-auto px-6 text-center text-sm">
          &copy; {new Date().getFullYear()} SnapOrtho — Learn & Practice Orthopaedics.
        </div>
      </footer>
    </div>
  );
}
