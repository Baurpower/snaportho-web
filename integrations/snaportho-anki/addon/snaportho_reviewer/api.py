import json, socket, time, urllib.error, urllib.parse, urllib.request
from .version import ADDON_VERSION

CONTRACT = "snaportho-anki-reviewer.v1"
MAX_RESPONSE = 2_000_000
# Deck inventory POSTs can be large; chunking keeps each body well under this.
MAX_REQUEST = 512_000


class ApiError(RuntimeError):
    def __init__(
        self,
        code,
        status=0,
        retryable=False,
        conflict_type=None,
        server_message=None,
        body=None,
        path=None,
    ):
        super().__init__(code)
        self.code = code
        self.status = status
        self.retryable = retryable
        self.conflict_type = conflict_type
        self.server_message = server_message
        self.body = body or {}
        self.path = path


def _classify_http_error(status, body, path):
    """Map HTTP failures to stable client codes the UI can branch on."""
    message = ""
    if isinstance(body, dict):
        message = str(body.get("error") or body.get("message") or "")
    lower = message.lower()
    path = path or ""

    if status == 426 or body.get("error") == "upgrade_required":
        return "upgrade_required", False
    if status == 429 or body.get("error") == "daily_limit_reached":
        return "daily_limit_reached", False
    if body.get("error") == "database_upgrade_required":
        return "database_upgrade_required", False
    if status == 404:
        if "bootstrap" in path or "bootstrap" in lower or "artifact" in lower:
            return "no_bootstrap_artifact", False
        if "release" in path or "release" in lower or "published" in lower:
            return "no_release", False
        return "not_found", False
    if status in (401, 403):
        return "authorization_failed", False
    if status == 409:
        return "conflict", False
    if status >= 500:
        return "server_error", True
    return "api_error", status >= 500


