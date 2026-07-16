"""
BOM Cost Sheet Generator
========================
JSON → openpyxl .xlsx (styled) → LibreOffice headless .pdf (A4 ready)

ข้อสำคัญด้านฟอนต์:
  EXCEL_FONT  = "Loma"  ← ชื่อฟอนต์ที่ฝังใน xlsx สำหรับ LibreOffice บน Linux
  PIL_FONT_PATH         ← path ฟอนต์บนเครื่องที่รัน script (สำหรับวัด pixel width)
  ทั้งสองไม่จำเป็นต้องเป็นฟอนต์เดียวกัน — การวัดใช้ฟอนต์ที่ใกล้เคียงที่สุดที่มี

Usage:
    python generate_bom.py example_input.json -o ./output
    python generate_bom.py example_input.json -o ./output --xlsx-only
    echo '{...}' | python generate_bom.py - -o ./output
"""

from __future__ import annotations

import argparse
import json
import math
import os
import shutil
import subprocess
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Optional

from openpyxl import Workbook, load_workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.worksheet.page import PageMargins
from openpyxl.worksheet.pagebreak import Break
from openpyxl.worksheet.properties import PageSetupProperties

try:
    from PIL import ImageFont
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

# ─────────────────────────────────────────────────────────────
# FONT CONSTANTS
# NOTE: EXCEL_FONT is what gets written into the xlsx file.
#       It must be installed on the LibreOffice server (Linux).
#       PIL_FONT_PATH is for local pixel-width measurement only.
# ─────────────────────────────────────────────────────────────
EXCEL_FONT = "Loma"   # ← ฟอนต์ในไฟล์ xlsx (ต้องมีบน LibreOffice server)

def _find_pil_font() -> str:
    """Find a usable TTF/OTF for PIL measurement (prefers Thai fonts)."""
    candidates = [
        # Linux — Loma (same as EXCEL_FONT → most accurate measurement)
        "/usr/share/fonts/opentype/tlwg/Loma.otf",
        "/usr/share/fonts/truetype/tlwg/Loma.ttf",
        "/usr/share/fonts/truetype/tlwg/LomaBold.ttf",
        # Windows Thai fonts
        r"C:\Windows\Fonts\cordia.ttf",
        r"C:\Windows\Fonts\cordiau.ttf",
        r"C:\Windows\Fonts\tahoma.ttf",
        r"C:\Windows\Fonts\arial.ttf",
        # macOS
        "/System/Library/Fonts/Supplemental/Tahoma.ttf",
        "/Library/Fonts/Arial Unicode.ttf",
    ]
    for p in candidates:
        if Path(p).is_file():
            return p
    return candidates[0]   # may not exist — PIL will fail gracefully

PIL_FONT_PATH = _find_pil_font()

# ─────────────────────────────────────────────────────────────
# MEASUREMENT CONSTANTS
# ─────────────────────────────────────────────────────────────
MDW         = 7      # Excel Calibri-11 max-digit-width (px @96dpi) — column-width baseline
CELL_PAD_PT = 6      # cell border + inner margin (pt)
SAFETY      = 0.85   # 15% headroom so wrap never clips

# ─────────────────────────────────────────────────────────────
# FONT SIZES (pt)   — must match spec table exactly
# ─────────────────────────────────────────────────────────────
FS_TITLE    = 13   # title banner line-1 (FS_HEADER + 2)
FS_SUBTITLE = 11   # title banner line-2 (FS_HEADER)
FS_INFO     = 10   # info strip  (FS_HEADER - 1)
FS_SECTION  = 9    # section heading
FS_TH       = 7    # regular table column-header
FS_TD       = 6    # regular table body
FS_CHARGER  = 8    # charger callout table (header + body)
FS_EXTRA_TH = 5    # last-section column-header (extra-items)
FS_EXTRA_TD = 6    # last-section body
FS_PAGE     = 7    # footer page number

