"""Reproduce the pinned, offline Motion distribution; never install global packages."""
from pathlib import Path
import base64
import hashlib
import io
import tarfile
import urllib.request

VERSION = "14.12.0"
INTEGRITY = "cxD0c0yGXo/mzPgveXMsXGl138UNsRit9XgInK8kThtDsrvIkhlAR9b6WYoAm7EmKWToMFx6v/G8i0Zjv+2uoA=="
JS_SHA256 = "a18fc08eb11c67658b34270bb71bc4ba806c87dbc1b720d7acd38c437844eee7"
root = Path(__file__).resolve().parents[1]
with urllib.request.urlopen(f"https://registry.npmjs.org/motion/-/motion-{VERSION}.tgz", timeout=30) as response:
    archive = response.read(2_000_000)
assert base64.b64encode(hashlib.sha512(archive).digest()).decode() == INTEGRITY, "Registry artifact integrity mismatch"
with tarfile.open(fileobj=io.BytesIO(archive), mode="r:gz") as package:
    javascript = package.extractfile("package/dist/motion.js").read()
    license_text = package.extractfile("package/LICENSE.md").read()
assert hashlib.sha256(javascript).hexdigest() == JS_SHA256, "Motion runtime mismatch"
for relative, data in [("dist/foliate/vendor/motion.js", javascript), ("dist/licenses/motion-MIT.txt", license_text)]:
    destination = root / relative
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(data)
    print(f"Verified {relative}: {len(data)} bytes")
