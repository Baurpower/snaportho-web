import hashlib,platform,sys
def profile_hash(profile_id):return hashlib.sha256(profile_id.encode()).hexdigest()[:16]
def build(runtime,settings,linked,reviewer=None,last_error=None):
    return{"addonVersion":"0.5.0","apiContract":"snaportho-anki-reviewer.v1","schemaCompatibility":"20260721_130000",
      "ankiVersion":runtime.get("ankiVersion"),"pythonVersion":sys.version.split()[0],"qtVersion":runtime.get("qtVersion"),"operatingSystem":platform.platform(),
      "backendEnvironment":settings.environment,"backendOrigin":settings.base_url,"linked":bool(linked),"reviewerStatus":(reviewer or{}).get("status"),
      "reviewerRoles":(reviewer or{}).get("roles",[]),"profileHash":runtime.get("profileHash"),"localSchemaVersion":2,
      "pendingDrafts":runtime.get("pendingDrafts",0),"pendingRetries":runtime.get("pendingRetries",0),"lastSafeErrorCode":last_error}