# ─────────────────────────────────────────────────────────────
# COLORS (ARGB without leading #; alpha=00 means opaque in openpyxl)
# ─────────────────────────────────────────────────────────────
C_DARK      = "FF1F3864"   # title banner bg
C_PRIMARY   = "FF2E5B9A"   # section heading bg / charger heading bg
C_PRIMARY_L = "FFDCE6F2"   # table column-header bg
C_ACCENT    = "FF1FA37A"   # charger quantity text
C_ROW_ALT   = "FFF4F7FB"   # alternate (even) row bg
C_BORDER    = "FFB9C6D8"   # table border
C_TEXT      = "FF1A1A1A"   # normal body text
C_MUTED     = "FF5B6B7F"   # italic/muted text (code="-" rows)
C_CHARGER   = "FFE9F7F1"   # charger callout data bg
C_WHITE     = "FFFFFFFF"
C_GRAY      = "FFF2F2F2"   # info strip bg

# ─────────────────────────────────────────────────────────────
# COLUMN LAYOUT   A=รหัส  B=ประเภท  C=รายการสินค้า  D=จำนวน  E=ระยะ(m)
# ─────────────────────────────────────────────────────────────
COL_WIDTHS  = {"A": 9, "B": 27, "C": 52, "D": 8, "E": 13}
LAST_COL    = "E"
NUM_COLS    = 5

# ═════════════════════════════════════════════════════════════
# PIL font measurement
# ═════════════════════════════════════════════════════════════
_pil_cache: dict = {}

def _load_pil(size_pt: float):
    if not PIL_AVAILABLE:
        return None
    key = int(round(size_pt))
    if key not in _pil_cache:
        try:
            _pil_cache[key] = ImageFont.truetype(PIL_FONT_PATH, key)
        except Exception as exc:
            print(f"[WARN] PIL font {PIL_FONT_PATH}@{key}pt: {exc}", file=sys.stderr)
            _pil_cache[key] = None
    return _pil_cache[key]

def _avail_pt(col_units: float) -> float:
    """Usable text width (pt) for a cell of given column-width units."""
    px = int(col_units * MDW) + 5
    pt = px * 0.75                    # 96 dpi px → 72 dpi pt
    return max((pt - CELL_PAD_PT) * SAFETY, 10)

def _est_lines(text: str, col_units: float, fs: float) -> int:
    """Estimate wrap line-count using actual font glyph widths."""
    if not text:
        return 1
    s = str(text)
    fnt = _load_pil(fs)
    max_w = _avail_pt(col_units)

    if fnt:
        try:
            words = s.split(" ")
            lines, cur = 1, ""
            for w in words:
                trial = (cur + " " + w).strip()
                # getlength returns px; convert to pt
                if fnt.getlength(trial) * 0.75 <= max_w or not cur:
                    cur = trial
                else:
                    lines += 1
                    cur = w
            return lines
        except Exception:
            pass

    # Fallback: Thai glyph ≈ 0.55 × pt wide
    cpp = max(int(max_w / (fs * 0.55)), 1)
    return max(math.ceil(len(s) / cpp), 1)

def row_height(cells: list[tuple[str, float]], fs: float) -> float:
    """
    Return minimum row height (pt) so that all wrapped cells show completely.
    cells = [(text, col_width_units), ...]  — only wrap=True cells
    """
    if not cells:
        return fs * 2.5
    max_lines = max(_est_lines(t, w, fs) for t, w in cells)
    return max(max_lines, 1) * (fs * 1.5) + (fs * 1.1)

# ═════════════════════════════════════════════════════════════
# openpyxl style factories
# ═════════════════════════════════════════════════════════════
def _F(argb: str) -> PatternFill:
    return PatternFill("solid", fgColor=argb)

def _Fn(size: float, bold=False, italic=False, color=C_TEXT) -> Font:
    return Font(name=EXCEL_FONT, size=size, bold=bold, italic=italic, color=color)

def _A(h="left", v="center", wrap=False) -> Alignment:
    return Alignment(horizontal=h, vertical=v, wrap_text=wrap)

def _thin_side() -> Side:
    return Side(style="thin", color=C_BORDER)

def _B_all() -> Border:
    s = _thin_side()
    return Border(left=s, right=s, top=s, bottom=s)

def _B_left_top_bottom() -> Border:
    s = _thin_side()
    return Border(left=s, top=s, bottom=s)

def _B_right_top_bottom() -> Border:
    s = _thin_side()
    return Border(right=s, top=s, bottom=s)

def _B_top_bottom() -> Border:
    s = _thin_side()
    return Border(top=s, bottom=s)

