/**
 * SnapOrtho Master card style — embedded source of truth for bootstrap + future style updates.
 * Human-editable mirrors: integrations/snaportho-anki/note-types/SnapOrtho Master/
 * Keep this file and that folder in sync when editing templates.
 * Pure constants only — no I/O.
 */

export const SNAPORTHO_STYLE_VERSION = "1.0.0" as const;
export const SNAPORTHO_MODEL_TYPE = "cloze" as const; // Anki models type = 1

/** Locked field order for SnapOrtho Master. Never rename; append only before personal/marker tail. */
export const SNAPORTHO_MASTER_FIELD_ORDER = [
  "Text",
  "Extra",
  "Orthobullets",
  "Orthobullets_Link",
  "ROCK",
  "ROCK_Link",
  "Classifications",
  "Anatomy",
  "Nailed_It",
  "Nailed_It_Link",
  "Podcasts",
  "Podcasts_Link",
  "Video",
  "Video_Link",
  "Millers",
  "OKU",
  "Campbells",
  "OITE",
  "CasePrep",
  "BroBot",
  "Additional_Resources",
  "Missed_Questions",
  "One_by_one",
  "Personal_Notes",
  "SnapOrtho_ID",
  "SnapOrtho_Version",
  "SnapOrtho_Installed_Hash",
] as const;

export type SnapOrthoMasterFieldName = (typeof SNAPORTHO_MASTER_FIELD_ORDER)[number];

export const SNAPORTHO_FIELD_DESCRIPTIONS: Record<string, string> = {
  "Text": "Primary cloze body. Use {{c1::...}} markup.",
  "Extra": "Extra teaching text after reveal (tables, pearls, differentials).",
  "Orthobullets": "Curated Orthobullets-aligned teaching bullets (original/edited text you own).",
  "Orthobullets_Link": "Bare HTTPS URL to the Orthobullets topic (or deep link).",
  "ROCK": "ROCK chapter/section citation + curated teaching points.",
  "ROCK_Link": "Bare HTTPS URL / locator for the ROCK chapter.",
  "Classifications": "Classification systems (Neer, Garden, Schatzker, etc.) \u2014 text and/or licensed images.",
  "Anatomy": "Anatomy / approach anatomy notes and licensed figures.",
  "Nailed_It": "Nailed It Ortho episode title, timestamp, and 1\u20133 takeaways.",
  "Nailed_It_Link": "Bare HTTPS URL to the Nailed It episode.",
  "Podcasts": "Other podcasts (OrthoJOE, JBJS, specialty shows) \u2014 titles + takeaways.",
  "Podcasts_Link": "Bare HTTPS URL(s) for generic podcasts. Prefer HTML list if multiple.",
  "Video": "VuMedi / Orthobullets video / approach video title + notes.",
  "Video_Link": "Bare HTTPS URL to the video.",
  "Millers": "Miller's Review / Concise Orthopaedics citations and points.",
  "OKU": "OKU chapter reference and curated points.",
  "Campbells": "Campbell's Operative Orthopaedics chapter/page citation and points.",
  "OITE": "OITE-related teaching points (not copyrighted full stems).",
  "CasePrep": "SnapOrtho Case Prep packet summary and/or deep link HTML.",
  "BroBot": "Optional BroBot deep link or prefilled prompt context (IDs preferred).",
  "Additional_Resources": "Catch-all for other curated resources.",
  "Missed_Questions": "Wrong-question notes / OITE misses (user or curated).",
  "One_by_one": "Reserved for sequential cloze control (type yes or c1,c3). Not used by template v1.",
  "Personal_Notes": "User private notes \u2014 never synced centrally.",
  "SnapOrtho_ID": "canonicalCardId \u2014 do not edit",
  "SnapOrtho_Version": "canonicalCardVersionId \u2014 do not edit",
  "SnapOrtho_Installed_Hash": "central-sync hash of installed content \u2014 do not edit",
};

export const SNAPORTHO_FRONT_TEMPLATE = "{{#Text}}\n<div class=\"snaportho-card snaportho-front\">\n  <div class=\"brand-bar\" aria-hidden=\"true\">\n    <span class=\"brand-mark\">SnapOrtho</span>\n  </div>\n  <div class=\"cloze-body\">\n    {{cloze:Text}}\n  </div>\n</div>\n{{/Text}}\n{{^Text}}\n<div class=\"snaportho-card snaportho-front snaportho-empty\">\n  <p class=\"muted\">This card has no Text field yet.</p>\n</div>\n{{/Text}}\n" as const;

