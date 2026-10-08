from pathlib import Path
import shutil, sys
root=Path(__file__).resolve().parents[1]
out=root/'dist'
out.mkdir(exist_ok=True)
allowed=['index.html','editorial.css','course.js','site.js','boot.js','config.js']
for name in allowed: shutil.copy2(root/name,out/name)
for name in ['demo-accounts.js','demo.html','notes','concepts','content','dev.html','versions.html']:
 assert not (out/name).exists(), name
assert 'demo-accounts.js' not in (out/'index.html').read_text()
assert 'production' in (out/'config.js').read_text()
print('Production preview: account services fail closed; 6 allowlisted files, no fixture assets. Not a live authenticated application.')