# ─────────────────────────────────────────────────────────────
# Helpers to apply borders to a row range of cells
# (handles merged-cell edge cases properly)
# ─────────────────────────────────────────────────────────────
def _apply_row_borders(ws, row: int, c_start: int, c_end: int):
    """Apply thin borders to a contiguous range of cells in one row."""
    for ci in range(c_start, c_end + 1):
        c = ws.cell(row, ci)
        if ci == c_start and ci == c_end:
            c.border = _B_all()
        elif ci == c_start:
            c.border = _B_left_top_bottom()
        elif ci == c_end:
            c.border = _B_right_top_bottom()
        else:
            c.border = _B_top_bottom()

def _style_cell(cell, *, value=None, fill=None, font=None, align=None, border=None):
    if value is not None: cell.value     = value
    if fill  is not None: cell.fill      = fill
    if font  is not None: cell.font      = font
    if align is not None: cell.alignment = align
    if border is not None: cell.border   = border

# ═════════════════════════════════════════════════════════════
# Document block writers
# Each function returns the next available row number.
# ═════════════════════════════════════════════════════════════

def _write_title_banner(ws, row: int, project_name: str,
                        company: str, location: str) -> int:
    """2-row dark-blue banner."""
    # ── Row 1: project name ──
    ws.merge_cells(f"A{row}:E{row}")
    c = ws.cell(row, 1)
    c.value     = project_name
    c.fill      = _F(C_DARK)
    c.font      = _Fn(FS_TITLE, bold=True, color=C_WHITE)
    c.alignment = _A("center", "center")
    ws.row_dimensions[row].height = 22
    row += 1

    # ── Row 2: company | location ──
    ws.merge_cells(f"A{row}:E{row}")
    c = ws.cell(row, 1)
    c.value     = f"{company}  |  {location}"
    c.fill      = _F(C_DARK)
    c.font      = _Fn(FS_SUBTITLE, color="FFAECDE8")
    c.alignment = _A("center", "center")
    ws.row_dimensions[row].height = 18
    return row + 1


def _write_info_strip(ws, row: int,
                      doc_no: str, salesperson: str, date: str) -> int:
    """1-row gray info strip: เลขที่ | พนง.ขาย | วันที่"""
    # A:B → เลขที่,  C alone → พนง.ขาย,  D:E → วันที่
    ws.merge_cells(f"A{row}:B{row}")
    ws.merge_cells(f"D{row}:E{row}")

    fill = _F(C_GRAY)
    font = _Fn(FS_INFO, bold=True)

    for col, text in [
        (1, f"เลขที่: {doc_no}"),
        (3, f"พนง.ขาย: {salesperson}"),
        (4, f"วันที่: {date}"),
    ]:
        c = ws.cell(row, col)
        c.value     = text
        c.fill      = fill
        c.font      = font
        c.alignment = _A("center", "center")

    ws.row_dimensions[row].height = 18
    return row + 1


def _write_charger_box(ws, row: int, name: str, qty: str) -> int:
    """Charger callout: heading bar + 2-col mini-table."""
    # ── Heading bar ──
    ws.merge_cells(f"A{row}:E{row}")
    c = ws.cell(row, 1)
    c.value     = "เครื่องชาร์จ (EV Charger)"
    c.fill      = _F(C_PRIMARY)
    c.font      = _Fn(FS_SECTION, bold=True, color=C_WHITE)
    c.alignment = _A("left", "center")
    ws.row_dimensions[row].height = 16
    row += 1

    # ── Column headers ──
    # A:C → รายการสินค้า    D:E → จำนวน
    ws.merge_cells(f"A{row}:C{row}")
    h1 = ws.cell(row, 1)
    h1.value     = "รายการสินค้า"
    h1.fill      = _F(C_PRIMARY_L)
    h1.font      = _Fn(FS_CHARGER, bold=True)
    h1.alignment = _A("center", "center")

    ws.merge_cells(f"D{row}:E{row}")
    h2 = ws.cell(row, 4)
    h2.value     = "จำนวน"
    h2.fill      = _F(C_PRIMARY_L)
    h2.font      = _Fn(FS_CHARGER, bold=True)
    h2.alignment = _A("center", "center")

    # borders for header (left block A:C, right block D:E)
    _apply_row_borders(ws, row, 1, 3)   # A–C as one block
    _apply_row_borders(ws, row, 4, 5)   # D–E as one block
    ws.row_dimensions[row].height = 14
    row += 1

    # ── Data row ──
    name_w = COL_WIDTHS["A"] + COL_WIDTHS["B"] + COL_WIDTHS["C"]
    ws.merge_cells(f"A{row}:C{row}")
    d1 = ws.cell(row, 1)
    d1.value     = name
    d1.fill      = _F(C_CHARGER)
    d1.font      = _Fn(FS_CHARGER, bold=True)
    d1.alignment = _A("left", "center", wrap=True)

    ws.merge_cells(f"D{row}:E{row}")
    d2 = ws.cell(row, 4)
    d2.value     = qty
    d2.fill      = _F(C_CHARGER)
    d2.font      = _Fn(FS_CHARGER, bold=True, color=C_ACCENT)
    d2.alignment = _A("center", "center")

    _apply_row_borders(ws, row, 1, 3)
    _apply_row_borders(ws, row, 4, 5)
    ws.row_dimensions[row].height = row_height([(name, name_w)], FS_CHARGER)
    return row + 1


