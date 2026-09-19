"""Validate the Context-Pulse-UI rename without rejecting nested View concepts."""

import re
from pathlib import Path

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
PROCESS = ROOT / "CPU/PROCESS"

TEXT_SOURCES = [ROOT / "README.md", *sorted(PROCESS.glob("*.md"))]
PDF_SOURCES = sorted(PROCESS.glob("*.pdf"))

FORBIDDEN = {
    "top-level triplet": re.compile(r"Context\s*,\s*Pulse\s*,?\s*(?:and\s+)?View"),
    "legacy source filename": re.compile(r"\bview\.yaml\b"),
    "legacy generated filenames": re.compile(r"\bview\.(?:d2|svg|png)\b"),
    "legacy requirement namespace": re.compile(r"\bview\.(?:view|action|info)\."),
    "legacy YAML root": re.compile(r"(?m)^view:\s*$"),
    "legacy artifact heading": re.compile(r"(?m)^\s*5\. View(?: format)?\s*$"),
}

REQUIRED = {
    "CPU expansion": re.compile(r"Context[-–—, ]+Pulse[-–—, ]+UI"),
    "UI source filename": re.compile(r"\bui\.yaml\b"),
    "nested View concept": re.compile(r"\bViews?\b"),
    "UI requirement namespace": re.compile(r"\bui\.(?:view|action|info)\."),
}


def read_pdf(path: Path) -> str:
    return "\n".join(page.extract_text() or "" for page in PdfReader(path).pages)


def main() -> None:
    documents = {str(path.relative_to(ROOT)): path.read_text() for path in TEXT_SOURCES}
    documents.update(
        {str(path.relative_to(ROOT)): read_pdf(path) for path in PDF_SOURCES}
    )
    combined = "\n".join(documents.values())

    errors = []
    for label, pattern in FORBIDDEN.items():
        for filename, text in documents.items():
            if pattern.search(text):
                errors.append(f"{label} remains in {filename}")

    for label, pattern in REQUIRED.items():
        if not pattern.search(combined):
            errors.append(f"{label} is missing")

    if errors:
        raise SystemExit("\n".join(errors))
    print(f"Validated {len(documents)} documents: top-level UI and nested View are consistent.")


if __name__ == "__main__":
    main()
