#!/usr/bin/env python3
"""MapaTacaño icon: Clean emoji-style face with € eyes, minimal and bold"""
from PIL import Image, ImageDraw, ImageFont
import math

SIZE = 1024
HALF = SIZE // 2

def create_icon():
    img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # === BACKGROUND: Solid rounded square ===
    draw.rounded_rectangle([0, 0, SIZE-1, SIZE-1], radius=230, fill='#FFCC02')
    
    # === FACE: Big yellow circle (emoji style) ===
    face_cx, face_cy = HALF, HALF - 20
    face_r = 380
    
    # === EURO COIN EYES ===
    try:
        font_euro = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 160)
    except:
        font_euro = ImageFont.load_default()
    
    eye_y = face_cy - 60
    eye_lx = face_cx - 145
    eye_rx = face_cx + 145
    coin_r = 105
    
    for ex in [eye_lx, eye_rx]:
        # Coin circle - green tinted
        draw.ellipse([ex - coin_r, eye_y - coin_r, ex + coin_r, eye_y + coin_r],
                     fill='#34A853', outline='#2D8A47', width=6)
        # € symbol white on green
        draw.text((ex, eye_y), "€", fill='#FFFFFF', font=font_euro, anchor="mm")
    
    # === SMIRK MOUTH (tacaño satisfied grin) ===
    mouth_cy = face_cy + 150
    # Simple thick arc - smug grin
    draw.arc([face_cx - 160, mouth_cy - 80, face_cx + 160, mouth_cy + 80],
             start=5, end=175, fill='#8B5E00', width=18)
    
    # === RAISED EYEBROWS (cheeky, "I know the deal") ===
    brow_y = eye_y - coin_r - 35
    # Left brow - slightly angled
    draw.arc([eye_lx - 80, brow_y - 25, eye_lx + 80, brow_y + 40],
             start=200, end=340, fill='#8B5E00', width=14)
    # Right brow
    draw.arc([eye_rx - 80, brow_y - 25, eye_rx + 80, brow_y + 40],
             start=200, end=340, fill='#8B5E00', width=14)
    
    return img

def save_all(img):
    base = '/Users/kamsito/precimap-app/assets'
    img.save(f'{base}/icon.png', 'PNG')
    img.resize((48, 48), Image.LANCZOS).save(f'{base}/favicon.png', 'PNG')
    img.save(f'{base}/splash-icon.png', 'PNG')
    img.save(f'{base}/adaptive-icon.png', 'PNG')
    import os
    for n in ['icon.png','favicon.png','splash-icon.png','adaptive-icon.png']:
        print(f'  {n}: {os.stat(f"{base}/{n}").st_size//1024}KB')

if __name__ == '__main__':
    save_all(create_icon())
    print('✅ Done!')