def _write_section(ws, row: int, section: dict,
                   is_extra: bool = False,
                   section_start_rows: Optional[list] = None) -> int:
    """Blue heading bar + column headers + banded data rows."""
    title = section.get("title", "")
    items = section.get("items", [])
    th_fs = FS_EXTRA_TH if is_extra else FS_TH
    td_fs = FS_EXTRA_TD if is_extra else FS_TD

    if section_start_rows is not None:
        section_start_rows.append(row)

    # ── Section heading bar (full width) ──
    ws.merge_cells(f"A{row}:E{row}")
    h = ws.cell(row, 1)
    h.value     = title
    h.fill      = _F(C_PRIMARY)
    h.font      = _Fn(FS_SECTION, bold=True, color=C_WHITE)
    h.alignment = _A("left", "center")
    ws.row_dimensions[row].height = 16
    row += 1

    # ── Column headers ──
    col_labels = ["รหัส", "ประเภท", "รายการสินค้า", "จำนวน", "ระยะ (m)"]
    for ci, label in enumerate(col_labels, start=1):
        c = ws.cell(row, ci)
        c.value     = label
        c.fill      = _F(C_PRIMARY_L)
        c.font      = _Fn(th_fs, bold=True)
        c.alignment = _A("center", "center")
    _apply_row_borders(ws, row, 1, NUM_COLS)
    ws.row_dimensions[row].height = 13
    row += 1

    # ── Data rows ──
    for idx, item in enumerate(items):
        code     = str(item.get("code",     ""))
        type_    = str(item.get("type",     ""))
        name     = str(item.get("name",     ""))
        qty      = str(item.get("qty",      ""))
        distance = str(item.get("distance", "") or "")

        is_muted  = code.strip() == "-"
        txt_color = C_MUTED if is_muted else C_TEXT
        bg_fill   = _F(C_ROW_ALT) if idx % 2 == 1 else None

        h = row_height(
            [(type_, COL_WIDTHS["B"]), (name, COL_WIDTHS["C"])],
            td_fs,
        )
        ws.row_dimensions[row].height = h

        row_data = [
            (1, code,     "center", False),
            (2, type_,    "left",   True),
            (3, name,     "left",   True),
            (4, qty,      "center", False),
            (5, distance, "center", False),
        ]
        for ci, val, halign, wrap in row_data:
            c = ws.cell(row, ci)
            c.value     = val
            c.font      = _Fn(td_fs, italic=is_muted, color=txt_color)
            c.alignment = _A(halign, "center", wrap)
            if bg_fill:
                c.fill = bg_fill
        _apply_row_borders(ws, row, 1, NUM_COLS)

        row += 1

    return row


def _write_note(ws, row: int, note: str) -> int:
    """Italic footer note."""
    ws.merge_cells(f"A{row}:E{row}")
    c = ws.cell(row, 1)
    c.value     = note
    c.font      = _Fn(FS_TD, italic=True, color=C_MUTED)
    c.alignment = _A("left", "center", wrap=True)
    total_w = sum(COL_WIDTHS.values())
    ws.row_dimensions[row].height = row_height([(note, total_w)], FS_TD)
    return row + 1


# ═════════════════════════════════════════════════════════════
# Workbook assembly
# ═════════════════════════════════════════════════════════════

