import hashlib,json,pathlib,sys,zipfile
ROOT=pathlib.Path(__file__).resolve().parents[1];SOURCE=ROOT/"addon";DIST=ROOT.parents[1]/"dist";VERSION="0.5.0";OUT=DIST/f"snaportho-reviewer-{VERSION}.ankiaddon"
FORBIDDEN_SUFFIXES={".pyc",".pyo",".db",".sqlite",".sqlite3",".log",".map"};FORBIDDEN_NAMES={".DS_Store","__pycache__"};SECRET_PATTERNS=(b"SUPABASE_SERVICE_ROLE_KEY=",b"BEGIN PRIVATE KEY",b'"access_token":"')
def files():
    rows=[]
    for path in SOURCE.rglob("*"):
        if path.is_dir() or any(part in FORBIDDEN_NAMES for part in path.parts)or path.suffix in FORBIDDEN_SUFFIXES:continue
        rows.append(path)
    return sorted(rows,key=lambda p:p.relative_to(SOURCE).as_posix())
def main():
    manifest=json.loads((SOURCE/"manifest.json").read_text());config=json.loads((SOURCE/"config.json").read_text())
    assert manifest["version"]==VERSION and manifest["package"]=="snaportho_reviewer"
    assert not set(config)&{"token","credential","service_role_key","password"}
    rows=files();assert rows and all("learner" not in p.parts and "tests" not in p.parts for p in rows)
    for path in rows:
        data=path.read_bytes();assert not any(pattern in data for pattern in SECRET_PATTERNS),f"secret pattern:{path}"
        if path.suffix==".py":compile(data,path.as_posix(),"exec")
    DIST.mkdir(exist_ok=True);OUT.unlink(missing_ok=True)
    with zipfile.ZipFile(OUT,"w",zipfile.ZIP_DEFLATED,compresslevel=9)as archive:
        for path in rows:
            info=zipfile.ZipInfo(path.relative_to(SOURCE).as_posix(),(2026,1,1,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o644<<16;archive.writestr(info,path.read_bytes(),compress_type=zipfile.ZIP_DEFLATED,compresslevel=9)
    digest=hashlib.sha256(OUT.read_bytes()).hexdigest();(OUT.with_suffix(OUT.suffix+".sha256")).write_text(f"{digest}  {OUT.name}\n");print(json.dumps({"package":str(OUT),"sha256":digest,"files":len(rows)}))
if __name__=="__main__":main()
