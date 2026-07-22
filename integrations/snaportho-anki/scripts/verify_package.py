import hashlib,json,pathlib,sys,zipfile
package=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else "dist/snaportho-reviewer-0.5.0.ankiaddon")
with zipfile.ZipFile(package)as archive:
    names=archive.namelist();assert "manifest.json"in names and"config.json"in names and"__init__.py"in names
    assert not any("__pycache__"in n or n.endswith((".pyc",".db",".sqlite3",".log",".map"))or"learner"in n or"tests"in n for n in names)
    manifest=json.loads(archive.read("manifest.json"));config=json.loads(archive.read("config.json"));assert manifest["version"]=="0.5.0";assert config["environment"]in{"local","staging","production"}
    bootstrap=archive.read("__init__.py").decode();assert "from .snaportho_reviewer.bootstrap import register" in bootstrap
    payload=b"".join(archive.read(n)for n in names);assert b"SUPABASE_SERVICE_ROLE"not in payload and b"BEGIN PRIVATE KEY"not in payload
digest=hashlib.sha256(package.read_bytes()).hexdigest();expected=package.with_suffix(package.suffix+".sha256").read_text().split()[0];assert digest==expected;print(json.dumps({"verified":True,"package":str(package),"sha256":digest,"files":len(names)}))
