from dataclasses import dataclass
from urllib.parse import urlparse
SUPPORTED_ENVIRONMENTS={"local","staging","production"}
FORBIDDEN_KEYS={"token","access_token","service_role_key","credential","password","reviewer_identity","card_content"}
@dataclass(frozen=True)
class Settings:
    environment:str; base_url:str; request_timeout_seconds:int; diagnostics_enabled:bool
def validate(raw):
    if set(raw)&FORBIDDEN_KEYS:raise ValueError("secret or protected configuration key")
    if raw.get("environment") not in SUPPORTED_ENVIRONMENTS:raise ValueError("unsupported environment")
    parsed=urlparse(str(raw.get("base_url","")))
    if parsed.scheme not in {"http","https"} or not parsed.netloc:raise ValueError("invalid backend URL")
    loopback=parsed.hostname in {"127.0.0.1","localhost","::1"}
    if parsed.scheme!="https" and not(raw["environment"]=="local" and loopback):raise ValueError("HTTPS required outside loopback local development")
    timeout=raw.get("request_timeout_seconds")
    if not isinstance(timeout,int) or not 5<=timeout<=60:raise ValueError("timeout must be 5-60 seconds")
    if not isinstance(raw.get("diagnostics_enabled"),bool):raise ValueError("diagnostics_enabled must be boolean")
    return Settings(raw["environment"],raw["base_url"].rstrip("/"),timeout,raw["diagnostics_enabled"])
