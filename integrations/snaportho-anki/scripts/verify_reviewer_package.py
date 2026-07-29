import hashlib,json,pathlib,sys,zipfile

ROOT=pathlib.Path(__file__).resolve().parents[1]
DIST=ROOT.parents[1]/"dist"
version=json.loads((ROOT/"addon"/"manifest.json").read_text())["version"]
package=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else DIST/f"snaportho-reviewer-{version}.ankiaddon")

with zipfile.ZipFile(package) as archive:
    names=archive.namelist()
    assert "manifest.json" in names and "config.json" in names and "__init__.py" in names
    assert "snaportho_reviewer/brobot_panel.py" not in names
    manifest=json.loads(archive.read("manifest.json"))
    assert manifest["name"]=="SnapOrtho Reviewer"
    assert manifest["package"]=="snaportho_reviewer"
    assert manifest["version"]==version
    edition=archive.read("snaportho_reviewer/__init__.py").decode()
    assert "REVIEWER_EDITION = True" in edition
    assert "USER_EDITION = True" not in edition
    bootstrap=archive.read("snaportho_reviewer/bootstrap.py").decode()
    assert "MIN_ANKI=(25,9)" in bootstrap
    assert 'setWindowTitle("Anki update required")' in bootstrap
    assert "if self.reviewer_edition:" in bootstrap
    assert "from .surfaces import ReviewerSidePanel" in bootstrap
    assert 'menu_title="SnapOrtho Reviewer" if self.reviewer_edition else "SnapOrtho"' in bootstrap

digest=hashlib.sha256(package.read_bytes()).hexdigest()
expected=package.with_suffix(package.suffix+".sha256").read_text().split()[0]
assert digest==expected
print(json.dumps({
    "verified":True,
    "edition":"reviewer",
    "package":str(package),
    "packageId":manifest["package"],
    "version":manifest["version"],
    "sha256":digest,
}))
