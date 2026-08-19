#!/usr/bin/env python3
"""Build print-ready SVG/PDF/PNG for the RARA restaurant signboard.

Converts identifiable typography to outlined vector paths using the closest
matching licensed fonts, and reconstructs geometric ornaments as true vectors.
Painterly illustrations (mountain/lake, wok/food) are drawn as high-detail
vector artwork matching the source composition rather than regenerated rasters.
"""

from __future__ import annotations

import base64
import io
import math
import os
import subprocess
import sys
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.ttLib import TTCollection, TTFont
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parent
OUT_SVG = ROOT / "print-ready.svg"
OUT_PNG = ROOT / "print-preview.png"
OUT_PDF = ROOT / "print-ready.pdf"
FONTS = ROOT / "fonts"

# Document: 4000 mm × 1000 mm, 1 user unit = 1 mm
W, H = 4000.0, 1000.0

# Colors sampled from the source artwork (cream / navy / gold palette)
BG = "#F4EDDE"
BG_WARM = "#EFE6D2"
PATTERN = "#D7C4A0"
NAVY = "#1A2744"
NAVY_SOFT = "#243552"
GOLD = "#C4A15C"
GOLD_DEEP = "#A7843A"
GOLD_LIGHT = "#D4B56E"
SEAL_INK = "#6A3C1E"
LAKE_DEEP = "#163852"
LAKE = "#1E5678"
LAKE_LIGHT = "#3A7A9A"
SNOW = "#F3F6F8"
PEAK_BLUE = "#4A6A88"
SUN = "#E6B84A"
FLAME_BLUE = "#3AA0FF"
FLAME_ORANGE = "#F07A22"
FLAME_YELLOW = "#FFD56A"


def svg_esc(d: str) -> str:
    return d.replace('"', "'")


class FontOutliner:
    def __init__(self, font: TTFont):
        self.font = font
        self.upem = font["head"].unitsPerEm
        self.cmap = font.getBestCmap()
        self.gs = font.getGlyphSet()
        self.hmtx = font["hmtx"]

    def glyph_name(self, ch: str) -> str:
        cp = ord(ch)
        if cp not in self.cmap:
            raise KeyError(f"Missing glyph for {ch!r} U+{cp:04X}")
        return self.cmap[cp]

    def advance(self, ch: str) -> float:
        return self.hmtx[self.glyph_name(ch)][0] / self.upem

    def text_width(self, text: str, size: float, tracking: float = 0.0) -> float:
        if not text:
            return 0.0
        w = sum(self.advance(ch) * size for ch in text)
        w += tracking * max(0, len(text) - 1)
        return w

    def path_for_char(self, ch: str, x: float, baseline: float, size: float) -> str:
        gname = self.glyph_name(ch)
        pen = SVGPathPen(self.gs)
        self.gs[gname].draw(pen)
        raw = pen.getCommands()
        s = size / self.upem
        # Font space: y-up from baseline. SVG: y-down.
        # transform: translate(x, baseline) scale(s, -s)
        return (
            f'<path transform="translate({x:.4f} {baseline:.4f}) scale({s:.6f} {-s:.6f})" '
            f'd="{svg_esc(raw)}" fill="currentColor"/>'
        )

    def draw(
        self,
        text: str,
        x: float,
        baseline: float,
        size: float,
        fill: str,
        *,
        tracking: float = 0.0,
        anchor: str = "left",
        extra_class: str = "",
    ) -> tuple[str, float]:
        width = self.text_width(text, size, tracking)
        if anchor == "middle":
            cx = x - width / 2
        elif anchor == "end":
            cx = x - width
        else:
            cx = x
        parts = [f'<g class="{extra_class}" fill="{fill}" color="{fill}">']
        pen_x = cx
        for ch in text:
            if ch == " ":
                pen_x += self.advance(ch) * size + tracking
                continue
            parts.append(self.path_for_char(ch, pen_x, baseline, size))
            pen_x += self.advance(ch) * size + tracking
        parts.append("</g>")
        return "\n".join(parts), width


def load_fonts() -> dict[str, FontOutliner]:
    FONTS.mkdir(parents=True, exist_ok=True)
    var_path = FONTS / "PlayfairDisplay-Variable.ttf"
    black_path = FONTS / "PlayfairDisplay-Black.ttf"
    if not black_path.exists():
        if not var_path.exists():
            raise SystemExit("Playfair Display font missing")
        inst = instancer.instantiateVariableFont(TTFont(str(var_path)), {"wght": 900})
        inst.save(str(black_path))
    playfair = FontOutliner(TTFont(str(black_path)))

    ttc_black = TTCollection("/usr/share/fonts/opentype/noto/NotoSansCJK-Black.ttc")
    ttc_bold = TTCollection("/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc")
    ttc_serif = TTCollection("/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc")

    def pick_kr(ttc: TTCollection) -> TTFont:
        for f in ttc.fonts:
            blob = " ".join(
                str(f["name"].getDebugName(i) or "") for i in (1, 16, 4)
            )
            if "KR" in blob:
                return f
        return ttc.fonts[0]

    kr_black = FontOutliner(pick_kr(ttc_black))
    kr_bold = FontOutliner(pick_kr(ttc_bold))
    kr_serif = FontOutliner(pick_kr(ttc_serif))
    sans_bold = FontOutliner(
        TTFont("/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf")
    )
    sans = FontOutliner(
        TTFont("/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf")
    )
    return {
        "playfair": playfair,
        "kr_black": kr_black,
        "kr_bold": kr_bold,
        "kr_serif": kr_serif,
        "sans_bold": sans_bold,
        "sans": sans,
    }