export const SNAPORTHO_BACK_TEMPLATE = "{{#Text}}\n<div class=\"snaportho-card snaportho-back\">\n  <div class=\"brand-bar\" aria-hidden=\"true\">\n    <span class=\"brand-mark\">SnapOrtho</span>\n  </div>\n\n  <div class=\"cloze-body\">\n    {{cloze:Text}}\n  </div>\n\n  {{#Extra}}\n  <div class=\"extra-block\">\n    <div class=\"extra-label\">Extra</div>\n    <div class=\"extra-body\">{{Extra}}</div>\n  </div>\n  {{/Extra}}\n\n  <div class=\"resource-stack\" id=\"snaportho-resources\">\n\n    {{#Orthobullets}}\n    <details class=\"resource\" data-resource=\"Orthobullets\">\n      <summary>Orthobullets</summary>\n      <div class=\"resource-body\">\n        {{Orthobullets}}\n        {{#Orthobullets_Link}}\n        <p class=\"resource-open\"><a class=\"external\" href=\"{{Orthobullets_Link}}\">Open Orthobullets ↗</a></p>\n        {{/Orthobullets_Link}}\n      </div>\n    </details>\n    {{/Orthobullets}}\n    {{^Orthobullets}}\n      {{#Orthobullets_Link}}\n      <details class=\"resource\" data-resource=\"Orthobullets\">\n        <summary>Orthobullets</summary>\n        <div class=\"resource-body\">\n          <p class=\"resource-open\"><a class=\"external\" href=\"{{Orthobullets_Link}}\">Open Orthobullets ↗</a></p>\n        </div>\n      </details>\n      {{/Orthobullets_Link}}\n    {{/Orthobullets}}\n\n    {{#ROCK}}\n    <details class=\"resource\" data-resource=\"ROCK\">\n      <summary>ROCK</summary>\n      <div class=\"resource-body\">\n        {{ROCK}}\n        {{#ROCK_Link}}\n        <p class=\"resource-open\"><a class=\"external\" href=\"{{ROCK_Link}}\">Open ROCK ↗</a></p>\n        {{/ROCK_Link}}\n      </div>\n    </details>\n    {{/ROCK}}\n    {{^ROCK}}\n      {{#ROCK_Link}}\n      <details class=\"resource\" data-resource=\"ROCK\">\n        <summary>ROCK</summary>\n        <div class=\"resource-body\">\n          <p class=\"resource-open\"><a class=\"external\" href=\"{{ROCK_Link}}\">Open ROCK ↗</a></p>\n        </div>\n      </details>\n      {{/ROCK_Link}}\n    {{/ROCK}}\n\n    {{#Nailed_It}}\n    <details class=\"resource\" data-resource=\"Nailed_It\">\n      <summary>Nailed It</summary>\n      <div class=\"resource-body\">\n        {{Nailed_It}}\n        {{#Nailed_It_Link}}\n        <p class=\"resource-open\"><a class=\"external\" href=\"{{Nailed_It_Link}}\">Open episode ↗</a></p>\n        {{/Nailed_It_Link}}\n      </div>\n    </details>\n    {{/Nailed_It}}\n    {{^Nailed_It}}\n      {{#Nailed_It_Link}}\n      <details class=\"resource\" data-resource=\"Nailed_It\">\n        <summary>Nailed It</summary>\n        <div class=\"resource-body\">\n          <p class=\"resource-open\"><a class=\"external\" href=\"{{Nailed_It_Link}}\">Open episode ↗</a></p>\n        </div>\n      </details>\n      {{/Nailed_It_Link}}\n    {{/Nailed_It}}\n\n    {{#Video}}\n    <details class=\"resource\" data-resource=\"Video\">\n      <summary>Video</summary>\n      <div class=\"resource-body\">\n        {{Video}}\n        {{#Video_Link}}\n        <p class=\"resource-open\"><a class=\"external\" href=\"{{Video_Link}}\">Open video ↗</a></p>\n        {{/Video_Link}}\n      </div>\n    </details>\n    {{/Video}}\n    {{^Video}}\n      {{#Video_Link}}\n      <details class=\"resource\" data-resource=\"Video\">\n        <summary>Video</summary>\n        <div class=\"resource-body\">\n          <p class=\"resource-open\"><a class=\"external\" href=\"{{Video_Link}}\">Open video ↗</a></p>\n        </div>\n      </details>\n      {{/Video_Link}}\n    {{/Video}}\n\n    {{#Millers}}\n    <details class=\"resource\" data-resource=\"Millers\">\n      <summary>Miller's</summary>\n      <div class=\"resource-body\">{{Millers}}</div>\n    </details>\n    {{/Millers}}\n\n    {{#OKU}}\n    <details class=\"resource\" data-resource=\"OKU\">\n      <summary>OKU</summary>\n      <div class=\"resource-body\">{{OKU}}</div>\n    </details>\n    {{/OKU}}\n\n    {{#Campbells}}\n    <details class=\"resource\" data-resource=\"Campbells\">\n      <summary>Campbell's</summary>\n      <div class=\"resource-body\">{{Campbells}}</div>\n    </details>\n    {{/Campbells}}\n\n    {{#Classifications}}\n    <details class=\"resource\" data-resource=\"Classifications\">\n      <summary>Classifications</summary>\n      <div class=\"resource-body\">{{Classifications}}</div>\n    </details>\n    {{/Classifications}}\n\n    {{#Anatomy}}\n    <details class=\"resource\" data-resource=\"Anatomy\">\n      <summary>Anatomy</summary>\n      <div class=\"resource-body\">{{Anatomy}}</div>\n    </details>\n    {{/Anatomy}}\n\n    {{#Podcasts}}\n    <details class=\"resource\" data-resource=\"Podcasts\">\n      <summary>Podcasts</summary>\n      <div class=\"resource-body\">\n        {{Podcasts}}\n        {{#Podcasts_Link}}\n        <p class=\"resource-open\"><a class=\"external\" href=\"{{Podcasts_Link}}\">Open podcast ↗</a></p>\n        {{/Podcasts_Link}}\n      </div>\n    </details>\n    {{/Podcasts}}\n    {{^Podcasts}}\n      {{#Podcasts_Link}}\n      <details class=\"resource\" data-resource=\"Podcasts\">\n        <summary>Podcasts</summary>\n        <div class=\"resource-body\">\n          <p class=\"resource-open\"><a class=\"external\" href=\"{{Podcasts_Link}}\">Open podcast ↗</a></p>\n        </div>\n      </details>\n      {{/Podcasts_Link}}\n    {{/Podcasts}}\n\n    {{#OITE}}\n    <details class=\"resource\" data-resource=\"OITE\">\n      <summary>OITE</summary>\n      <div class=\"resource-body\">{{OITE}}</div>\n    </details>\n    {{/OITE}}\n\n    {{#CasePrep}}\n    <details class=\"resource\" data-resource=\"CasePrep\">\n      <summary>Case Prep</summary>\n      <div class=\"resource-body\">{{CasePrep}}</div>\n    </details>\n    {{/CasePrep}}\n\n    {{#BroBot}}\n    <details class=\"resource\" data-resource=\"BroBot\">\n      <summary>BroBot</summary>\n      <div class=\"resource-body\">{{BroBot}}</div>\n    </details>\n    {{/BroBot}}\n\n    {{#Additional_Resources}}\n    <details class=\"resource\" data-resource=\"Additional_Resources\">\n      <summary>Additional</summary>\n      <div class=\"resource-body\">{{Additional_Resources}}</div>\n    </details>\n    {{/Additional_Resources}}\n\n    {{#Missed_Questions}}\n    <details class=\"resource\" data-resource=\"Missed_Questions\">\n      <summary>Missed Qs</summary>\n      <div class=\"resource-body\">{{Missed_Questions}}</div>\n    </details>\n    {{/Missed_Questions}}\n\n    {{#Personal_Notes}}\n    <details class=\"resource resource-personal\" data-resource=\"Personal_Notes\">\n      <summary>Personal Notes</summary>\n      <div class=\"resource-body\">{{Personal_Notes}}</div>\n    </details>\n    {{/Personal_Notes}}\n\n  </div>\n</div>\n{{/Text}}\n{{^Text}}\n<div class=\"snaportho-card snaportho-back snaportho-empty\">\n  <p class=\"muted\">This card has no Text field yet.</p>\n  {{#Extra}}\n  <div class=\"extra-block\">\n    <div class=\"extra-label\">Extra</div>\n    <div class=\"extra-body\">{{Extra}}</div>\n  </div>\n  {{/Extra}}\n</div>\n{{/Text}}\n\n<!-- SnapOrtho Master styleVersion: 1.0.0 — update via SnapOrtho → Update Card Style -->\n" as const;

