import json,os,sys,tempfile,unittest,uuid
from unittest.mock import patch
ROOT=os.path.join(os.path.dirname(__file__),"..","addon");sys.path.insert(0,ROOT)
from snaportho_reviewer.contracts import CardIdentity,MappingDraft
from snaportho_reviewer.resolver import resolve_card
from snaportho_reviewer.editor import field_diff,save_local_working_edit
from snaportho_reviewer.state import DraftStore,RetryQueue
from snaportho_reviewer.inbox import assignment_complete,summarize
from snaportho_reviewer.config import validate
from snaportho_reviewer.credential_store import FakeCredentialStore,CredentialUnavailable
from snaportho_reviewer.api import ReviewerApi,ApiError
from snaportho_reviewer.diagnostics import build
from snaportho_reviewer.dialogs import linked_copy
from snaportho_reviewer.workspace import central_fields,central_tags
from snaportho_reviewer.sync import central_sync_hash
class Card:
 def __init__(self,id,h):self.id=id;self.h=h
class Gateway:
 def __init__(self,cards):self.cards=cards;self.saved=[]
 def cards_by_guid_ordinal(self,g,o):return self.cards
 def content_hash(self,c):return c.h
 def save_working_edit(self,*args,**kwargs):self.saved.append((args,kwargs))
class Client:
 def __init__(self,result):self.result=result
 def retry(self,*args):return self.result
