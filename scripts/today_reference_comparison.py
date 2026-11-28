#!/usr/bin/env python3
"""Create side-by-side Today comparisons without changing the source images.

The supplied reference data is illustrative. Current screenshots come from the
offline synthetic browser fixture; neither is a real user's activity history.
Requires Pillow and the captures from tests/today-overview-acceptance.cjs.
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
DESIGN = ROOT / "docs/design/today"
OUTPUT = DESIGN / "current"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
SECTIONS = {
    "overview": ("reference/Overview.png", None, "v1-overview-acceptance-dark-393.png", "v1-overview-acceptance-light-393.png"),
    "timeline": ("reference/Timeline.png", None, "v1-section-acceptance-timeline-dark-393.png", "v1-section-acceptance-timeline-light-393.png"),
    # Crop only the relevant phone from the user-supplied full section board.
    "agenda": ("reference/Full_section_board.png", (638, 0, 874, 490), "v1-section-acceptance-agenda-dark-393.png", "v1-section-acceptance-agenda-light-393.png"),
    "review": ("reference/Full_section_board.png", (874, 0, 1114, 490), "v1-section-acceptance-review-dark-393.png", "v1-section-acceptance-review-light-393.png"),
    "timeline-compact": ("reference/Timeline.png", None, "v1-timeline-inline-dark.png", "v1-timeline-inline-light.png"),
    "activity-details": ("reference/Full_section_board.png", (159, 509, 391, 968), "v1-detail-evidence-active-dark.png", "v1-detail-evidence-active-light.png"),
    "gap-entry": ("reference/Full_section_board.png", (620, 509, 844, 968), "v1-detail-evidence-gap-dark.png", "v1-detail-evidence-gap-light.png"),
}


def main():
    title_font = ImageFont.truetype(BOLD, 22)
    label_font = ImageFont.truetype(FONT, 15)
    for section, (reference, crop, dark, light) in SECTIONS.items():
        paths = [DESIGN / reference, OUTPUT / dark, OUTPUT / light]
        canvas = Image.new("RGB", (1280, 890), "#0b1828")
        draw = ImageDraw.Draw(canvas)
        draw.text((20, 13), f"Today {section.replace('-', ' ').title()} — visual comparison", fill="#f1f6fb", font=title_font)
        for x, label, source in zip((20, 440, 860), ("Supplied reference · illustrative", "Actual · synthetic dark", "Actual · synthetic light"), paths):
            draw.text((x, 52), label, fill="#b7cbdc", font=label_font)
            with Image.open(source) as opened:
                img = opened.convert("RGB")
            if source == paths[0] and crop:
                img = img.crop(crop)
            scale = min(400 / img.width, 780 / img.height)
            img = img.resize((round(img.width * scale), round(img.height * scale)), Image.Resampling.LANCZOS)
            canvas.paste(img, (x + (400 - img.width) // 2, 78))
        draw.text((20, 862), "Images retain their aspect ratios. Browser evidence; not native-device or visual approval.", fill="#b7cbdc", font=label_font)
        canvas.save(OUTPUT / f"v1-comparison-{section}.png", optimize=True)


if __name__ == "__main__":
    main()
