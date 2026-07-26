import hashlib,json,pathlib,sys,zipfile

ROOT=pathlib.Path(__file__).resolve().parents[1]
DIST=ROOT.parents[1]/"dist"
package=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else DIST/"snaportho-reviewer-0.8.5.ankiaddon")

with zipfile.ZipFile(package) as archive:
    names=archive.namelist()
    assert "manifest.json" in names and "config.json" in names and "__init__.py" in names
    manifest=json.loads(archive.read("manifest.json"))
    assert manifest["name"]=="SnapOrtho Reviewer"
    assert manifest["package"]=="snaportho_reviewer"
    assert manifest["version"]=="0.8.5"
    edition=archive.read("snaportho_reviewer/__init__.py").decode()
    assert "REVIEWER_EDITION = True" in edition

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