def mountain_peak(cx: float, cy: float, w: float, h: float, fill: str) -> str:
    return (
        f'<path fill="{fill}" d="M{cx - w / 2:.3f},{cy:.3f} '
        f"L{cx:.3f},{cy - h:.3f} L{cx + w / 2:.3f},{cy:.3f} Z\"/>"
    )


def rara_wordmark(fonts: dict[str, FontOutliner], cx: float, baseline: float, size: float) -> str:
    """Playfair Black 'RARA' with a mountain peak on each A crossbar."""
    f = fonts["playfair"]
    tracking = size * 0.02
    width = f.text_width("RARA", size, tracking)
    x0 = cx - width / 2
    parts = ['<g id="logo-text-rara">']
    markup, _ = f.draw("RARA", x0, baseline, size, NAVY, tracking=tracking)
    parts.append(markup)
    # Place a small mountain peak on each A crossbar.
    pen = x0
    for ch in "RARA":
        adv = f.advance(ch) * size
        if ch == "A":
            px = pen + adv * 0.50
            py = baseline - size * 0.38
            parts.append(mountain_peak(px, py, size * 0.20, size * 0.15, NAVY))
        pen += adv + tracking
    parts.append("</g>")
    return "\n".join(parts), width


def gold_rule(x1: float, x2: float, y: float, stroke: float = 1.6) -> str:
    return (
        f'<line x1="{x1:.3f}" y1="{y:.3f}" x2="{x2:.3f}" y2="{y:.3f}" '
        f'stroke="{GOLD}" stroke-width="{stroke}" fill="none" stroke-linecap="square"/>'
    )


def mandala(cx: float, cy: float, r: float, opacity: float = 0.11) -> str:
    parts = [
        f'<g class="mandala" transform="translate({cx:.3f} {cy:.3f})" '
        f'fill="none" stroke="{PATTERN}" stroke-width="1.1" opacity="{opacity}">'
    ]
    for k in (0.22, 0.38, 0.55, 0.72, 0.88, 1.0):
        parts.append(f'<circle r="{r * k:.3f}"/>')
    for n, inner, outer in ((8, 0.18, 0.42), (12, 0.40, 0.68), (16, 0.62, 0.92), (24, 0.78, 1.0)):
        for i in range(n):
            a = i * 2 * math.pi / n
            b = a + math.pi / n
            x1, y1 = inner * r * math.cos(a), inner * r * math.sin(a)
            x2, y2 = outer * r * math.cos(a), outer * r * math.sin(a)
            mx = (inner + outer) * 0.5 * r * math.cos(b)
            my = (inner + outer) * 0.5 * r * math.sin(b)
            parts.append(
                f'<path d="M{x1:.2f},{y1:.2f} Q{mx:.2f},{my:.2f} {x2:.2f},{y2:.2f}"/>'
            )
    # diamond ring
    for i in range(16):
        a = i * 2 * math.pi / 16
        dx, dy = 0.5 * r * math.cos(a), 0.5 * r * math.sin(a)
        s = r * 0.035
        parts.append(
            f'<path d="M{dx:.2f},{dy - s:.2f} L{dx + s:.2f},{dy:.2f} '
            f'L{dx:.2f},{dy + s:.2f} L{dx - s:.2f},{dy:.2f} Z" '
            f'fill="{PATTERN}" stroke="none"/>'
        )
    parts.append("</g>")
    return "\n".join(parts)


def background_layer() -> str:
    parts = ['<g id="layer-background">']
    parts.append(
        f'<rect width="{W}" height="{H}" fill="{BG}"/>'
        f'<rect width="{W}" height="{H}" fill="url(#bgWarmFade)" opacity="0.55"/>'
    )
    parts.append("</g>")
    parts.append('<g id="layer-background-patterns">')
    # Large faint mandalas on the right half, matching the source watermark.
    parts.append(mandala(2480, 420, 520, 0.13))
    parts.append(mandala(3180, 180, 340, 0.10))
    parts.append(mandala(2920, 780, 390, 0.09))
    parts.append(mandala(3680, 560, 280, 0.08))
    parts.append("</g>")
    return "\n".join(parts)


