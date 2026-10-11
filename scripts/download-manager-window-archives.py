"""Fetch only pinned public historical FIFA documents; verify bytes before extraction.

Requires requests and pypdf. No PDFs or source prose are shipped in the game.
"""
import hashlib
import json
import pathlib
import sys
import time

import requests
from pypdf import PdfReader

root = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else 'output/manager-v10/windows')
root.mkdir(parents=True, exist_ok=True)
sources = json.loads(pathlib.Path('scripts/manager-transfer-window-sources.json').read_text(encoding='utf8'))
for source in sources:
    extension = '.html' if source.get('format') == 'html' else '.pdf'
    pdf = root / (source['file'] + extension)
    previous = pathlib.Path('output/manager-v9/windows') / pdf.name
    if not pdf.exists() and previous.exists():
        pdf = previous
    if not pdf.exists():
        response = requests.get(source['url'], timeout=90)
        response.raise_for_status()
        content = response.content
        if hashlib.sha256(content).hexdigest() != source['sha256']:
            raise ValueError(f"Changed source bytes: {source['id']}; review the document, never import silently")
        pdf.write_bytes(content)
        time.sleep(2)
    if hashlib.sha256(pdf.read_bytes()).hexdigest() != source['sha256']:
        raise ValueError(f"Invalid cached source: {source['id']}")
    if extension == '.pdf' and not source.get('transcription'):
        pages = [page.extract_text(extraction_mode='layout') for page in PdfReader(pdf).pages]
        pdf.with_suffix('.json').write_text(json.dumps(pages, ensure_ascii=False), encoding='utf8')
    print(source['id'], 'verified', flush=True)
