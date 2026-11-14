#!/usr/bin/env python3
"""Recorta una lámina de iconos de 4x4 y exporta PNG RGBA transparentes.
No sustituye una revisión visual de recortes y legibilidad. Requiere Pillow.
"""
from pathlib import Path
import argparse,csv
from PIL import Image
NAMES=['home','compass','gallery','book','analytics','search','learning','presentation','code','checklist','award','security','settings','notification','moon','ecocampus']
def split(source,output,cell_size=256):
    im=Image.open(source).convert('RGBA');w,h=im.size; output=Path(output);output.mkdir(parents=True,exist_ok=True)
    rows=[]
    for k,name in enumerate(NAMES):
        row,col=divmod(k,4)
        cell=im.crop((round(col*w/4),round(row*h/4),round((col+1)*w/4),round((row+1)*h/4)))
        pixels=cell.load()
        for y in range(cell.height):
            for x in range(cell.width):
                r,g,b,a=pixels[x,y];dark=max(r,g,b)
                if dark<=13:pixels[x,y]=(0,0,0,0)
                elif dark<32:pixels[x,y]=(r,g,b,round(255*(dark-13)/19))
        bbox=cell.getbbox()
        if bbox:cell=cell.crop(bbox)
        if cell.width>cell_size or cell.height>cell_size:cell.thumbnail((cell_size,cell_size),Image.Resampling.NEAREST)
        pad=Image.new('RGBA',(cell_size,cell_size),(0,0,0,0));pad.alpha_composite(cell,((cell_size-cell.width)//2,(cell_size-cell.height)//2))
        pad.save(output/(name+'.png'),optimize=True)
        rows.append((name,row+1,col+1,cell.width,cell.height))
    with (output/'crop-report.csv').open('w',newline='',encoding='utf-8') as f:
        c=csv.writer(f);c.writerow(['name','row','column','w','h']);c.writerows(rows)
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--input',required=True);p.add_argument('--output',required=True);p.add_argument('--size',type=int,default=256);a=p.parse_args();split(a.input,a.output,a.size)
