"""Build the store-submission zip. Run: python package.py

Includes only what the extension needs at runtime: manifest, src/, icons.
Excludes docs, store assets, tests, git, and this script.
"""
import json
import os
import zipfile

ROOT = os.path.dirname(os.path.abspath(__file__))

with open(os.path.join(ROOT, 'manifest.json'), encoding='utf-8') as f:
    version = json.load(f)['version']

out = os.path.join(ROOT, f'slashkeys-{version}.zip')

include_dirs = ['src']
include_files = ['manifest.json']
icon_dir = os.path.join('assets', 'icons')

with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for f in include_files:
        z.write(os.path.join(ROOT, f), f)
    for d in include_dirs:
        for dirpath, _, files in os.walk(os.path.join(ROOT, d)):
            for name in files:
                full = os.path.join(dirpath, name)
                rel = os.path.relpath(full, ROOT)
                z.write(full, rel.replace(os.sep, '/'))
    for name in os.listdir(os.path.join(ROOT, icon_dir)):
        if name.endswith('.png'):
            rel = f'{icon_dir}/{name}'.replace(os.sep, '/')
            z.write(os.path.join(ROOT, icon_dir, name), rel)

print(f'wrote {out}')
with zipfile.ZipFile(out) as z:
    for n in z.namelist():
        print(' ', n)
