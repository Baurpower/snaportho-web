import hashlib,json,pathlib,sys,zipfile
ROOT=pathlib.Path(__file__).resolve().parents[1];VERSION=json.loads((ROOT/"addon"/"manifest.json").read_text())["version"]
package=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else ROOT.parents[1]/"dist"/f"snaportho-{VERSION}.ankiaddon")
with zipfile.ZipFile(package)as archive:
    names=archive.namelist();assert "manifest.json"in names and"config.json"in names and"__init__.py"in names
    assert not any("__pycache__"in n or n.endswith((".pyc",".db",".sqlite3",".log",".map"))or"learner"in n or"tests"in n for n in names)
    manifest=json.loads(archive.read("manifest.json"));config=json.loads(archive.read("config.json"))
    assert manifest["name"]=="SnapOrtho" and manifest["package"]=="snaportho" and manifest["version"]==VERSION
    assert config["environment"]in{"local","staging","production"}
    bootstrap=archive.read("__init__.py").decode();assert "from .snaportho_reviewer.bootstrap import register" in bootstrap
    edition=archive.read("snaportho_reviewer/__init__.py").decode()
    assert "USER_EDITION = True" in edition and "REVIEWER_EDITION = True" not in edition
    runtime=archive.read("snaportho_reviewer/bootstrap.py").decode()
    assert "if self.reviewer_edition:" in runtime
    assert "from .brobot_panel import LearnerSidePanel" in runtime
    assert 'addMenu("Reviewer tools")' not in runtime
    assert "snaportho_reviewer/snaportho-logo.png" in names
    assert archive.read("snaportho_reviewer/snaportho-logo.png")==(
        ROOT.parents[1]/"public"/"snaportho-logo.png"
    ).read_bytes()
    payload=b"".join(archive.read(n)for n in names);assert b"SUPABASE_SERVICE_ROLE"not in payload and b"BEGIN PRIVATE KEY"not in payload
    assert "poll_search_relay" not in runtime, "stale search relay in packaged add-on"
    assert "_owns_launch_polling" in runtime, "missing launch poll ownership guard"
    assert 'ADDON_VERSION = "'+manifest["version"]+'"' in archive.read("snaportho_reviewer/version.py").decode()

digest=hashlib.sha256(package.read_bytes()).hexdigest();expected=package.with_suffix(package.suffix+".sha256").read_text().split()[0];assert digest==expected;print(json.dumps({"verified":True,"package":str(package),"sha256":digest,"files":len(names)}))