def stupa_and_peaks() -> str:
    """Light-gold Himalayan peaks + Buddhist stupa line-art, far right."""
    parts = [
        f'<g id="layer-background-stupa" fill="none" stroke="{GOLD}" '
        f'stroke-width="2.2" opacity="0.28" stroke-linejoin="round">'
    ]
    # Mountain silhouette
    parts.append(
        '<path d="M2680,930 L2860,620 L2980,760 L3120,480 L3280,700 '
        'L3420,390 L3580,640 L3720,520 L4000,820" '
        f'stroke="{GOLD_DEEP}" stroke-width="2.4"/>'
    )
    parts.append(
        '<path d="M2740,930 L2920,700 L3040,820 L3180,560 L3360,780 '
        'L3480,610 L3660,760 L3860,640 L4000,860" opacity="0.7"/>'
    )
    # Stupa: plinth, dome, harmika, spire
    sx, sy = 3520, 640
    parts.append(
        f'<path d="M{sx-140},{sy+250} H{sx+140} M{sx-120},{sy+220} H{sx+120} '
        f'M{sx-100},{sy+190} H{sx+100}"/>'
    )
    parts.append(
        f'<path d="M{sx-88},{sy+190} C{sx-88},{sy+40} {sx+88},{sy+40} {sx+88},{sy+190}"/>'
    )
    parts.append(
        f'<rect x="{sx-28}" y="{sy+8}" width="56" height="42" rx="2"/>'
        f'<path d="M{sx-40},{sy+8} H{sx+40} M{sx-32},{sy-6} H{sx+32} '
        f'M{sx-22},{sy-20} H{sx+22}"/>'
    )
    parts.append(
        f'<path d="M{sx},{sy-20} V{sy-210} M{sx-18},{sy-70} H{sx+18} '
        f'M{sx-14},{sy-100} H{sx+14} M{sx-10},{sy-130} H{sx+10} '
        f'M{sx-7},{sy-160} H{sx+7}"/>'
    )
    parts.append(f'<circle cx="{sx}" cy="{sy-222}" r="9"/>')
    parts.append("</g>")
    return "\n".join(parts)