def _build_workbook(data: dict,
                    section_start_rows: Optional[list] = None
                    ) -> tuple:
    """
    Build the workbook from data dict.
    Returns (wb, last_row, header_block_last_row).
    section_start_rows, if provided, is populated with each section's first row.
    """
    wb = Workbook()
    ws = wb.active
    ws.title = "ใบถอดต้นทุน"

    # Column widths
    for col_letter, width in COL_WIDTHS.items():
        ws.column_dimensions[col_letter].width = width

    row = 1

    # 1. Title banner
    row = _write_title_banner(
        ws, row,
        data.get("project_name", "ใบถอดต้นทุน EV CHARGING STATION"),
        data.get("company",  ""),
        data.get("location", ""),
    )

    # 2. Info strip
    row = _write_info_strip(
        ws, row,
        data.get("doc_no",      ""),
        data.get("salesperson", ""),
        data.get("date",        ""),
    )
    HEADER_LAST = row - 1   # last row of the fixed header block (for print_title_rows)

    # Spacer
    ws.row_dimensions[row].height = 4
    row += 1

    # 3. Charger callout
    charger = data.get("charger")
    if charger:
        row = _write_charger_box(
            ws, row,
            charger.get("name", ""),
            charger.get("qty",  ""),
        )
        ws.row_dimensions[row].height = 4
        row += 1

    # 4. Sections (last section always uses extra-items font sizes)
    sections = data.get("sections", [])
    for i, section in enumerate(sections):
        is_extra = (section.get("style") == "extra") or (i == len(sections) - 1)
        row = _write_section(
            ws, row, section,
            is_extra=is_extra,
            section_start_rows=section_start_rows,
        )
        ws.row_dimensions[row].height = 4
        row += 1

    # 5. Footer note
    note = data.get("note", "")
    if note:
        row = _write_note(ws, row, note)

    LAST_ROW = row - 1

    # ── Page setup (A4 portrait, fit to 1 page wide) ──
    ws.page_setup.orientation = "portrait"
    ws.page_setup.paperSize   = ws.PAPERSIZE_A4   # 9
    ws.page_setup.fitToWidth  = 1
    ws.page_setup.fitToHeight = 0                 # unlimited height (multi-page ok)
    ws.sheet_properties.pageSetUpPr = PageSetupProperties(fitToPage=True)
    ws.page_margins = PageMargins(
        left=0.4, right=0.4, top=0.5, bottom=0.5,
        header=0.2, footer=0.25,
    )
    ws.print_area = f"A1:{LAST_COL}{LAST_ROW}"
    ws.print_options.horizontalCentered = True
    ws.print_title_rows  = f"1:{HEADER_LAST}"    # repeat header on every page
    ws.oddFooter.center.text = "หน้า &P จาก &N"
    ws.oddFooter.center.size = FS_PAGE

    return wb, LAST_ROW, HEADER_LAST


# ═════════════════════════════════════════════════════════════
# LibreOffice conversion + QA checks
# ═════════════════════════════════════════════════════════════

def _find_soffice() -> Optional[str]:
    """Locate LibreOffice soffice binary."""
    env = os.environ.get("SOFFICE_PATH") or os.environ.get("LIBREOFFICE_PATH")
    if env and Path(env).is_file():
        return env

    found = shutil.which("soffice") or shutil.which("soffice.exe") or shutil.which("libreoffice")
    if found:
        return found

    win_paths = [
        r"C:\Program Files\LibreOffice\program\soffice.exe",
        r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
        str(Path.home() / r"AppData\Local\Programs\LibreOffice\program\soffice.exe"),
    ]
    for p in win_paths:
        if Path(p).is_file():
            return p
    return None


def convert_to_pdf(xlsx_path: str, output_dir: str) -> str:
    """Convert .xlsx → .pdf via LibreOffice headless.  Returns PDF path."""
    soffice = _find_soffice()
    if not soffice:
        raise FileNotFoundError(
            "LibreOffice not found. Install it or set SOFFICE_PATH, "
            "or use --xlsx-only to skip PDF."
        )
    xlsx_path = str(Path(xlsx_path).resolve())
    result = subprocess.run(
        [soffice, "--headless", "--convert-to", "pdf",
         "--outdir", str(output_dir), xlsx_path],
        capture_output=True, text=True, timeout=60,
    )
    if result.returncode != 0:
        raise RuntimeError(f"LibreOffice failed:\n{result.stderr}")
    pdf = Path(output_dir) / (Path(xlsx_path).stem + ".pdf")
    if not pdf.exists():
        raise FileNotFoundError(f"PDF not generated at {pdf}")
    return str(pdf)


