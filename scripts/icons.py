"""Erzeugt die App-Icons (PNG) aus Zehnersystem-Material: Hunderterplatte, Zehnerstange, Einerwürfel.
Aufruf: python3 scripts/icons.py  (braucht Pillow)"""
from PIL import Image, ImageDraw

GRUEN = (5, 150, 105)
LINIE = (4, 120, 87)
WEISS = (255, 255, 255)


def icon(groesse: int, maskierbar: bool) -> Image.Image:
    bild = Image.new('RGB', (groesse, groesse), GRUEN)
    d = ImageDraw.Draw(bild)
    # maskierbare Icons: Motiv in der sicheren Zone (mittlere 80 %)
    rand = groesse * (0.22 if maskierbar else 0.14)
    u = (groesse - 2 * rand) / 14.5  # Breite: Platte 10 + Lücke 1.5 + Stange 1 + Lücke 1 + Würfel 1
    y0 = rand + (groesse - 2 * rand - 10 * u) / 2
    x = rand

    def raster(x0, y0, spalten, zeilen):
        d.rectangle([x0, y0, x0 + spalten * u, y0 + zeilen * u], fill=WEISS, outline=LINIE, width=max(1, groesse // 128))
        for i in range(1, spalten):
            d.line([x0 + i * u, y0, x0 + i * u, y0 + zeilen * u], fill=LINIE, width=max(1, groesse // 256))
        for j in range(1, zeilen):
            d.line([x0, y0 + j * u, x0 + spalten * u, y0 + j * u], fill=LINIE, width=max(1, groesse // 256))

    raster(x, y0, 10, 10)              # Hunderterplatte
    raster(x + 11.5 * u, y0, 1, 10)    # Zehnerstange
    raster(x + 13.5 * u, y0 + 9 * u, 1, 1)  # Einerwürfel
    return bild


for groesse, maskierbar, name in [(192, False, 'icon-192.png'), (512, False, 'icon-512.png'), (512, True, 'icon-maskable-512.png'), (180, False, 'apple-touch-icon.png')]:
    icon(groesse, maskierbar).save(f'static/icons/{name}', optimize=True)
print('Icons erzeugt.')