def mountain_lake_illustration() -> str:
    """Semicircular Rara-lake logo illustration with gold/navy frame."""
    cx, cy, r = 720.0, 272.0, 205.0
    parts = ['<g id="layer-mountain-lake-illustration">']
    parts.append(
        f'<clipPath id="logoArch"><path d="M{cx-r},{cy} A{r},{r} 0 0 1 {cx+r},{cy} Z"/></clipPath>'
    )
    parts.append(f'<g clip-path="url(#logoArch)">')
    parts.append(
        f'<rect x="{cx-r}" y="{cy-r}" width="{2*r}" height="{r}" fill="url(#skyGrad)"/>'
    )
    # Haze bands
    parts.append(
        f'<ellipse cx="{cx}" cy="{cy-40}" rx="{r*0.95}" ry="38" fill="#C5D8E8" opacity="0.35"/>'
    )
    # Sun / moon behind the right peak
    parts.append(
        f'<circle cx="{cx+86}" cy="{cy-122}" r="34" fill="url(#sunGrad)"/>'
        f'<circle cx="{cx+86}" cy="{cy-122}" r="22" fill="#F7E7A4" opacity="0.55"/>'
    )
    # Distant ridge
    parts.append(
        f'<path fill="#6F8FA8" d="M{cx-r},{cy-28} '
        f'C{cx-150},{cy-90} {cx-90},{cy-130} {cx-40},{cy-70} '
        f'C{cx-10},{cy-150} {cx+30},{cy-170} {cx+70},{cy-80} '
        f'C{cx+120},{cy-160} {cx+170},{cy-120} {cx+r},{cy-36} '
        f'L{cx+r},{cy} L{cx-r},{cy} Z"/>'
    )
    # Mid peaks (blue rock)
    parts.append(
        f'<path fill="{PEAK_BLUE}" d="M{cx-r},{cy-18} '
        f'C{cx-170},{cy-70} {cx-140},{cy-150} {cx-118},{cy-158} '
        f'C{cx-90},{cy-90} {cx-60},{cy-55} {cx-28},{cy-128} '
        f'C{cx-8},{cy-172} {cx+18},{cy-176} {cx+28},{cy-130} '
        f'C{cx+55},{cy-70} {cx+88},{cy-50} {cx+128},{cy-138} '
        f'C{cx+148},{cy-168} {cx+172},{cy-150} {cx+r},{cy-42} '
        f'L{cx+r},{cy} L{cx-r},{cy} Z"/>'
    )
    # Foreground dark mass
    parts.append(
        f'<path fill="{NAVY}" d="M{cx-r},{cy-6} '
        f'C{cx-160},{cy-50} {cx-130},{cy-100} {cx-108},{cy-88} '
        f'C{cx-70},{cy-40} {cx-36},{cy-86} {cx-8},{cy-118} '
        f'C{cx+12},{cy-48} {cx+50},{cy-36} {cx+92},{cy-96} '
        f'C{cx+118},{cy-40} {cx+160},{cy-28} {cx+r},{cy-8} '
        f'L{cx+r},{cy} L{cx-r},{cy} Z"/>'
    )
    # Snow caps with irregular lower edge
    parts.append(
        f'<path fill="{SNOW}" d="M{cx-148},{cy-96} C{cx-136},{cy-138} {cx-124},{cy-160} {cx-118},{cy-158} '
        f'C{cx-108},{cy-128} {cx-96},{cy-100} {cx-86},{cy-92} '
        f'C{cx-108},{cy-100} {cx-132},{cy-96} {cx-148},{cy-96} Z"/>'
    )
    parts.append(
        f'<path fill="{SNOW}" d="M{cx-40},{cy-100} C{cx-22},{cy-150} {cx+8},{cy-176} {cx+18},{cy-168} '
        f'C{cx+28},{cy-132} {cx+40},{cy-96} {cx+52},{cy-86} '
        f'C{cx+22},{cy-108} {cx-8},{cy-102} {cx-40},{cy-100} Z"/>'
    )
    parts.append(
        f'<path fill="{SNOW}" d="M{cx+108},{cy-92} C{cx+122},{cy-140} {cx+140},{cy-168} {cx+150},{cy-158} '
        f'C{cx+164},{cy-122} {cx+176},{cy-88} {cx+186},{cy-74} '
        f'C{cx+158},{cy-96} {cx+128},{cy-90} {cx+108},{cy-92} Z"/>'
    )
    # Lake body
    parts.append(
        f'<path fill="url(#lakeGrad)" d="M{cx-r},{cy-10} '
        f'C{cx-90},{cy-34} {cx+20},{cy-38} {cx+r},{cy-8} '
        f'L{cx+r},{cy} L{cx-r},{cy} Z"/>'
    )
    # Reflected peaks (flipped, compressed)
    parts.append(
        f'<g opacity="0.32">'
        f'<path fill="{PEAK_BLUE}" d="M{cx-150},{cy-8} L{cx-118},{cy-2} L{cx-80},{cy-8} L{cx-118},{cy-22} Z"/>'
        f'<path fill="{SNOW}" d="M{cx-8},{cy-8} L{cx+22},{cy-2} L{cx+48},{cy-8} L{cx+18},{cy-24} Z"/>'
        f'<path fill="{SNOW}" d="M{cx+108},{cy-8} L{cx+140},{cy-2} L{cx+168},{cy-8} L{cx+148},{cy-20} Z"/>'
        f"</g>"
    )
    # Horizontal glints on water
    parts.append(
        f'<g fill="#D7E8F2" opacity="0.28">'
        f'<ellipse cx="{cx-20}" cy="{cy-6}" rx="70" ry="2.2"/>'
        f'<ellipse cx="{cx+60}" cy="{cy-3}" rx="48" ry="1.6"/>'
        f'<ellipse cx="{cx-90}" cy="{cy-2}" rx="36" ry="1.3"/>'
        f"</g>"
    )
    # Island + pines + stupa (left shore)
    parts.append(
        f'<path fill="#142033" d="M{cx-168},{cy-8} C{cx-140},{cy-18} {cx-110},{cy-20} {cx-72},{cy-10} '
        f'C{cx-96},{cy-4} {cx-140},{cy-2} {cx-168},{cy-8} Z"/>'
    )
    # Pines
    for px, py, s in (
        (cx - 148, cy - 16, 0.85),
        (cx - 136, cy - 18, 1.15),
        (cx - 124, cy - 16, 0.95),
        (cx - 112, cy - 15, 0.7),
    ):
        parts.append(
            f'<path fill="#0F1C2E" d="M{px},{py - 34*s} L{px + 9*s},{py} L{px - 9*s},{py} Z '
            f'M{px},{py - 26*s} L{px + 11*s},{py + 4*s} L{px - 11*s},{py + 4*s} Z '
            f'M{px},{py - 16*s} L{px + 13*s},{py + 10*s} L{px - 13*s},{py + 10*s} Z"/>'
        )
    # Mini stupa on the island
    parts.append(
        f'<g fill="#0F1C2E">'
        f'<rect x="{cx-94}" y="{cy-22}" width="18" height="8" rx="0.8"/>'
        f'<path d="M{cx-92},{cy-22} C{cx-92},{cy-36} {cx-76},{cy-36} {cx-76},{cy-22} Z"/>'
        f'<rect x="{cx-88}" y="{cy-40}" width="6" height="6"/>'
        f'<rect x="{cx-86.2}" y="{cy-58}" width="2.4" height="18"/>'
        f'<circle cx="{cx-85}" cy="{cy-60}" r="2.3"/>'
        f"</g>"
    )
    parts.append("</g>")
    # Arch frame
    parts.append(
        f'<path d="M{cx-r},{cy} A{r},{r} 0 0 1 {cx+r},{cy}" fill="none" '
        f'stroke="{GOLD_DEEP}" stroke-width="3.4"/>'
    )
    parts.append(
        f'<path d="M{cx-r+7},{cy} A{r-7},{r-7} 0 0 1 {cx+r-7},{cy}" fill="none" '
        f'stroke="{NAVY}" stroke-width="1.35" opacity="0.9"/>'
    )
    parts.append("</g>")
    return "\n".join(parts)


