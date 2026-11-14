"""Build a completely self-contained demo HTML (all image assets & scripts embedded)."""
from pathlib import Path
import base64,json,re
p=Path(__file__).resolve().parents[1]
html=(p/'public/index.html').read_text()
css=(p/'public/styles.css').read_text()
js=(p/'public/app.js').read_text()
assets={}
for file in (p/'public/assets').iterdir():
 if file.suffix not in ('.webp','.jpg','.png','.svg'):continue
 mime={'.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml'}[file.suffix]
 assets[file.name]='data:'+mime+';base64,'+base64.b64encode(file.read_bytes()).decode()
for name,data in assets.items():
 html=html.replace('assets/'+name,data)
html=html.replace('<link rel="stylesheet" href="styles.css" />','<style>'+css+'</style>')
html=html.replace('<script>window.APP_DEMO_MODE=false;</script>','<script>window.APP_DEMO_MODE=true;window.APP_ASSETS='+json.dumps({k:v for k,v in assets.items() if k in ('arena-futsal.webp','arena-gobak.webp','arena-tarik.webp')},separators=(',',':'))+';</script>')
html=html.replace('<script src="app.js" defer></script>','<script>'+js+'</script>')
name='Guru_Games_Sekotong_DEMO_V2.html'
Path('/mnt/data',name).write_text(html)
print('demo',name,len(html),'bytes')