class ReviewerTests(unittest.TestCase):
 def setUp(self):self.i=CardIdentity("c","v","guid",0,"a"*64)
 def test_resolution(self):
  self.assertEqual(resolve_card(Gateway([]),self.i).status,"not_found");self.assertEqual(resolve_card(Gateway([Card(1,"a"*64),Card(2,"a"*64)]),self.i).status,"ambiguous");self.assertEqual(resolve_card(Gateway([Card(1,"b"*64)]),self.i).status,"hash_mismatch");self.assertEqual(resolve_card(Gateway([Card(1,"a"*64)]),self.i).status,"resolved")
 def test_decision_and_no_mapping(self):
  MappingDraft("approved",.97,"entity","teaches",None,"resolved").validate()
  with self.assertRaises(ValueError):MappingDraft("approved",.97,None,None,None,"resolved").validate()
 def test_diff_and_no_silent_overwrite(self):
  self.assertEqual(field_diff([{"name":"Front","value":"a"}],[{"name":"Front","value":"b"}])[0]["after"],"b");g=Gateway([])
  with self.assertRaises(PermissionError):save_local_working_edit(g,1,[])
  save_local_working_edit(g,1,[],True);self.assertEqual(len(g.saved),1)
 def test_restart_retry_conflict_and_revocation(self):
  with tempfile.TemporaryDirectory()as d:
   p=os.path.join(d,"s.db");s=DraftStore(p,"user:profile:assignment");key=str(uuid.uuid4());s.save("i","v",{"decision":"defer"},key,"pending");s.db.close();s=DraftStore(p,"user:profile:assignment");self.assertEqual(s.load("i","v")["idempotencyKey"],key);q=RetryQueue(s);self.assertEqual(q.drain(Client("accepted")),["accepted"]);s.save("j","v",{},key,"pending");q.drain(Client("conflict"));self.assertEqual(s.load("j","v")["state"],"conflict");s.save("k","v",{},key,"pending");self.assertEqual(q.drain(Client("accepted"),False),[])
 def test_assignment_ui_and_completion(self):
  items=[{"status":"pending","riskTier":"A"}];self.assertEqual(summarize({"id":"a","status":"assigned","items":items},[])["pending"],1);self.assertFalse(assignment_complete(items));self.assertTrue(assignment_complete([{"status":"skipped_with_reason"}]))
 def test_learner_excludes_reviewer(self):
  with open(os.path.join(os.path.dirname(__file__),"..","learner","__init__.py")) as source: learner=source.read()
  self.assertNotIn("snaportho_reviewer",learner)
  with open(os.path.join(os.path.dirname(__file__),"..","addon","__init__.py")) as source: bootstrap=source.read()
  self.assertIn("from .snaportho_reviewer.bootstrap import register",bootstrap)
  with open(os.path.join(os.path.dirname(__file__),"..","addon","snaportho_reviewer","bootstrap.py"))as source:surfaces=source.read()
  self.assertIn("browser_menus_did_init",surfaces);self.assertIn("reviewer_did_show_question",surfaces);self.assertIn("Review Current Card",surfaces)
 def test_configuration_and_https(self):
  settings=validate({"environment":"local","base_url":"http://127.0.0.1:3000","request_timeout_seconds":15,"diagnostics_enabled":False});self.assertEqual(settings.environment,"local")
  with self.assertRaises(ValueError):validate({"environment":"production","base_url":"http://example.com","request_timeout_seconds":15,"diagnostics_enabled":False})
  with self.assertRaises(ValueError):validate({"environment":"local","base_url":"http://127.0.0.1:3000","request_timeout_seconds":15,"diagnostics_enabled":False,"token":"x"})
 def test_credentials_namespace_and_failure(self):
  store=FakeCredentialStore();store.set("secret");self.assertEqual(store.get(),"secret");store.delete();self.assertIsNone(store.get())
  with self.assertRaises(CredentialUnavailable):FakeCredentialStore(False).get()
 def test_api_safe_error_and_no_token(self):
  store=FakeCredentialStore();api=ReviewerApi("http://127.0.0.1:3000",store)
  with self.assertRaises(ApiError):api.me()
  self.assertNotIn("secret",str(api.safe_error(ApiError("authorization_failed",401))))
 def test_start_link_pins_browser_approval_to_addon_origin(self):
  class Response:
   status=200
   def __enter__(self):return self
   def __exit__(self,*args):return False
   def read(self,*args):return json.dumps({"linkCode":"ABC123","approvalUrl":"http://127.0.0.1:3000/brobot-decks/link?code=ABC123"}).encode()
  captured=[]
  def open_request(request,timeout):captured.append(request);return Response()
  api=ReviewerApi("http://127.0.0.1:3000")
  with patch("snaportho_reviewer.api.urllib.request.urlopen",open_request):api.start_link("Reviewer")
  headers={key.lower():value for key,value in captured[0].header_items()}
  self.assertEqual(headers["x-snaportho-addon-base-url"],"http://127.0.0.1:3000")
 def test_safe_diagnostics(self):
  settings=validate({"environment":"local","base_url":"http://127.0.0.1:3000","request_timeout_seconds":15,"diagnostics_enabled":False});data=build({"ankiVersion":"26.05","qtVersion":6,"profileHash":"abc"},settings,False)
  self.assertNotIn("token",str(data).lower());self.assertEqual(data["profileHash"],"abc")
 def test_link_success_copy_separates_device_and_reviewer_state(self):
  title,detail=linked_copy();self.assertEqual(title,"Device linked successfully");self.assertIn("credential is saved securely",detail);self.assertIn("needs to be provisioned",detail)
  title,detail=linked_copy({"displayName":"Dr Reviewer"});self.assertEqual(title,"Device linked successfully");self.assertIn("Dr Reviewer",detail);self.assertIn("access is ready",detail)
 def test_personal_fields_and_tags_never_enter_central_upload(self):
  fields=central_fields([{"name":"Front","value":"central"},{"name":"Personal_Notes","value":"mine"}]);self.assertEqual(fields,[{"name":"Front","value":"central"}])
  self.assertEqual(central_tags(["SnapOrtho::Foot","personal::favorite"]),["SnapOrtho::Foot"])
 def test_workspace_draft_survives_restart_and_reuses_idempotency(self):
  with tempfile.TemporaryDirectory()as d:
   path=os.path.join(d,"state.db");s=DraftStore(path,"profile:local");payload={"editedFields":[{"name":"Front","value":"new"}],"localIdentity":{"contentHash":"a"*64}};key=str(uuid.uuid4());s.save_workspace("guid",0,"version",payload,key);s.close();s=DraftStore(path,"profile:local");draft=s.load_workspace("guid",0,"version");self.assertEqual(draft["idempotencyKey"],key);self.assertEqual(draft["payload"],payload);s.mark_workspace("guid",0,"version","conflict");self.assertEqual(s.load_workspace("guid",0,"version")["state"],"conflict");s.close()
 def test_central_sync_hash_ignores_personal_fields(self):
  class Note(dict):
   guid="g";tags=["SnapOrtho::Foot","personal::favorite"]
  class SyncCard:
   ord=0
   def __init__(self,personal):self.n=Note(Front="central",Personal_Notes=personal)
   def note(self):return self.n
  self.assertEqual(central_sync_hash(SyncCard("one")),central_sync_hash(SyncCard("two")))
if __name__=="__main__":unittest.main()