def seal(fonts: dict[str, FontOutliner], x: float, y: float, h: float) -> str:
    """Vertical gold-bordered seal 山湖味."""
    w = 36.0
    parts = [f'<g id="logo-seal" transform="translate({x:.3f} {y:.3f})">']
    parts.append(
        f'<rect x="0" y="0" width="{w}" height="{h}" fill="none" stroke="{GOLD_DEEP}" '
        f'stroke-width="2.1" rx="1.2"/>'
    )
    parts.append(
        f'<rect x="3.2" y="3.2" width="{w-6.4}" height="{h-6.4}" fill="none" '
        f'stroke="{GOLD}" stroke-width="0.7"/>'
    )
    f = fonts["kr_serif"]
    chars = "山湖味"
    gap = (h - 18) / len(chars)
    for i, ch in enumerate(chars):
        by = 16 + i * gap + gap * 0.22
        markup, _ = f.draw(ch, w / 2, by, 18.5, SEAL_INK, anchor="middle")
        parts.append(markup)
    parts.append("</g>")
    return "\n".join(parts)


def logo_stack(fonts: dict[str, FontOutliner]) -> str:
    cx = 720.0
    parts = ['<g id="layer-main-logo">']
    parts.append(mountain_lake_illustration())
    parts.append("</g>")
    parts.append('<g id="layer-logo-text">')
    word, ww = rara_wordmark(fonts, cx, 430.0, 108.0)
    parts.append(word)
    # Seal to the right of the last A
    parts.append(seal(fonts, cx + ww / 2 + 10, 352.0, 92.0))
    # Tagline between gold rules
    tag = "INDIAN & NEPALI RESTAURANT"
    tag_size = 16.5
    tw = fonts["sans_bold"].text_width(tag, tag_size, tracking=1.6)
    x1, x2 = cx - tw / 2 - 18, cx + tw / 2 + 18
    parts.append(gold_rule(x1, x2, 456.0, 1.35))
    markup, _ = fonts["sans_bold"].draw(
        tag, cx, 478.5, tag_size, NAVY, tracking=1.6, anchor="middle", extra_class="tagline"
    )
    parts.append(markup)
    parts.append(gold_rule(x1, x2, 488.0, 1.35))
    kname, _ = fonts["kr_bold"].draw("라라", cx, 536.0, 42.0, NAVY, anchor="middle")
    parts.append('<g id="layer-korean-text">')
    parts.append(kname)
    parts.append("</g>")
    parts.append("</g>")
    return "\n".join(parts)


def food_piece(kind: str, x: float, y: float, rot: float, sc: float = 1.0) -> str:
    t = f'transform="translate({x:.2f} {y:.2f}) rotate({rot:.1f}) scale({sc:.3f})"'
    if kind == "chicken":
        return (
            f"<g {t}>"
            f'<path d="M-24,-4 C-22,-16 -8,-20 6,-14 C22,-8 26,6 14,16 C2,24 -18,18 -24,6 Z" fill="#B44A22"/>'
            f'<path d="M-10,-8 C-4,-14 10,-12 14,-4 C8,2 -2,2 -10,-8 Z" fill="#E0904C" opacity="0.9"/>'
            f'<path d="M-16,4 C-6,0 4,6 8,12" fill="none" stroke="#7A2E14" stroke-width="1.3"/>'
            f'<circle cx="8" cy="-6" r="2.2" fill="#F0C090" opacity="0.7"/>'
            f"</g>"
        )
    if kind == "pepper":
        return (
            f"<g {t}>"
            f'<path d="M-18,6 C-20,-8 -4,-18 10,-12 C22,-6 22,8 10,16 C-2,22 -16,18 -18,6 Z" fill="#2F7A32"/>'
            f'<path d="M-2,-12 C2,-22 12,-20 12,-10 L6,-8 Z" fill="#1E5A22"/>'
            f'<path d="M-6,-2 C2,-8 12,-2 10,6" fill="none" stroke="#6CB85A" stroke-width="2" opacity="0.55"/>'
            f"</g>"
        )
    if kind == "chili":
        return (
            f"<g {t}>"
            f'<path d="M-22,4 C-10,-16 16,-14 26,0 C18,10 -4,16 -22,4 Z" fill="#C62828"/>'
            f'<path d="M18,-8 C22,-18 12,-20 8,-10" fill="#2E7D32"/>'
            f'<path d="M-8,-2 C2,-8 14,-2 16,4" fill="none" stroke="#E07070" stroke-width="1.4" opacity="0.6"/>'
            f"</g>"
        )
    if kind == "onion":
        return (
            f"<g {t}>"
            f'<path d="M-14,8 C-18,-6 0,-18 14,2 C8,16 -8,18 -14,8 Z" fill="#F3DCC6"/>'
            f'<path d="M-8,6 Q0,-8 10,4" fill="none" stroke="#E2C2A4" stroke-width="1.5"/>'
            f'<path d="M-4,2 Q2,-6 8,2" fill="none" stroke="#FFFFFF" stroke-width="0.8" opacity="0.5"/>'
            f"</g>"
        )
    return (
        f"<g {t}>"
        f'<path d="M0,-11 C7,-2 7,8 0,11 C-7,8 -7,-2 0,-11 Z" fill="#9A3416" opacity="0.92"/>'
        f'<ellipse cx="1.5" cy="-2" rx="1.6" ry="2.2" fill="#C45A28" opacity="0.6"/>'
        f"</g>"
    )


