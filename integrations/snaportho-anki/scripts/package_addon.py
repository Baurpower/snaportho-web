import argparse,hashlib,json,pathlib,zipfile
ROOT=pathlib.Path(__file__).resolve().parents[1];SOURCE=ROOT/"addon";DIST=ROOT.parents[1]/"dist";VERSION=json.loads((SOURCE/"manifest.json").read_text())["version"]
FORBIDDEN_SUFFIXES={".pyc",".pyo",".db",".sqlite",".sqlite3",".log",".map"};FORBIDDEN_NAMES={".DS_Store","__pycache__"};SECRET_PATTERNS=(b"SUPABASE_SERVICE_ROLE_KEY=",b"BEGIN PRIVATE KEY",b'"access_token":"')
def files():
    rows=[]
    for path in SOURCE.rglob("*"):
        if path.is_dir() or any(part in FORBIDDEN_NAMES for part in path.parts)or path.suffix in FORBIDDEN_SUFFIXES:continue
        rows.append(path)
    return sorted(rows,key=lambda p:p.relative_to(SOURCE).as_posix())
def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--edition",choices=("user","reviewer"),default="user")
    args=parser.parse_args()
    manifest=json.loads((SOURCE/"manifest.json").read_text());config=json.loads((SOURCE/"config.json").read_text())
    assert manifest["version"]==VERSION and manifest["name"]=="SnapOrtho" and manifest["package"]=="snaportho"
    assert not set(config)&{"token","credential","service_role_key","password"}
    reviewer=args.edition=="reviewer"
    out=DIST/f"{'snaportho-reviewer' if reviewer else 'snaportho'}-{VERSION}.ankiaddon"
    packaged_manifest={**manifest,"conflicts":[]}
    if reviewer:packaged_manifest.update(name="SnapOrtho Reviewer",package="snaportho_reviewer")
    rows=files();assert rows and all("learner" not in p.parts and "tests" not in p.parts for p in rows)
    for path in rows:
        data=path.read_bytes();assert not any(pattern in data for pattern in SECRET_PATTERNS),f"secret pattern:{path}"
        if path.suffix==".py":compile(data,path.as_posix(),"exec")
    DIST.mkdir(exist_ok=True);out.unlink(missing_ok=True)
    with zipfile.ZipFile(out,"w",zipfile.ZIP_DEFLATED,compresslevel=9)as archive:
        for path in rows:
            relative=path.relative_to(SOURCE).as_posix()
            if relative=="manifest.json" or (reviewer and relative=="snaportho_reviewer/__init__.py"):continue
            if reviewer and relative=="snaportho_reviewer/brobot_panel.py":continue
            info=zipfile.ZipInfo(relative,(2026,1,1,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o644<<16;archive.writestr(info,path.read_bytes(),compress_type=zipfile.ZIP_DEFLATED,compresslevel=9)
        manifest_info=zipfile.ZipInfo("manifest.json",(2026,1,1,0,0,0));manifest_info.compress_type=zipfile.ZIP_DEFLATED;manifest_info.external_attr=0o644<<16
        archive.writestr(manifest_info,json.dumps(packaged_manifest,separators=(",",":")).encode())
        if reviewer:
            edition=f'from .version import ADDON_VERSION\nREVIEWER_EDITION = True\n__all__ = ["ADDON_VERSION", "REVIEWER_EDITION"]\n'
            edition_info=zipfile.ZipInfo("snaportho_reviewer/__init__.py",(2026,1,1,0,0,0));edition_info.compress_type=zipfile.ZIP_DEFLATED;edition_info.external_attr=0o644<<16
            archive.writestr(edition_info,edition.encode())
        packaged_files=len(archive.infolist())
    digest=hashlib.sha256(out.read_bytes()).hexdigest();(out.with_suffix(out.suffix+".sha256")).write_text(f"{digest}  {out.name}\n");print(json.dumps({"package":str(out),"edition":args.edition,"sha256":digest,"files":packaged_files}))
if __name__=="__main__":main()