export const SNAPORTHO_CARD_CSS = "/* SnapOrtho Master card style v1.0.0\n   Presentation only — resource payloads live in note fields.\n   User overrides: append after SNAPORTHO_STYLE_END if needed. */\n\n.card {\n  font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif;\n  font-size: 20px;\n  line-height: 1.45;\n  text-align: left;\n  color: var(--so-fg, #0f172a);\n  background-color: var(--so-bg, #f8fafc);\n  padding: 12px 14px 20px;\n}\n\n.nightMode .card,\n.card.night_mode {\n  --so-fg: #e2e8f0;\n  --so-bg: #0b1220;\n  --so-muted: #94a3b8;\n  --so-border: #1e293b;\n  --so-panel: #111827;\n  --so-accent: #38bdf8;\n  --so-accent-soft: rgba(56, 189, 248, 0.12);\n  --so-cloze: #fbbf24;\n  --so-extra: #1e293b;\n  --so-personal: #334155;\n}\n\n:root,\n.card {\n  --so-muted: #64748b;\n  --so-border: #e2e8f0;\n  --so-panel: #ffffff;\n  --so-accent: #0369a1;\n  --so-accent-soft: rgba(3, 105, 161, 0.08);\n  --so-cloze: #b45309;\n  --so-extra: #eff6ff;\n  --so-personal: #f1f5f9;\n}\n\n.snaportho-card {\n  max-width: 52rem;\n  margin: 0 auto;\n}\n\n.brand-bar {\n  display: flex;\n  align-items: center;\n  margin-bottom: 10px;\n}\n\n.brand-mark {\n  font-size: 11px;\n  font-weight: 700;\n  letter-spacing: 0.08em;\n  text-transform: uppercase;\n  color: var(--so-accent);\n  opacity: 0.85;\n}\n\n.cloze-body {\n  font-size: 1.08em;\n  background: var(--so-panel);\n  border: 1px solid var(--so-border);\n  border-radius: 12px;\n  padding: 16px 18px;\n  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);\n}\n\n.cloze {\n  font-weight: 700;\n  color: var(--so-cloze);\n}\n\n.clozeb {\n  font-weight: 700;\n  color: var(--so-accent);\n}\n\n.extra-block {\n  margin-top: 14px;\n  background: var(--so-extra);\n  border: 1px solid var(--so-border);\n  border-radius: 12px;\n  padding: 12px 14px;\n}\n\n.extra-label {\n  font-size: 11px;\n  font-weight: 700;\n  letter-spacing: 0.06em;\n  text-transform: uppercase;\n  color: var(--so-accent);\n  margin-bottom: 6px;\n}\n\n.extra-body {\n  font-size: 0.95em;\n}\n\n.resource-stack {\n  margin-top: 16px;\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n}\n\n.resource {\n  background: var(--so-panel);\n  border: 1px solid var(--so-border);\n  border-radius: 10px;\n  overflow: hidden;\n}\n\n.resource > summary {\n  list-style: none;\n  cursor: pointer;\n  user-select: none;\n  padding: 10px 14px;\n  font-size: 0.92em;\n  font-weight: 650;\n  color: var(--so-accent);\n  background: var(--so-accent-soft);\n  outline: none;\n}\n\n.resource > summary::-webkit-details-marker {\n  display: none;\n}\n\n.resource > summary::after {\n  content: \"▸\";\n  float: right;\n  color: var(--so-muted);\n  font-weight: 400;\n  transition: transform 0.12s ease;\n}\n\n.resource[open] > summary::after {\n  content: \"▾\";\n}\n\n.resource-body {\n  padding: 12px 14px 14px;\n  border-top: 1px solid var(--so-border);\n  font-size: 0.92em;\n}\n\n.resource-body ul {\n  margin: 0.35em 0 0.35em 1.1em;\n  padding: 0;\n}\n\n.resource-body p {\n  margin: 0.4em 0;\n}\n\n.resource-open {\n  margin-top: 10px !important;\n}\n\na.external {\n  color: var(--so-accent);\n  font-weight: 600;\n  text-decoration: none;\n  border-bottom: 1px solid color-mix(in srgb, var(--so-accent) 35%, transparent);\n}\n\na.external:hover {\n  border-bottom-color: var(--so-accent);\n}\n\n.resource-personal > summary {\n  color: var(--so-muted);\n  background: var(--so-personal);\n}\n\n.muted {\n  color: var(--so-muted);\n  font-size: 0.95em;\n}\n\nimg {\n  max-width: 100%;\n  height: auto;\n  border-radius: 8px;\n}\n\ntable {\n  border-collapse: collapse;\n  width: 100%;\n  margin: 0.5em 0;\n  font-size: 0.9em;\n}\n\nth,\ntd {\n  border: 1px solid var(--so-border);\n  padding: 6px 8px;\n  text-align: left;\n}\n\nth {\n  background: var(--so-accent-soft);\n}\n\n/* Mobile */\n.mobile .card {\n  font-size: 18px;\n  padding: 10px 10px 16px;\n}\n\n.mobile .cloze-body {\n  padding: 14px;\n}\n\n.mobile .resource > summary {\n  padding: 12px 12px;\n}\n\n/* SNAPORTHO_STYLE_END — user CSS overrides below this line survive style updates if preserved by the add-on */\n" as const;