def food_illustration() -> str:
    parts = ['<g id="layer-food-cooking-illustration">']
    # Gas burner
    parts.append(
        '<g transform="translate(500 918)">'
        '<ellipse cx="0" cy="16" rx="132" ry="16" fill="#1C1C1C"/>'
        '<ellipse cx="0" cy="8" rx="108" ry="11" fill="#2A2A2A"/>'
        '<ellipse cx="0" cy="6" rx="78" ry="7" fill="none" stroke="#444" stroke-width="3"/>'
        '<ellipse cx="0" cy="6" rx="48" ry="5" fill="none" stroke="#555" stroke-width="2"/>'
        # outer flame tongues
        f'<path d="M-82,6 C-72,-38 -28,-86 0,-28 C18,-96 62,-40 80,6 '
        f'C52,-10 24,-6 0,10 C-26,-8 -56,-6 -82,6 Z" fill="url(#flameOrange)"/>'
        f'<path d="M-52,6 C-42,-28 -12,-62 0,-18 C14,-66 40,-26 50,6 '
        f'C32,-4 12,0 0,10 C-14,-4 -34,-2 -52,6 Z" fill="url(#flameBlue)"/>'
        f'<path d="M-22,6 C-16,-16 -4,-28 0,-8 C6,-30 16,-14 22,6 '
        f'C10,0 4,2 0,8 C-6,0 -14,2 -22,6 Z" fill="#E8F4FF" opacity="0.75"/>'
        "</g>"
    )
    # Wok
    parts.append(
        '<g transform="translate(518 798) rotate(-16)">'
        '<ellipse cx="8" cy="52" rx="178" ry="22" fill="#000" opacity="0.22"/>'
        '<path d="M-188,12 C-186,78 186,78 188,12 C188,-10 96,-26 0,-26 C-96,-26 -188,-10 -188,12 Z" fill="#141414"/>'
        '<path d="M-168,10 C-168,58 168,58 168,10 C96,28 -96,28 -168,10 Z" fill="#2B2B2B"/>'
        '<ellipse cx="0" cy="20" rx="138" ry="18" fill="url(#wokOil)"/>'
        '<path d="M-150,8 C-80,22 80,22 150,8" fill="none" stroke="#5A4030" stroke-width="3" opacity="0.45"/>'
        # food resting in wok
        '<ellipse cx="-48" cy="18" rx="32" ry="13" fill="#C45A28"/>'
        '<ellipse cx="8" cy="24" rx="26" ry="11" fill="#2F7A32"/>'
        '<ellipse cx="54" cy="16" rx="20" ry="10" fill="#C62828"/>'
        '<ellipse cx="-6" cy="12" rx="18" ry="9" fill="#E0904C"/>'
        '<ellipse cx="28" cy="22" rx="14" ry="7" fill="#F3DCC6"/>'
        # handle
        '<path d="M176,4 C248,-10 292,-28 318,-42" fill="none" stroke="#101010" stroke-width="15" stroke-linecap="round"/>'
        '<path d="M176,4 C248,-10 292,-28 318,-42" fill="none" stroke="#3A3A3A" stroke-width="5" stroke-linecap="round"/>'
        "</g>"
    )
    # Hand in black sleeve gripping the handle
    parts.append(
        '<g transform="translate(848 738) rotate(-28)">'
        # sleeve
        '<path d="M-10,8 C-18,-36 -8,-96 22,-150 C58,-138 62,-70 52,-8 Z" fill="#0E0E0E"/>'
        '<path d="M-6,-20 C8,-24 28,-8 34,10" fill="none" stroke="#2A2A2A" stroke-width="2"/>'
        # palm / back of hand
        '<path d="M18,4 C28,32 70,44 108,22 C122,12 112,-14 86,-22 '
        'C62,-32 34,-24 18,4 Z" fill="#C49A72"/>'
        # thumb
        '<path d="M78,-20 C96,-40 122,-28 126,-6 C112,8 88,-2 78,-20 Z" fill="#B88962"/>'
        # fingers wrapping the handle
        '<path d="M100,10 C118,6 128,16 124,28 C110,34 96,24 100,10 Z" fill="#C49A72"/>'
        '<path d="M84,18 C102,16 110,28 104,38 C90,42 78,30 84,18 Z" fill="#B88962"/>'
        '<path d="M66,22 C82,22 88,34 80,42 C66,44 58,32 66,22 Z" fill="#C49A72"/>'
        '<path d="M50,18 C64,20 68,32 58,38 C46,38 42,26 50,18 Z" fill="#B88962"/>'
        # knuckle shade
        '<path d="M40,8 C58,0 86,4 100,16" fill="none" stroke="#A67B55" stroke-width="2.2" opacity="0.55"/>'
        "</g>"
    )
    flying = [
        ("chicken", 410, 628, -26, 1.22),
        ("pepper", 498, 582, 16, 1.08),
        ("chili", 588, 552, -38, 1.0),
        ("onion", 452, 678, 28, 0.95),
        ("chicken", 628, 640, 14, 0.9),
        ("pepper", 538, 520, -14, 0.86),
        ("chili", 368, 688, 48, 0.8),
        ("drop", 486, 538, 12, 0.72),
        ("drop", 572, 612, -18, 0.58),
        ("drop", 434, 598, 36, 0.52),
        ("chicken", 332, 648, -8, 0.74),
        ("pepper", 678, 690, 22, 0.74),
        ("chili", 648, 572, 10, 0.7),
        ("drop", 528, 478, 4, 0.48),
        ("onion", 606, 708, -12, 0.74),
        ("drop", 400, 560, 18, 0.42),
        ("chili", 470, 500, -22, 0.62),
        ("pepper", 360, 610, 8, 0.6),
        ("drop", 620, 500, -8, 0.4),
        ("chicken", 560, 690, 40, 0.7),
        ("drop", 510, 640, 60, 0.35),
        ("drop", 690, 640, -30, 0.38),
    ]
    for item in flying:
        parts.append(food_piece(*item))
    parts.append(
        f'<g fill="none" stroke="{NAVY}" stroke-width="1.8" opacity="0.16" stroke-linecap="round">'
        '<path d="M468,500 C458,468 490,448 478,414"/>'
        '<path d="M522,486 C512,452 542,434 532,402"/>'
        '<path d="M572,496 C586,464 558,444 570,416"/>'
        "</g>"
    )
    parts.append("</g>")
    return "\n".join(parts)


