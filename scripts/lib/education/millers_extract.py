#!/usr/bin/env python3
"""Extract Miller's Review of Orthopaedics into a structured corpus JSON.

Source of truth: the local PDF. Emits one JSON with:
  - meta: title, edition, pdf path basename, page_count, printed_offset, checksum inputs
  - toc: [{level, title, pdf_page, pdf_page_end, printed_page}]
  - pages: [{pdf_page, printed_page, text}]

Printed page = the number the book prints on the page (what a citation should use).
We derive it from a fixed offset (body start) and confirm against a header/footer
number when one is parseable; `printed_page` is null for front matter.

Usage: millers_extract.py <pdf_path> <out_json>
"""
import json
import re
import sys
import unicodedata

import pymupdf  # type: ignore


def clean(text: str) -> str:
    text = unicodedata.normalize("NFKC", text)
    # collapse the tabbed table whitespace pymupdf emits, keep line structure
    text = text.replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: millers_extract.py <pdf_path> <out_json>", file=sys.stderr)
        return 2
    pdf_path, out_path = sys.argv[1], sys.argv[2]
    doc = pymupdf.open(pdf_path)

    # The pdf->printed offset DRIFTS across the book (unnumbered plates/inserts
    # accumulate), so a constant offset misciteS. Instead read the printed number
    # off each page: books print it as a bare integer on its own line near the top
    # or bottom of the running head. Detect where possible, interpolate the rest.
    def detect_printed(text: str):
        lines = [ln.strip() for ln in text.split("\n") if ln.strip()]
        for band in (lines[:3], lines[-3:]):
            for ln in band:
                if re.fullmatch(r"\d{1,3}", ln):
                    n = int(ln)
                    if 1 <= n <= 900:
                        return n
        return None

    raw_texts = [clean(doc[i].get_text("text")) for i in range(doc.page_count)]
    detected = [detect_printed(t) for t in raw_texts]

    # Interpolate printed numbers for pages where none was detected, anchoring to
    # the nearest detected neighbours (printed advances 1:1 with pdf pages locally).
    printed = [None] * doc.page_count
    last_i = last_p = None
    for i, d in enumerate(detected):
        if d is not None:
            printed[i] = d
            last_i, last_p = i, d
        elif last_p is not None:
            printed[i] = last_p + (i - last_i)
    # Backfill leading gaps (front matter) by walking left from the first anchor.
    first_anchor = next((i for i, d in enumerate(detected) if d is not None), None)
    if first_anchor is not None:
        for i in range(first_anchor - 1, -1, -1):
            cand = printed[first_anchor] - (first_anchor - i)
            printed[i] = cand if cand >= 1 else None

    pages = []
    for i in range(doc.page_count):
        pages.append({
            "pdf_page": i + 1,
            "printed_page": printed[i],
            "printed_detected": detected[i] is not None,
            "text": raw_texts[i],
        })

    # TOC: [level, title, pdf_page]; compute the span end for each entry as the
    # pdf_page just before the next entry at the same-or-shallower level.
    raw_toc = doc.get_toc()
    toc = []
    for idx, (level, title, pdf_page) in enumerate(raw_toc):
        end = doc.page_count
        for j in range(idx + 1, len(raw_toc)):
            if raw_toc[j][0] <= level:
                end = max(pdf_page, raw_toc[j][2] - 1)
                break
        toc.append({
            "level": level,
            "title": clean(title),
            "pdf_page": pdf_page,
            "pdf_page_end": end,
            "printed_page": printed[pdf_page - 1] if 1 <= pdf_page <= doc.page_count else None,
        })

    corpus = {
        "meta": {
            "title": "Miller's Review of Orthopaedics",
            "edition": "8th",
            "publisher": "Elsevier",
            "year": 2019,
            "page_count": doc.page_count,
            "printed_detected_count": sum(1 for d in detected if d is not None),
        },
        "toc": toc,
        "pages": pages,
    }
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(corpus, fh, ensure_ascii=False)
    print(json.dumps({
        "pages": len(pages),
        "toc": len(toc),
        "printed_detected": sum(1 for d in detected if d is not None),
        "out": out_path,
    }))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
