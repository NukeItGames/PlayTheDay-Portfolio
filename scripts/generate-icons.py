"""Optional developer utility: python -m pip install pillow; python scripts/generate-icons.py."""
from pathlib import Path
from PIL import Image, ImageDraw

assets = Path(__file__).resolve().parent.parent / 'assets'
def mark(transparent=False, monochrome=False):
    image = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0) if transparent else '#101321')
    draw = ImageDraw.Draw(image)
    color = '#ffffff' if monochrome else '#9b7af4'
    draw.rounded_rectangle((202, 282, 822, 702), radius=165, fill=color)
    draw.polygon([(240, 576), (195, 748), (300, 748), (410, 660)], fill=color)
    draw.polygon([(784, 576), (829, 748), (724, 748), (614, 660)], fill=color)
    ink = '#101321'
    draw.rounded_rectangle((304, 435, 448, 479), radius=12, fill=ink)
    draw.rounded_rectangle((354, 385, 398, 529), radius=12, fill=ink)
    draw.ellipse((642, 397, 694, 449), fill=ink)
    draw.ellipse((704, 465, 756, 517), fill=ink)
    if not monochrome:
        draw.polygon([(536, 98), (495, 208), (553, 208), (512, 300), (631, 170), (565, 170), (611, 98)], fill='#77d9fa')
    return image

mark().convert('RGB').save(assets / 'icon.png')
mark().resize((64, 64), Image.Resampling.LANCZOS).save(assets / 'favicon.png')
mark(transparent=True).save(assets / 'android-icon-foreground.png')
mark(transparent=True, monochrome=True).save(assets / 'android-icon-monochrome.png')
Image.new('RGB', (1024, 1024), '#101321').save(assets / 'android-icon-background.png')