def ornament_line(x: float, y: float, width: float) -> str:
    x1, x2 = x - width / 2, x + width / 2
    m = x
    parts = [f'<g id="layer-decorative-ornaments" fill="{GOLD_DEEP}" stroke="{GOLD_DEEP}">']
    parts.append(
        f'<path d="M{x1+40:.2f},{y:.2f} L{m-14:.2f},{y:.2f}" fill="none" stroke-width="1.7"/>'
        f'<path d="M{m+14:.2f},{y:.2f} L{x2-40:.2f},{y:.2f}" fill="none" stroke-width="1.7"/>'
    )
    # center diamond
    parts.append(
        f'<path d="M{m:.2f},{y-8:.2f} L{m+8:.2f},{y:.2f} L{m:.2f},{y+8:.2f} L{m-8:.2f},{y:.2f} Z" '
        f'fill="{GOLD}" stroke="{GOLD_DEEP}" stroke-width="1.1"/>'
    )
    # ornate ends
    for side, s in ((x1, 1), (x2, -1)):
        parts.append(
            f'<path d="M{side:.2f},{y:.2f} c{12*s:.2f},{-16:.2f} {28*s:.2f},{-8:.2f} {40*s:.2f},0 '
            f'c{-12*s:.2f},{16:.2f} {-28*s:.2f},{8:.2f} {-40*s:.2f},0" fill="none" stroke-width="1.6"/>'
        )
        parts.append(
            f'<path d="M{side+18*s:.2f},{y-11:.2f} L{side+26*s:.2f},{y:.2f} '
            f'L{side+18*s:.2f},{y+11:.2f} L{side+10*s:.2f},{y:.2f} Z" fill="{GOLD}"/>'
        )
    parts.append("</g>")
    return "\n".join(parts)


def contact_block(fonts: dict[str, FontOutliner]) -> str:
    parts = ['<g id="layer-address-phone">']
    right = 3588.0
    m1, _ = fonts["kr_black"].draw("안산점", right, 92.0, 46.0, NAVY, anchor="end")
    parts.append(m1)
    m2, _ = fonts["sans_bold"].draw(
        "031 411 2203", right, 148.0, 38.0, NAVY, tracking=1.2, anchor="end"
    )
    parts.append(m2)
    parts.append(
        f'<line x1="3634" y1="48" x2="3634" y2="168" stroke="{GOLD_DEEP}" stroke-width="1.8"/>'
    )
    parts.append("</g>")
    parts.append('<g id="layer-2f">')
    m3, _ = fonts["playfair"].draw("2F", 3828.0, 148.0, 118.0, GOLD, anchor="middle")
    parts.append(m3)
    parts.append("</g>")
    return "\n".join(parts)


