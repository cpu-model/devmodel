"""Rebuild the normative PDF addenda while preserving the core specification pages."""

import io
import re
from pathlib import Path
from xml.sax.saxutils import escape

from pypdf import PdfReader, PdfWriter
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, Preformatted, SimpleDocTemplate


ROOT = Path(__file__).resolve().parents[1]
PROCESS = ROOT / "CPU/PROCESS"
CORE_PAGE_COUNTS = {
    "CPU-Artifact-Formats-v1": 5,
    "CPU-Visual-Language-v1": 9,
}

for name, filename in (
    ("Body", "Arial.ttf"),
    ("BodyBold", "Arial Bold.ttf"),
    ("Code", "Courier New.ttf"),
):
    pdfmetrics.registerFont(
        TTFont(name, "/System/Library/Fonts/Supplemental/" + filename)
    )

STYLES = {
    "title": ParagraphStyle(
        "title", fontName="BodyBold", fontSize=19, leading=23,
        textColor=colors.HexColor("#172b48"), spaceAfter=15,
    ),
    "heading": ParagraphStyle(
        "heading", fontName="BodyBold", fontSize=12, leading=16,
        spaceBefore=12, spaceAfter=7, keepWithNext=True,
    ),
    "body": ParagraphStyle(
        "body", fontName="Body", fontSize=10, leading=14, spaceAfter=9,
        allowWidows=0, allowOrphans=0,
    ),
    "bullet": ParagraphStyle(
        "bullet", fontName="Body", fontSize=10, leading=14, leftIndent=12,
        firstLineIndent=-10, spaceAfter=6,
    ),
    "code": ParagraphStyle(
        "code", fontName="Code", fontSize=8.3, leading=11, spaceAfter=10,
        backColor=colors.HexColor("#f3f5f8"), borderPadding=9,
    ),
}


def inline(text: str) -> str:
    return re.sub(
        r"`([^`]+)`",
        lambda match: '<font name="Code" size="9">' + match[1] + "</font>",
        escape(text),
    )


def flowables(source: str) -> list:
    result = []
    paragraph = []
    code = None

    def flush() -> None:
        if paragraph:
            result.append(Paragraph(inline(" ".join(paragraph)), STYLES["body"]))
            paragraph.clear()

    for line in source.splitlines():
        if line.startswith("```"):
            flush()
            if code is None:
                code = []
            else:
                result.append(Preformatted("\n".join(code), STYLES["code"]))
                code = None
        elif code is not None:
            code.append(line)
        elif line.startswith("# "):
            flush()
            result.append(Paragraph(inline(line[2:]), STYLES["title"]))
        elif line.startswith("## "):
            flush()
            result.append(Paragraph(inline(line[3:]), STYLES["heading"]))
        elif line.startswith("- "):
            flush()
            result.append(Paragraph("• " + inline(line[2:]), STYLES["bullet"]))
        elif line.strip():
            paragraph.append(line)
        else:
            flush()
    flush()
    return result


def update(stem: str, core_page_count: int) -> None:
    pdf = PROCESS / f"{stem}.pdf"
    source = PROCESS / f"{stem}-requirements-addendum.md"
    appendix_buffer = io.BytesIO()

    def footer(canvas, document) -> None:
        canvas.saveState()
        canvas.setStrokeColor(colors.HexColor("#d6dce4"))
        canvas.line(46, 39, A4[0] - 46, 39)
        canvas.setFont("Body", 8)
        canvas.setFillColor(colors.HexColor("#536174"))
        canvas.drawString(46, 26, "Normative requirements addendum | 2026-09-18")
        canvas.drawRightString(
            A4[0] - 46, 26, "Supplement page " + str(document.page)
        )
        canvas.restoreState()

    document = SimpleDocTemplate(
        appendix_buffer, pagesize=A4, rightMargin=46, leftMargin=46,
        topMargin=42, bottomMargin=54,
    )
    document.build(
        flowables(source.read_text()), onFirstPage=footer, onLaterPages=footer
    )

    current = PdfReader(pdf)
    if len(current.pages) < core_page_count:
        raise ValueError(f"{pdf} has fewer than {core_page_count} core pages")

    appendix = PdfReader(appendix_buffer)
    writer = PdfWriter()
    for page in current.pages[:core_page_count]:
        writer.add_page(page)
    for page in appendix.pages:
        writer.add_page(page)
    writer.add_outline_item(
        "Requirements - normative addendum 2026-09-18", core_page_count
    )
    writer.add_metadata(
        {
            "/Title": stem + " with normative requirements addendum",
            "/Subject": "Context, Pulse, UI and attached requirements",
            "/Author": "CPU development model",
        }
    )
    with pdf.open("wb") as target:
        writer.write(target)

    check = PdfReader(pdf)
    expected_pages = core_page_count + len(appendix.pages)
    assert len(check.pages) == expected_pages
    appendix_text = " ".join(check.pages[core_page_count].extract_text().split())
    assert "normative v1 addendum" in appendix_text
    print(
        f"{pdf.name}: preserved {core_page_count} core pages, "
        f"added {len(appendix.pages)} pages"
    )


if __name__ == "__main__":
    for pdf_stem, pages in CORE_PAGE_COUNTS.items():
        update(pdf_stem, pages)