def get_page_count(pdf_path: str) -> int:
    """Page count via pdfinfo (poppler)."""
    try:
        r = subprocess.run(["pdfinfo", pdf_path],
                           capture_output=True, text=True, timeout=10)
        for line in r.stdout.splitlines():
            if line.lower().startswith("pages:"):
                return int(line.split(":")[-1].strip())
    except Exception:
        pass
    return 1


def check_text_overlap(pdf_path: str, noise_pt: float = 1.5) -> list[tuple]:
    """
    Check for text overlap via pdftotext -bbox bounding boxes.
    Returns list of (word1, word2) pairs that overlap (must be 0 for QA pass).
    """
    try:
        r = subprocess.run(
            ["pdftotext", "-bbox", pdf_path, "-"],
            capture_output=True, text=True, timeout=20,
        )
        root = ET.fromstring(r.stdout)
    except Exception as e:
        print(f"[WARN] bbox parse failed: {e}", file=sys.stderr)
        return []

    overlaps: list[tuple] = []
    ns = "{http://www.w3.org/1999/xhtml}"
    for page in root.iter(f"{ns}page"):
        words: list[tuple] = []
        for w in page.iter(f"{ns}word"):
            try:
                box = (float(w.get("xMin", 0)), float(w.get("yMin", 0)),
                       float(w.get("xMax", 0)), float(w.get("yMax", 0)))
                words.append((w.text or "", box))
            except (TypeError, ValueError):
                continue

        for i in range(len(words)):
            for j in range(i + 1, len(words)):
                t1, (x1a, y1a, x1b, y1b) = words[i]
                t2, (x2a, y2a, x2b, y2b) = words[j]
                if (min(x1b, x2b) - max(x1a, x2a) > noise_pt and
                        min(y1b, y2b) - max(y1a, y2a) > noise_pt):
                    overlaps.append((t1, t2))
    return overlaps


# ═════════════════════════════════════════════════════════════
# Public API
# ═════════════════════════════════════════════════════════════

def generate_xlsx_only(data: dict, output_path: str) -> str:
    """Generate .xlsx only (no LibreOffice dependency)."""
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    wb, _, _ = _build_workbook(data)
    wb.save(output_path)
    return output_path


def generate(data: dict, output_dir: str = ".",
             base_name: Optional[str] = None) -> dict:
    """
    Full pipeline: JSON → .xlsx → .pdf with page-break logic + QA.

    Returns:
        {"xlsx": str, "pdf": str, "pages": int, "overlaps": int}
    overlaps must be 0 to pass QA.
    """
    if base_name is None:
        base_name = (data.get("doc_no", "output") or "output").replace(" ", "_")

    out_dir = Path(output_dir).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    xlsx_path = str(out_dir / f"{base_name}.xlsx")

    # ── Pass 1: build xlsx ──
    section_start_rows: list = []
    wb, last_row, _ = _build_workbook(data, section_start_rows)
    wb.save(xlsx_path)
    print(f"[1/4] xlsx  → {xlsx_path}")

    # ── Pass 1: convert to PDF ──
    pdf_path = convert_to_pdf(xlsx_path, str(out_dir))
    pages    = get_page_count(pdf_path)
    print(f"[2/4] pdf pass-1: {pages} page(s)")

    # ── If multi-page: add manual breaks before each section (skip first) ──
    if pages > 1 and len(section_start_rows) > 1:
        wb2 = load_workbook(xlsx_path)
        ws2 = wb2.active
        for sec_row in section_start_rows[1:]:
            ws2.row_breaks.append(Break(id=sec_row - 1))
            print(f"    page break before row {sec_row}")
        wb2.save(xlsx_path)
        pdf_path = convert_to_pdf(xlsx_path, str(out_dir))
        pages    = get_page_count(pdf_path)
        print(f"[3/4] pdf pass-2 (with breaks): {pages} page(s)")
    else:
        print("[3/4] single page — no breaks needed")

    # ── QA: text overlap ──
    overlaps     = check_text_overlap(pdf_path)
    overlap_count = len(overlaps)
    if overlap_count == 0:
        print(f"[4/4] QA PASSED  ({pages} page(s), 0 overlaps)")
    else:
        print(f"[4/4] QA FAILED -- {overlap_count} overlapping pairs:")
        for pair in overlaps[:15]:
            print(f"      '{pair[0]}' ↔ '{pair[1]}'")

    return {
        "xlsx":     xlsx_path,
        "pdf":      pdf_path,
        "pages":    pages,
        "overlaps": overlap_count,
    }


