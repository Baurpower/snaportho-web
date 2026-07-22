import json,time,urllib.error,urllib.parse,urllib.request
CONTRACT="snaportho-anki-reviewer.v1";MAX_RESPONSE=2_000_000
class ApiError(RuntimeError):
    def __init__(self,code,status=0,retryable=False,conflict_type=None):super().__init__(code);self.code=code;self.status=status;self.retryable=retryable;self.conflict_type=conflict_type
class ReviewerApi:
    def __init__(self,base_url,credential_store=None,timeout=15,cancelled=lambda:False):self.base_url=base_url.rstrip("/");self.credentials=credential_store;self.timeout=timeout;self.cancelled=cancelled
    def request(self,method,path,payload=None,idempotency_key=None,authenticated=True,retries=2):
        if self.cancelled():raise ApiError("cancelled")
        headers={"Accept":"application/json","X-SnapOrtho-Contract":CONTRACT,"X-SnapOrtho-Client":"reviewer-addon/0.5.0","X-SnapOrtho-Addon-Base-Url":self.base_url}
        if authenticated:
            token=self.credentials.get() if self.credentials else None
            if not token:raise ApiError("unlinked",401)
            headers["X-SnapOrtho-Anki-Token"]=token
        if idempotency_key:headers["Idempotency-Key"]=idempotency_key
        data=None if payload is None else json.dumps(payload,separators=(",",":")).encode()
        if data and len(data)>128_000:raise ApiError("request_too_large",413)
        headers["Content-Type"]="application/json"
        for attempt in range(retries+1):
            try:
                with urllib.request.urlopen(urllib.request.Request(self.base_url+path,data=data,headers=headers,method=method),timeout=self.timeout)as response:
                    raw=response.read(MAX_RESPONSE+1)
                    if len(raw)>MAX_RESPONSE:raise ApiError("response_too_large")
                    return response.status,json.loads(raw or b"{}")
            except urllib.error.HTTPError as error:
                try:body=json.loads(error.read(MAX_RESPONSE))
                except Exception:body={}
                conflict=body.get("conflictType")
                if error.code in(401,403,409):raise ApiError("authorization_failed" if error.code in(401,403) else "conflict",error.code,False,conflict)
                if error.code<500 or attempt==retries:raise ApiError("api_error",error.code,error.code>=500)
            except (OSError,TimeoutError) as error:
                if attempt==retries:raise ApiError("network_error",0,True) from error
            if self.cancelled():raise ApiError("cancelled")
            time.sleep(min(.25*(2**attempt),1))
    def start_link(self,device_name):return self.request("POST","/api/brobot-anki/auth/start-link",{"deviceName":device_name},authenticated=False)
    def poll_link(self,link_code):return self.request("POST","/api/brobot-anki/auth/poll-link",{"linkCode":link_code},authenticated=False,retries=0)
    def me(self):return self.request("GET","/api/anki/reviewer/me")
    def assignments(self):return self.request("GET","/api/anki/reviewer/assignments")
    def assignment(self,assignment_id):return self.request("GET",f"/api/anki/reviewer/assignments/{assignment_id}")
    def start_assignment(self,assignment_id):return self.request("POST",f"/api/anki/reviewer/assignments/{assignment_id}/start",{})
    def submit_mapping(self,item_id,payload,key):return self.request("POST",f"/api/anki/reviewer/items/{item_id}/mapping-review",payload,key)
    def submit_proposal(self,item_id,payload,key):return self.request("POST",f"/api/anki/reviewer/items/{item_id}/change-proposals",payload,key)
    def submit_assignment(self,assignment_id):return self.request("POST",f"/api/anki/reviewer/assignments/{assignment_id}/submit",{})
    def resolve_workspace_card(self,identity):return self.request("POST","/api/anki/reviewer/workspace/resolve-card",identity)
    def search_entities(self,query,limit=20):return self.request("GET",f"/api/anki/reviewer/kg/entities?q={urllib.parse.quote(query)}&limit={int(limit)}")
    def submit_workspace_proposal(self,payload,key):return self.request("POST","/api/anki/reviewer/workspace/proposals",payload,key)
    def workspace_proposals(self,scope="queue"):return self.request("GET",f"/api/anki/reviewer/workspace/proposals?scope={urllib.parse.quote(scope)}")
    def workspace_proposal(self,proposal_id):return self.request("GET",f"/api/anki/reviewer/workspace/proposals/{proposal_id}")
    def workspace_history(self,proposal_id):return self.request("GET",f"/api/anki/reviewer/workspace/proposals/{proposal_id}/history")
    def review_workspace_proposal(self,proposal_id,payload,key):return self.request("POST",f"/api/anki/reviewer/workspace/proposals/{proposal_id}/review",payload,key)
    def current_deck_release(self):return self.request("GET","/api/anki/deck/releases/current")
    def deck_manifest(self,release_id):return self.request("GET",f"/api/anki/deck/releases/{release_id}/manifest")
    def deck_sync_plan(self,payload):return self.request("POST","/api/anki/deck/sync/plan",payload)
    @staticmethod
    def safe_error(error):return{"code":getattr(error,"code",type(error).__name__),"status":getattr(error,"status",0),"conflictType":getattr(error,"conflict_type",None)}
