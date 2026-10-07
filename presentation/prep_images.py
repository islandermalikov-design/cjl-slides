"""Crops the user's source illustrations into the slide-ready files in images/.
Source images live in ./source/ ; re-run after replacing a source file."""
import cv2, numpy as np, os
from PIL import Image, ImageFilter
SRC='source'; OUT='images'
os.makedirs(OUT,exist_ok=True)
def load(n): return Image.open(f'{SRC}/{n}').convert('RGB')
def up(im,k=2):
    im=im.resize((im.width*k,im.height*k),Image.LANCZOS)
    return im.filter(ImageFilter.UnsharpMask(radius=1.6,percent=40,threshold=2))
def save(im,name,k=2): up(im,k).save(f'{OUT}/{name}.png')
col=load('collage.png'); ana=load('anatomy.png'); dev=load('develop.png'); teeth=load('teeth.png')

save(col.crop((0,120,440,350)),'cover_head',3)
save(ana.crop((0,118,908,1086)),'anatomy_sagittal',1)
save(ana.crop((918,185,1425,600)),'anatomy_frontal',2)
save(ana.crop((20,185,914,800)),'anatomy_walls',1)
for i,(y1,y2) in enumerate([(40,96),(108,163),(173,222),(228,284),(292,341)],1):
    save(col.crop((1282,y1,1383,y2)),f'wall_{i}',4)
for n,b in {'acute':(22,745,131,864),'subacute':(146,745,262,864),'chronic':(278,745,392,864)}.items():
    save(col.crop(b),f'type_{n}',3)


def nolines(im,thr=100):
    """inpaint thin dark leader lines left over from the source captions"""
    a=np.array(im)[:,:,::-1].copy()
    g=cv2.cvtColor(a,cv2.COLOR_BGR2GRAY)
    m=(g<thr).astype(np.uint8)*255
    m=cv2.dilate(m,np.ones((5,5),np.uint8))
    return Image.fromarray(cv2.inpaint(a,m,4,cv2.INPAINT_TELEA)[:,:,::-1])

# stages of sinusitis (from develop.png), no embedded captions
stage=[(14,305,228,535),(272,305,456,515),(505,425,692,590),(752,305,925,485),(988,308,1186,520),(1230,308,1436,537)]
for i,b in enumerate(stage,1):
    im=dev.crop(b)
    if i in (2,3): im=nolines(im,52)
    save(im,f'stage_{i}',3)

# proximity of roots to the sinus floor: leader lines/caption removed
near=col.crop((410,402,622,688))
a=np.array(near)[:,:,::-1].copy()
m=np.zeros(a.shape[:2],np.uint8)
for p,q in [((214,49),(198,49)),((198,50),(116,111)),((214,103),(119,159)),((163,176),(214,176)),((214,186),(157,223))]:
    cv2.line(m,p,q,255,6)
cv2.circle(m,(121,108),11,255,-1)
# in the red sinus lining the white leader lines are easy to pick out by colour
reg=a[0:150,100:212]
br=((reg.min(axis=2)>150)&(np.abs(reg[:,:,2].astype(int)-reg[:,:,0].astype(int))<60)).astype(np.uint8)*255
br=cv2.dilate(br,np.ones((5,5),np.uint8))
lines_only=np.zeros_like(m); cv2.line(lines_only,(214,49),(116,111),255,26); cv2.line(lines_only,(214,103),(119,159),255,26)
sub=lines_only[0:150,100:212]
m[0:150,100:212]|=cv2.bitwise_and(br,sub)
near=Image.fromarray(cv2.inpaint(a,m,3,cv2.INPAINT_TELEA)[:,:,::-1])
save(near,'near_teeth',3)

# inflamed sinus + carious tooth (teeth.png): remove the white 'Гайморова пазуха' caption
t=teeth.crop((360,236,822,692))
a=np.array(t)[:,:,::-1].copy()
m=np.zeros(a.shape[:2],np.uint8)
reg=a[60:150,60:240]
white=(reg.min(axis=2)>225).astype(np.uint8)*255
white=cv2.dilate(white,np.ones((7,7),np.uint8))
m[60:150,60:240]=white
t=Image.fromarray(cv2.inpaint(a,m,5,cv2.INPAINT_TELEA)[:,:,::-1])
save(t,'inflamed_teeth',2)

# odontogenic chain (teeth.png): six circles
from PIL import ImageDraw
cents=[(75,54),(198,52),(330,54),(467,54),(605,55),(750,60)]
for i,(x,r) in enumerate(cents,1):
    cy=768
    im=up(teeth.crop((x-r,cy-r,x+r,cy+r)),4)
    s_=im.width
    mask=Image.new('L',im.size,0)
    ImageDraw.Draw(mask).ellipse((10,10,s_-11,s_-11),fill=255)
    im=im.convert('RGBA'); im.putalpha(mask); im.save(f'{OUT}/tooth_step_{i}.png')

# very light background plate for the closing slide
bg=ana.crop((0,118,908,1086)).convert('RGBA')
white=Image.new('RGBA',bg.size,(255,255,255,255))
Image.blend(white,bg,0.16).convert('RGB').save(f'{OUT}/bg_anatomy_light.png')