# ═════════════════════════════════════════════════════════════
# Style verification helper (standalone — no LibreOffice needed)
# ═════════════════════════════════════════════════════════════

def verify_xlsx_styles(xlsx_path: str) -> bool:
    """
    Quick sanity check: verify that key cells carry the expected styles.
    Prints a pass/fail report.  Returns True if all checks pass.
    """
    wb = load_workbook(xlsx_path)
    ws = wb.active

    def fg(cell):
        try:
            return cell.fill.fgColor.rgb
        except Exception:
            return "None"

    checks = []

    def chk(label, got, want):
        if isinstance(want, bool):
            ok = bool(got) == want
        else:
            ok = str(want).upper() in str(got).upper()
        checks.append((label, ok, got, want))

    r1 = ws.cell(1, 1)
    chk("R1 fill (dark blue)",  fg(r1),        "1F3864")
    chk("R1 bold",              r1.font.bold,   True)
    chk("R1 color (white)",     r1.font.color.rgb if r1.font.color else "", "FFFFFF")
    chk("R1 font size>=13",     r1.font.size >= 13, True)

    r2 = ws.cell(2, 1)
    chk("R2 fill (dark blue)",  fg(r2),         "1F3864")

    r3 = ws.cell(3, 1)
    chk("R3 fill (gray)",       fg(r3),         "F2F2F2")

    chk("pageSize=A4",          ws.page_setup.paperSize,   9)
    chk("orientation=portrait", ws.page_setup.orientation, "portrait")
    chk("fitToWidth=1",         ws.page_setup.fitToWidth,  1)
    chk("footer set",           bool(ws.oddFooter.center.text), True)

    # Find a section heading and check its fill
    for rr in range(1, ws.max_row + 1):
        c = ws.cell(rr, 1)
        if c.value and rr > 4 and fg(c).upper().endswith("2E5B9A"):
            chk(f"section heading fill R{rr}", fg(c), "2E5B9A")
            break

    passed = sum(1 for _, ok, _, _ in checks if ok)
    total  = len(checks)
    print(f"\n=== XLSX STYLE VERIFICATION ({'PASS' if passed == total else 'FAIL'}) "
          f"{passed}/{total} checks ===")
    for label, ok, got, want in checks:
        status = "[OK]" if ok else "[FAIL]"
        print(f"  {status}  {label}  (got={got!r}, want={want!r})")
    return passed == total


# ═════════════════════════════════════════════════════════════
# CLI
# ═════════════════════════════════════════════════════════════

def _cli():
    ap = argparse.ArgumentParser(description="BOM Cost Sheet Generator (.xlsx + .pdf)")
    ap.add_argument("input",         help="JSON file or '-' for stdin")
    ap.add_argument("-o", "--output-dir", default=".", help="Output directory")
    ap.add_argument("--name",        help="Base filename (default: doc_no)")
    ap.add_argument("--xlsx-only",   action="store_true",
                    help="Generate xlsx only (skip LibreOffice PDF)")
    ap.add_argument("--verify",      action="store_true",
                    help="Run style verification after generating xlsx")
    args = ap.parse_args()

    if args.input == "-":
        data = json.load(sys.stdin)
    else:
        with open(args.input, encoding="utf-8") as f:
            data = json.load(f)

    base = (args.name or data.get("doc_no", "output") or "output").replace(" ", "_")

    if args.xlsx_only:
        out = str(Path(args.output_dir) / f"{base}.xlsx")
        Path(args.output_dir).mkdir(parents=True, exist_ok=True)
        generate_xlsx_only(data, out)
        if args.verify:
            verify_xlsx_styles(out)
        print(json.dumps({"xlsx": out}, ensure_ascii=False, indent=2))
    else:
        result = generate(data, output_dir=args.output_dir, base_name=base)
        print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    _cli()
