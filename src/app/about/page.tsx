// app/about/page.tsx
export default function About() {
  return (
    <article className="prose lg:prose-xl mx-auto">
      <h1>About SnapOrtho</h1>
      <p>
        SnapOrtho is your on-the-go orthopaedic tutor: interactive quizzes,
        clinical pearls, and visual guides to help students and residents
        confidently manage fractures and soft-tissue injuries.
      </p>
      <h2>Why SnapOrtho?</h2>
      <ul>
        <li>Fast, image-based learning modules</li>
        <li>Anki-style spaced repetition</li>
        <li>Peer-reviewed content by orthopaedic experts</li>
      </ul>
    </article>
  );
}