def headline(fonts: dict[str, FontOutliner]) -> str:
    parts = ['<g id="layer-main-korean-headline">']
    cx = 3120.0
    m, _ = fonts["kr_black"].draw(
        "인도 & 네팔 레스토랑", cx, 786.0, 68.0, NAVY, tracking=3.0, anchor="middle"
    )
    parts.append(m)
    parts.append("</g>")
    parts.append(ornament_line(cx, 832.0, 980.0))
    return "\n".join(parts)


def defs() -> str:
    return f"""
<defs>
  <linearGradient id="bgWarmFade" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="{BG}"/>
    <stop offset="1" stop-color="{BG_WARM}"/>
  </linearGradient>
  <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#D8E7F2"/>
    <stop offset="0.55" stop-color="#9BB8D0"/>
    <stop offset="1" stop-color="#6A93B0"/>
  </linearGradient>
  <radialGradient id="sunGrad" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="#F8E08A"/>
    <stop offset="1" stop-color="{SUN}"/>
  </radialGradient>
  <linearGradient id="lakeGrad" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="{LAKE_LIGHT}"/>
    <stop offset="0.45" stop-color="{LAKE}"/>
    <stop offset="1" stop-color="{LAKE_DEEP}"/>
  </linearGradient>
  <linearGradient id="flameOrange" x1="0" y1="1" x2="0" y2="0">
    <stop offset="0" stop-color="{FLAME_ORANGE}"/>
    <stop offset="0.55" stop-color="#FF9A3A"/>
    <stop offset="1" stop-color="{FLAME_YELLOW}"/>
  </linearGradient>
  <linearGradient id="flameBlue" x1="0" y1="1" x2="0" y2="0">
    <stop offset="0" stop-color="#1E6AD6"/>
    <stop offset="0.6" stop-color="{FLAME_BLUE}"/>
    <stop offset="1" stop-color="#BFDFFF"/>
  </linearGradient>
  <radialGradient id="wokOil" cx="42%" cy="35%" r="70%">
    <stop offset="0" stop-color="#6A3A22"/>
    <stop offset="0.55" stop-color="#3A2418"/>
    <stop offset="1" stop-color="#1A100C"/>
  </radialGradient>
</defs>
"""


def build_svg(fonts: dict[str, FontOutliner]) -> str:
    body = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"',
        f'     width="4000mm" height="1000mm" viewBox="0 0 {W:.0f} {H:.0f}"',
        f'     xml:space="preserve" version="1.1">',
        "  <title>RARA Indian &amp; Nepali Restaurant — Ansan 2F signboard</title>",
        '  <desc>Print-ready 4000mm x 1000mm artwork. Vector typography and ornaments; '
        "illustrations traced as detailed vector paths from the source composition. "
        "sRGB. Do not rescale non-uniformly.</desc>",
        defs(),
        background_layer(),
        stupa_and_peaks(),
        logo_stack(fonts),
        food_illustration(),
        contact_block(fonts),
        headline(fonts),
        "</svg>",
    ]
    return "\n".join(body)


def render_outputs(svg_text: str) -> None:
    OUT_SVG.write_text(svg_text, encoding="utf-8")
    print(f"wrote {OUT_SVG} ({OUT_SVG.stat().st_size} bytes)")

    # High-resolution preview for visual QC (2 px/mm = 50.8 dpi on 4 m; 8000 px wide)
    preview_w = 8000
    cmd = [
        "rsvg-convert",
        "-w",
        str(preview_w),
        "-h",
        str(int(preview_w * H / W)),
        "-o",
        str(OUT_PNG),
        str(OUT_SVG),
    ]
    subprocess.check_call(cmd)
    print(f"wrote {OUT_PNG} ({OUT_PNG.stat().st_size} bytes)")

    # PDF from the SVG (not from a rasterized PNG)
    pdf_cmd = ["rsvg-convert", "-f", "pdf", "-o", str(OUT_PDF), str(OUT_SVG)]
    try:
        subprocess.check_call(pdf_cmd)
        print(f"wrote {OUT_PDF} ({OUT_PDF.stat().st_size} bytes)")
    except subprocess.CalledProcessError:
        import cairosvg

        cairosvg.svg2pdf(bytestring=svg_text.encode("utf-8"), write_to=str(OUT_PDF))
        print(f"wrote {OUT_PDF} via cairosvg ({OUT_PDF.stat().st_size} bytes)")


def main() -> None:
    fonts = load_fonts()
    svg = build_svg(fonts)
    render_outputs(svg)


if __name__ == "__main__":
    main()
