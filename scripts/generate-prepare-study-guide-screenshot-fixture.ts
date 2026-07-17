import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildCaseReadinessSession } from "@/lib/student-curriculum/case-readiness-builder";

const TOPIC_IDS = [
  "fracture-healing",
  "carpal-tunnel-syndrome",
  "posterior-hip-approach",
] as const;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderTopic(topicId: string) {
  const session = buildCaseReadinessSession(topicId, "fast", {
    selectedMinutes: 15,
  });
  if (!session) {
    throw new Error(`Unable to build session for ${topicId}`);
  }

  const cards = session.studyGuideSections
    .map((section, index) => {
      const blocks = section.content
        .map(
          (block) => `
            <div class="block block-${block.kind}">
              <p class="block-title">${escapeHtml(block.title)}</p>
              <ul>
                ${block.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
              </ul>
            </div>
          `
        )
        .join("");

      return `
        <article class="card ${index === 0 ? "expanded" : ""}">
          <div class="card-top">
            <div class="check">${index === 0 ? "✓" : ""}</div>
            <div>
              <h3>${escapeHtml(section.title)}</h3>
              <p>${escapeHtml(section.description)}</p>
              <div class="meta">
                <span>${section.estimatedMinutes} min</span>
                <span>${escapeHtml(section.importance.replace("-", " "))}</span>
                <span>${escapeHtml(section.completionLabel)}</span>
              </div>
            </div>
          </div>
          <div class="objective">
            <span>Learning objective</span>
            ${escapeHtml(section.learningObjective)}
          </div>
          <div class="blocks">${blocks}</div>
        </article>
      `;
    })
    .join("");

  return `
    <section class="page" id="${topicId}">
      <div class="main">
        <p class="eyebrow">Case Readiness</p>
        <h1>${escapeHtml(session.topic.title)}</h1>
        <p class="subtitle">${escapeHtml(session.subtitle)}</p>
        <div class="cards">${cards}</div>
      </div>
      <aside>
        <p class="eyebrow">Progress</p>
        <div class="progress"><span></span></div>
        <strong>1 / ${session.studyGuideSections.length} reviewed</strong>
        <p>${escapeHtml(session.guideType)} guide · ${session.selectedMinutes} min</p>
      </aside>
    </section>
  `;
}

const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Prepare Study Guide Verification</title>
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        background: #f8fafc;
        color: #0f172a;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .page {
        min-height: 100vh;
        display: grid;
        grid-template-columns: minmax(0, 1fr) 300px;
        gap: 24px;
        padding: 34px;
        border-bottom: 1px solid #e2e8f0;
      }
      .main { max-width: 920px; }
      .eyebrow {
        margin: 0;
        color: #64748b;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.18em;
        text-transform: uppercase;
      }
      h1 {
        margin: 8px 0 6px;
        font-size: 34px;
        line-height: 1.05;
        letter-spacing: 0;
      }
      .subtitle {
        margin: 0 0 18px;
        color: #475569;
        font-size: 14px;
        line-height: 1.55;
        max-width: 760px;
      }
      .cards { display: grid; gap: 14px; }
      .card {
        border: 1px solid #e2e8f0;
        border-radius: 18px;
        background: #fff;
        box-shadow: 0 1px 2px rgb(15 23 42 / 0.04);
        padding: 18px;
      }
      .card-top {
        display: grid;
        grid-template-columns: 26px 1fr;
        gap: 12px;
      }
      .check {
        width: 24px;
        height: 24px;
        border: 2px solid #0284c7;
        border-radius: 999px;
        display: grid;
        place-items: center;
        color: #0284c7;
        font-size: 14px;
        font-weight: 900;
      }
      h3 { margin: 0; font-size: 17px; letter-spacing: 0; }
      .card p { margin: 6px 0 0; color: #475569; font-size: 13px; line-height: 1.55; }
      .meta { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
      .meta span {
        border-radius: 999px;
        background: #f1f5f9;
        padding: 5px 9px;
        color: #475569;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .objective {
        margin-top: 14px;
        border: 1px solid #bae6fd;
        background: #f0f9ff;
        border-radius: 14px;
        padding: 12px;
        color: #082f49;
        font-size: 13px;
        line-height: 1.55;
      }
      .objective span {
        display: block;
        margin-bottom: 4px;
        color: #075985;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 0.16em;
        text-transform: uppercase;
      }
      .blocks { display: grid; gap: 10px; margin-top: 12px; }
      .block {
        border: 1px solid #e2e8f0;
        border-radius: 14px;
        padding: 11px 12px;
        background: #fff;
      }
      .block-recognize { background: #f0f9ff; border-color: #bae6fd; }
      .block-application { background: #ecfdf5; border-color: #a7f3d0; }
      .block-common-confusion { background: #fffbeb; border-color: #fde68a; }
      .block-self-check { background: #fff1f2; border-color: #fecdd3; }
      .block-title {
        margin: 0 0 6px !important;
        color: #334155 !important;
        font-size: 10px !important;
        font-weight: 900;
        letter-spacing: 0.16em;
        text-transform: uppercase;
      }
      ul { margin: 0; padding-left: 18px; color: #334155; font-size: 13px; line-height: 1.55; }
      aside {
        align-self: start;
        position: sticky;
        top: 24px;
        border: 1px solid #e2e8f0;
        border-radius: 18px;
        background: #fff;
        padding: 18px;
      }
      .progress {
        height: 10px;
        margin: 14px 0 10px;
        border-radius: 999px;
        background: #e2e8f0;
        overflow: hidden;
      }
      .progress span {
        display: block;
        width: 25%;
        height: 100%;
        background: #0284c7;
      }
      aside strong { display: block; font-size: 20px; }
      aside p:not(.eyebrow) { color: #64748b; font-size: 13px; }
      @media (max-width: 800px) {
        .page { grid-template-columns: 1fr; padding: 18px; }
        aside { position: static; }
      }
    </style>
  </head>
  <body>${TOPIC_IDS.map(renderTopic).join("")}</body>
</html>`;

const outDir = join(process.cwd(), "public", "prepare-study-guide-visual");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "index.html"), html);
for (const topicId of TOPIC_IDS) {
  writeFileSync(
    join(outDir, `${topicId}.html`),
    html.replace(
      `<body>${TOPIC_IDS.map(renderTopic).join("")}</body>`,
      `<body>${renderTopic(topicId)}</body>`
    )
  );
}
console.log(join(outDir, "index.html"));
