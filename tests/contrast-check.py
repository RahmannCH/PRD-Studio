# WCAG contrast check untuk kedua tema (dark/light), termasuk komposit glass.
# Jalankan: python tests/contrast-check.py
import re, sys, os

base = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
CSS = open(os.path.join(base, 'css', 'style.css'), encoding='utf-8').read()

def tokens(block):
    return dict(re.findall(r'--([a-z0-9-]+):\s*([^;]+);', block))

dark_block = CSS.split('[data-theme="light"]')[0]
light_block = CSS.split('[data-theme="light"]')[1].split('}')[0]
dark = tokens(dark_block)
light = tokens(light_block)

def parse(c):
    c = c.strip()
    m = re.match(r'rgba?\(([^)]+)\)', c)
    if m:
        parts = [p.strip() for p in m.group(1).replace('/', ',').split(',')]
        r, g, b = float(parts[0]), float(parts[1]), float(parts[2])
        a = float(parts[3]) if len(parts) > 3 else 1.0
        return r, g, b, a
    if c.startswith('#'):
        h = c.lstrip('#')
        if len(h) == 3: h = ''.join(ch*2 for ch in h)
        return int(h[0:2],16), int(h[2:4],16), int(h[4:6],16), 1.0
    raise ValueError(c)

def over(fg, bg):
    r1,g1,b1,a1 = fg; r2,g2,b2,a2 = bg
    return (r1*a1 + r2*(1-a1), g1*a1 + g2*(1-a1), b1*a1 + b2*(1-a1), 1.0)

def lum(rgb):
    def f(v):
        v /= 255
        return v/12.92 if v <= 0.03928 else ((v+0.055)/1.055)**2.4
    return 0.2126*f(rgb[0]) + 0.7152*f(rgb[1]) + 0.0722*f(rgb[2])

def ratio(a, b):
    la, lb = lum(a), lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)

fails = []
def check(name, fg, bg, need):
    r = ratio(fg[:3], bg[:3])
    status = 'OK ' if r >= need else 'FAIL'
    if r < need: fails.append((name, round(r,2), need))
    print(f'{status} {r:5.2f} (need {need}) {name}')

for theme_name, t in (('DARK', dark), ('LIGHT', light)):
    print(f'--- {theme_name} ---')
    text   = parse(t['text'])
    muted  = parse(t['muted'])
    bg     = parse(t['bg'])
    bg2    = parse(t['bg-2'])
    surf   = parse(t['surface'])
    surf2  = parse(t['surface-2'])
    inset  = parse(t['inset'])
    brand  = parse(t['brand'])
    bink   = parse(t['brand-ink'])
    accent = parse(t['accent'])
    aink   = parse(t['accent-ink'])
    okc    = parse(t['ok'])
    dang   = parse(t['danger'])

    check(f'{theme_name} text/bg', text, bg, 4.5)
    check(f'{theme_name} text/surface', text, surf, 4.5)
    check(f'{theme_name} text/surface-2', text, surf2, 4.5)
    check(f'{theme_name} text/inset', text, inset, 4.5)
    check(f'{theme_name} muted/bg', muted, bg, 4.5)
    check(f'{theme_name} muted/surface', muted, surf, 4.5)
    check(f'{theme_name} muted/inset', muted, inset, 4.5)
    check(f'{theme_name} brand/surface (link)', brand, surf, 4.5)
    check(f'{theme_name} brand/bg', brand, bg, 4.5)
    check(f'{theme_name} brand/inset', brand, inset, 4.5)
    check(f'{theme_name} accent/surface (skor)', accent, surf, 4.5)
    check(f'{theme_name} accent/bg', accent, bg, 4.5)
    check(f'{theme_name} ok/surface', okc, surf, 4.5)
    check(f'{theme_name} danger/surface', dang, surf, 4.5)
    check(f'{theme_name} danger/bg', dang, bg, 4.5)
    check(f'{theme_name} accent-ink/accent (tombol)', aink, accent, 4.5)
    check(f'{theme_name} brand-ink/brand (tombol)', bink, brand, 4.5)
    # fokus ring = UI component, butuh 3:1
    check(f'{theme_name} ring fokus accent/bg', accent, bg, 3.0)
    check(f'{theme_name} ring fokus accent/surface', accent, surf, 3.0)
    # glass: teks di atas permukaan glass yang dikomposit di atas bg
    gbg = parse(t['glass-bg'])
    glass_bg = over(gbg, bg)
    check(f'{theme_name} text/glass (komposit di atas bg)', text, glass_bg, 4.5)
    check(f'{theme_name} muted/glass', muted, glass_bg, 4.5)
    glass_bg2 = over(gbg, surf)
    check(f'{theme_name} muted/glass di atas surface', muted, glass_bg2, 4.5)
    # pemisah inset vs surface (identifikasi control boundary, soft check)
    sep = ratio(inset[:3], surf[:3])
    print(f'INFO {sep:5.2f} inset vs surface (boundary input)')

print()
if fails:
    print('ADA GAGAL:', fails)
    sys.exit(1)
print('Semua pasangan lolos WCAG AA di kedua tema.')