class ReviewerApi:
    def __init__(self, base_url, credential_store=None, timeout=15, cancelled=lambda: False):
        self.base_url = base_url.rstrip("/")
        self.credentials = credential_store
        self.timeout = timeout
        self.cancelled = cancelled

    def request(
        self,
        method,
        path,
        payload=None,
        idempotency_key=None,
        authenticated=True,
        retries=2,
        extra_headers=None,
        timeout=None,
    ):
        if self.cancelled():
            raise ApiError("cancelled")
        headers = {
            "Accept": "application/json",
            "X-SnapOrtho-Contract": CONTRACT,
            "X-SnapOrtho-Client": f"reviewer-addon/{ADDON_VERSION}",
            "X-SnapOrtho-Addon-Base-Url": self.base_url,
        }
        if authenticated:
            token = self.credentials.get() if self.credentials else None
            if not token:
                raise ApiError("unlinked", 401)
            headers["X-SnapOrtho-Anki-Token"] = token
        if idempotency_key:
            headers["Idempotency-Key"] = idempotency_key
        headers.update(extra_headers or {})
        data = None if payload is None else json.dumps(payload, separators=(",", ":")).encode()
        if data and len(data) > MAX_REQUEST:
            raise ApiError(
                "request_too_large",
                413,
                server_message=f"body_bytes={len(data)} limit={MAX_REQUEST}",
            )
        headers["Content-Type"] = "application/json"
        for attempt in range(retries + 1):
            try:
                with urllib.request.urlopen(
                    urllib.request.Request(self.base_url + path, data=data, headers=headers, method=method),
                    timeout=self.timeout if timeout is None else timeout,
                ) as response:
                    raw = response.read(MAX_RESPONSE + 1)
                    if len(raw) > MAX_RESPONSE:
                        raise ApiError("response_too_large")
                    return response.status, json.loads(raw or b"{}")
            except urllib.error.HTTPError as error:
                try:
                    body = json.loads(error.read(MAX_RESPONSE))
                except Exception:
                    body = {}
                if not isinstance(body, dict):
                    body = {}
                conflict = body.get("conflictType")
                code, retryable = _classify_http_error(error.code, body, path)
                if code == "conflict":
                    raise ApiError(
                        "conflict",
                        error.code,
                        False,
                        conflict,
                        body.get("error"),
                        body,
                        path,
                    )
                # Retry only transient 5xx
                if error.code >= 500 and attempt < retries:
                    pass
                else:
                    raise ApiError(
                        code,
                        error.code,
                        retryable,
                        conflict,
                        body.get("error") or body.get("message"),
                        body,
                        path,
                    )
            except (socket.timeout, TimeoutError) as error:
                if attempt == retries:
                    raise ApiError("request_timeout", 0, True) from error
            except OSError as error:
                if attempt == retries:
                    raise ApiError("network_error", 0, True) from error
            if self.cancelled():
                raise ApiError("cancelled")
            time.sleep(min(0.25 * (2**attempt), 1))

    def start_link(self, device_name):
        return self.request(
            "POST",
            "/api/brobot-anki/auth/start-link",
            {"deviceName": device_name},
            authenticated=False,
        )

    def poll_link(self, link_code):
        return self.request(
            "POST",
            "/api/brobot-anki/auth/poll-link",
            {"linkCode": link_code},
            authenticated=False,
            retries=0,
        )

    def me(self):
        return self.request("GET", "/api/anki/reviewer/me")

    def review_queue(self, scope="priority", limit=100):
        return self.request(
            "GET",
            f"/api/anki/reviewer/queue?scope={urllib.parse.quote(scope)}&limit={int(limit)}",
            retries=0,
        )

    def resolve_workspace_card(self, identity):
        return self.request("POST", "/api/anki/reviewer/workspace/resolve-card", identity)

    def search_entities(self, query, limit=20):
        return self.request(
            "GET",
            f"/api/anki/reviewer/kg/entities?q={urllib.parse.quote(query)}&limit={int(limit)}",
        )

    def resource_search(self, payload):
        """Read-only search over directly reviewed question/card KG assertions."""
        return self.request(
            "POST",
            "/api/anki/reviewer/resource-search",
            payload,
            retries=0,
        )

    def pending_search_requests(self):
        return self.request("GET", "/api/anki/search-requests/pending", retries=0)

    def claim_search_request(self, request_id):
        return self.request("POST", f"/api/anki/search-requests/{request_id}/claim", {}, retries=0)

    def complete_search_request(self, request_id, payload):
        return self.request("POST", f"/api/anki/search-requests/{request_id}/complete", payload, retries=0)

    def kg_draft(self, payload):
        """Card-driven KG suggestions (no graph write)."""
        return self.request("POST", "/api/anki/reviewer/kg/draft", payload, retries=0)

    def kg_analyze(self, payload):
        """Background card understanding; no KG lookup or graph write."""
        return self.request("POST", "/api/anki/reviewer/kg/analyze", payload, retries=0)

    def kg_suggest_improvement(self, payload, key):
        """Build and persist an immutable graph-diff suggestion."""
        return self.request(
            "POST", "/api/anki/reviewer/kg/improvements/suggest", payload, key
        )

    def kg_improvement_decision(self, payload, key):
        """Accept or reject one immutable graph-diff suggestion."""
        return self.request(
            "POST", "/api/anki/reviewer/kg/improvements/decision", payload, key
        )

    def kg_confirm(self, payload, key):
        """Confirm accepted drafts → workspace proposal."""
        return self.request("POST", "/api/anki/reviewer/kg/confirm", payload, key)

    def submit_workspace_proposal(self, payload, key):
        return self.request("POST", "/api/anki/reviewer/workspace/proposals", payload, key)

    def workspace_proposals(self, scope="queue"):
        return self.request(
            "GET",
            f"/api/anki/reviewer/workspace/proposals?scope={urllib.parse.quote(scope)}",
        )

    def workspace_proposal(self, proposal_id):
        return self.request("GET", f"/api/anki/reviewer/workspace/proposals/{proposal_id}")

    def workspace_history(self, proposal_id):
        return self.request(
            "GET",
            f"/api/anki/reviewer/workspace/proposals/{proposal_id}/history",
        )

    def review_workspace_proposal(self, proposal_id, payload, key):
        return self.request(
            "POST",
            f"/api/anki/reviewer/workspace/proposals/{proposal_id}/review",
            payload,
            key,
        )

    def current_deck_release(self):
        return self.request("GET", "/api/anki/deck/releases/current")

    def deck_manifest(self, release_id):
        return self.request("GET", f"/api/anki/deck/releases/{release_id}/manifest")

    def deck_sync_plan(self, payload):
        return self.request("POST", "/api/anki/deck/sync/plan", payload)

    def deck_media(self, release_id, sha256):
        return self.request("GET", f"/api/anki/deck/releases/{release_id}/media/{sha256}")

    def deck_bootstrap_apkg(self, release_id):
        return self.request(
            "GET",
            f"/api/anki/deck/releases/{release_id}/artifact/bootstrap_apkg",
        )

    def sync_ack(self, payload):
        return self.request("POST", "/api/anki/deck/sync/ack", payload)

    def brobot_chat(self, payload):
        # Use the same persisted, structured BroBot engine as the website.
        return self.request(
            "POST",
            "/api/brobot/chat",
            payload,
            retries=0,
            extra_headers={"X-BroBot-Response-Version": "2"},
            # The web UI streams this longer pipeline. Anki consumes the final
            # JSON response, so it needs a dedicated completion timeout.
            timeout=max(self.timeout, 75),
        )

    @staticmethod
    def safe_error(error):
        return {
            "code": getattr(error, "code", type(error).__name__),
            "status": getattr(error, "status", 0),
            "conflictType": getattr(error, "conflict_type", None),
            "serverMessage": getattr(error, "server_message", None),
        }
