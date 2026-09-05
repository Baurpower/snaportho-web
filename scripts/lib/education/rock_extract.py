#!/usr/bin/env python3
"""Extract the local ROCK chapter PDF library into a structured corpus.

Source of truth: rock-library/pdfs (and needs-review/). Never fetches rock.aaos.org.

Emits:
  <out>/catalog.json     chapter rollup, duplicate-title canonicalization
  <out>/chapters/<id>.json   {id, title, url, pages:[{pdf_page, text, chars}]}

Usage:
  python3 scripts/lib/education/rock_extract.py
  python3 scripts/lib/education/rock_extract.py --library ../rock-library --out tmp/rock-enrichment/index
  python3 scripts/lib/education/rock_extract.py --limit 5
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
from collections import defaultdict
from pathlib import Path

import pymupdf  # type: ignore

REPO_WEB = Path(__file__).resolve().parents[3]
REPO_ROOT = REPO_WEB.parent
DEFAULT_LIBRARY = REPO_ROOT / "rock-library"
DEFAULT_OUT = REPO_WEB / "tmp" / "rock-enrichment" / "index"

MIN_PAGE_CHARS = 40
FIGURE_HEAVY_CHARS_PER_PAGE = 180

# Reference/bibliography page detection. These pages ("Recommended Readings",
# numbered citation lists) are dense with the chapter's own topic words inside
# citation titles, so BM25 ranks them above the teaching pages. They must never
# be handed to a fill agent as grounding, so we flag them at extract time.
CITATION_MARKERS = re.compile(
    r"PubMed|Full Text|Am J |J Bone Joint|Foot Ankle Int|Clin Orthop"
    r"|J Am Acad Orthop|Arthrosc|;\d{4};\d|\bvol \d|\beds:|, ed \d",
    re.IGNORECASE,
)
NUM_CITATION = re.compile(r"(?:^|\s)\d{1,3}\.\s+[A-Z][A-Za-z'’-]+ [A-Z]{1,3}[,: ]")
REFERENCE_HEADING = re.compile(r"\b(Recommended Readings|References)\b", re.IGNORECASE)


def is_reference_page(text: str) -> bool:
    """True when a page is dominated by bibliographic citations."""
    if not text:
        return False
    markers = len(CITATION_MARKERS.findall(text))
    num_cites = len(NUM_CITATION.findall(text))
    if REFERENCE_HEADING.search(text) and (markers + num_cites) >= 3:
        return True
    return markers >= 5 or num_cites >= 5


def clean(text: str) -> str:
    text = unicodedata.normalize("NFKC", text)
    text = text.replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def norm_title(title: str) -> str:
    text = unicodedata.normalize("NFKC", title).lower()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return text.strip()


def catalog_url(chapter_id: str) -> str:
    return f"https://rock.aaos.org/coursecontent.aspx?id={chapter_id}"


def find_pdf(library: Path, chapter_id: str) -> Path | None:
    for folder in (library / "pdfs", library / "needs-review"):
        if not folder.is_dir():
            continue
        matches = sorted(folder.glob(f"{chapter_id}_*.pdf"))
        if matches:
            return matches[0]
        exact = folder / f"{chapter_id}.pdf"
        if exact.exists():
            return exact
    return None


def extract_pdf(path: Path) -> tuple[list[dict], str | None]:
    try:
        doc = pymupdf.open(path)
    except Exception as exc:  # noqa: BLE001 — surface extract errors in the catalog
        return [], str(exc)
    pages = []
    try:
        for i in range(doc.page_count):
            text = clean(doc[i].get_text("text") or "")
            pages.append(
                {
                    "pdf_page": i + 1,
                    "text": text,
                    "chars": len(text),
                    "reference": is_reference_page(text),
                }
            )
    finally:
        doc.close()
    return pages, None


def canonical_rank(row: dict) -> tuple:
    verified = 1 if row.get("status") == "verified" else 0
    pages = int(row.get("pages") or 0)
    chars = int(row.get("extractableChars") or 0)
    prefers_current = 1 if str(row["id"]).startswith("600") else 0
    bytes_ = int(row.get("bytes") or 0)
    return (verified, pages, chars, prefers_current, bytes_)


def main() -> int:
    parser = argparse.ArgumentParser(description="Extract ROCK chapter PDFs into a local corpus")
    parser.add_argument("--library", type=Path, default=DEFAULT_LIBRARY)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--limit", type=int, default=0, help="Max chapters to extract (0 = all)")
    parser.add_argument("--ids", type=str, default="", help="Comma-separated chapter IDs")
    args = parser.parse_args()

    library: Path = args.library.resolve()
    out: Path = args.out.resolve()
    catalog_path = library / "catalog.json"
    status_path = library / "status.json"
    if not catalog_path.exists():
        print(f"missing catalog: {catalog_path}", file=sys.stderr)
        return 2

    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
    status_by_id = {}
    if status_path.exists():
        for row in json.loads(status_path.read_text(encoding="utf-8")):
            status_by_id[str(row["id"])] = row

    wanted = {part.strip() for part in args.ids.split(",") if part.strip()}
    items = list(catalog)
    if wanted:
        items = [item for item in items if str(item["id"]) in wanted]
    if args.limit and args.limit > 0:
        items = items[: args.limit]

    out.mkdir(parents=True, exist_ok=True)
    chapters_dir = out / "chapters"
    chapters_dir.mkdir(parents=True, exist_ok=True)

    chapters: list[dict] = []
    extracted = 0
    missing = 0
    failed = 0
    figure_heavy = 0

    for item in items:
        chapter_id = str(item["id"])
        title = str(item["title"])
        url = str(item.get("url") or catalog_url(chapter_id))
        status_row = status_by_id.get(chapter_id, {})
        pdf = find_pdf(library, chapter_id)
        row = {
            "id": chapter_id,
            "title": title,
            "titleKey": norm_title(title),
            "url": url,
            "filename": None,
            "pages": 0,
            "bytes": 0,
            "extractableChars": 0,
            "charsPerPage": 0,
            "status": status_row.get("status") or ("pending" if pdf is None else "extracted"),
            "extractable": False,
            "error": None,
        }
        if pdf is None:
            missing += 1
            chapters.append(row)
            continue
        row["filename"] = pdf.name
        row["bytes"] = pdf.stat().st_size
        pages, error = extract_pdf(pdf)
        if error:
            failed += 1
            row["status"] = "needs_review"
            row["error"] = error
            chapters.append(row)
            continue
        extractable_chars = sum(p["chars"] for p in pages)
        page_count = len(pages)
        reference_pages = sum(1 for p in pages if p["reference"])
        teaching_pages = page_count - reference_pages
        chars_per_page = extractable_chars / page_count if page_count else 0
        row["pages"] = page_count
        row["referencePages"] = reference_pages
        row["teachingPages"] = teaching_pages
        row["extractableChars"] = extractable_chars
        row["charsPerPage"] = round(chars_per_page, 1)
        row["extractable"] = chars_per_page >= FIGURE_HEAVY_CHARS_PER_PAGE and extractable_chars >= MIN_PAGE_CHARS * 2
        if not row["extractable"]:
            figure_heavy += 1
            if row["status"] == "verified":
                row["status"] = "figure_heavy"
        chapter_path = chapters_dir / f"{chapter_id}.json"
        chapter_path.write_text(
            json.dumps(
                {
                    "id": chapter_id,
                    "title": title,
                    "url": url,
                    "filename": pdf.name,
                    "pages": pages,
                },
                ensure_ascii=False,
            ),
            encoding="utf-8",
        )
        extracted += 1
        chapters.append(row)

    groups: dict[str, list[dict]] = defaultdict(list)
    for row in chapters:
        groups[row["titleKey"] or row["id"]].append(row)

    for group in groups.values():
        ranked = sorted(group, key=canonical_rank, reverse=True)
        canonical = ranked[0]
        alias_ids = [row["id"] for row in ranked[1:]]
        for row in ranked:
            row["canonicalId"] = canonical["id"]
            row["aliasIds"] = alias_ids if row["id"] == canonical["id"] else []
            row["isCanonical"] = row["id"] == canonical["id"]

    rollup = {
        "meta": {
            "source": "rock-library",
            "catalogCount": len(catalog),
            "extracted": extracted,
            "missing": missing,
            "failed": failed,
            "figureHeavy": figure_heavy,
            "duplicateTitleGroups": sum(1 for g in groups.values() if len(g) > 1),
        },
        "chapters": chapters,
    }
    (out / "catalog.json").write_text(json.dumps(rollup, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({"out": str(out), **rollup["meta"]}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
