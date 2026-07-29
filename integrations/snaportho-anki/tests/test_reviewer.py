import json,os,sys,tempfile,unittest,uuid
from unittest.mock import patch
ROOT=os.path.join(os.path.dirname(__file__),"..","addon");sys.path.insert(0,ROOT)
from snaportho_reviewer.contracts import CardIdentity
from snaportho_reviewer.resolver import resolve_card
from snaportho_reviewer.editor import field_diff,save_local_working_edit
from snaportho_reviewer.state import DraftStore
from snaportho_reviewer.config import validate
from snaportho_reviewer.credential_store import FakeCredentialStore,CredentialUnavailable
from snaportho_reviewer.api import ReviewerApi,ApiError
from snaportho_reviewer.diagnostics import build
from snaportho_reviewer.dialogs import access_level_label,format_roles,linked_copy,summarize_local_deck
from snaportho_reviewer.errors import describe,headline
from snaportho_reviewer.version import ADDON_VERSION
from snaportho_reviewer.workspace import central_fields,central_tags,split_structured,combo_for_tag,tag_for_label,LEVEL_TAGS,YIELD_TAGS,CENTRAL_TAG_RE
from snaportho_reviewer.sync import central_sync_hash
from snaportho_reviewer.brobot_panel import ATTENDING_PROMPT,OITE_PROMPT,card_context,chat_payload,deck_footer_text,plain_text
from snaportho_reviewer.resource_search import anki_card_query,parse_orthobullets_id,request_payload,resolve_local_results,result_summary
from snaportho_reviewer.bootstrap import ANKI_DOWNLOAD_URL,MIN_ANKI,UnsupportedAnkiError
class Card:
 def __init__(self,id,h):self.id=id;self.h=h
class Gateway:
 def __init__(self,cards):self.cards=cards;self.saved=[]
 def cards_by_guid_ordinal(self,g,o):return self.cards
 def content_hash(self,c):return c.h
 def save_working_edit(self,*args,**kwargs):self.saved.append((args,kwargs))
class ReviewerTests(unittest.TestCase):
 def setUp(self):self.i=CardIdentity("c","v","guid",0,"a"*64)
 def test_anki_2509_is_supported(self):
  self.assertEqual(MIN_ANKI,(25,9))
  error=UnsupportedAnkiError("25.02.7")
  self.assertIn("Anki 25.09 or newer is required",str(error))
  self.assertIn("installed: 25.02.7",str(error))
  self.assertEqual(ANKI_DOWNLOAD_URL,"https://apps.ankiweb.net/")
 def test_old_anki_dialog_is_actionable(self):
  with open(os.path.join(os.path.dirname(__file__),"..","addon","snaportho_reviewer","bootstrap.py"))as source:text=source.read()
  self.assertIn('setWindowTitle("Anki update required")',text)
  self.assertIn('addButton("Open Anki Download Page"',text)
  self.assertIn("profiles, decks, review history, and SnapOrtho drafts will remain in place",text)
 def test_learner_panel_has_only_two_teaching_prompts(self):
  self.assertEqual(ATTENDING_PROMPT,"What would an attending ask related to this?")
  self.assertEqual(OITE_PROMPT,"What is a common OITE board trap or question?")
  with open(os.path.join(os.path.dirname(__file__),"..","addon","snaportho_reviewer","brobot_panel.py"))as source:text=source.read()
  self.assertIn("LearnerSidePanel",text);self.assertNotIn("Suggest KG improvements",text);self.assertNotIn("Card classification",text)
 def test_learner_chat_payload_is_card_scoped_and_bounded(self):
  class Note(dict):
   id=9;guid="guid-9";tags=["SnapOrtho::Trauma"]
  class LocalCard:
   ord=0;did=1
   def note(self):return Note(Front="<b>Tibial plateau fracture</b>",Back="Assess alignment")
   def question(self):return "rendered question"
   def answer(self):return "rendered answer"
  context=card_context(LocalCard())
  self.assertEqual(context["key"],"guid-9:0");self.assertEqual(context["question"],"Tibial plateau fracture");self.assertEqual(context["topic"],"Trauma")
  conversation={"conversationId":str(uuid.uuid4()),"messages":[{"role":"user","content":str(i)}for i in range(25)]}
  payload=chat_payload(" Why? ",context,conversation)
  self.assertEqual(payload["message"],"Why?")
  self.assertEqual(payload["prompt"],"Why?")
  self.assertEqual(payload["mode"],"auto")
  self.assertEqual(payload["responseDepth"],"standard")
  self.assertEqual(payload["trainingLevel"],"pgy2")
  first=chat_payload("Why?",context,{"conversationId":None,"messages":[]})
  self.assertIn("Card front: Tibial plateau fracture",first["message"])
  self.assertIn("My question: Why?",first["message"])
  self.assertEqual(payload["conversationId"],conversation["conversationId"])
  self.assertNotIn("conversationId",chat_payload("First question",context,{"conversationId":None,"messages":[]}))
  self.assertNotIn("conversationId",chat_payload("Retry",context,{"conversationId":"not-a-uuid","messages":[]}))
  self.assertNotIn("<b>",plain_text("<b>Hello</b>&nbsp;there"))
  self.assertEqual(plain_text("{{c1::Partial Articular Supraspinatus Tendon Avulsion}}"),"Partial Articular Supraspinatus Tendon Avulsion")
 def test_deck_footer_distinguishes_installed_and_latest_versions(self):
  self.assertEqual(deck_footer_text(None,None,0),"Master Deck not installed")
  self.assertIn("Latest 2026.08",deck_footer_text(None,"2026.08",0))
  self.assertIn("Up to date",deck_footer_text("2026.08","2026.08",100))
  update=deck_footer_text("2026.07","2026.08",100);self.assertIn("2026.07 → 2026.08",update);self.assertIn("Update available",update)
 def test_resolution(self):
  self.assertEqual(resolve_card(Gateway([]),self.i).status,"not_found");self.assertEqual(resolve_card(Gateway([Card(1,"a"*64),Card(2,"a"*64)]),self.i).status,"ambiguous");self.assertEqual(resolve_card(Gateway([Card(1,"b"*64)]),self.i).status,"hash_mismatch");self.assertEqual(resolve_card(Gateway([Card(1,"a"*64)]),self.i).status,"resolved")
 def test_diff_and_no_silent_overwrite(self):
  self.assertEqual(field_diff([{"name":"Front","value":"a"}],[{"name":"Front","value":"b"}])[0]["after"],"b");g=Gateway([])
  with self.assertRaises(PermissionError):save_local_working_edit(g,1,[])
  save_local_working_edit(g,1,[],True);self.assertEqual(len(g.saved),1)
 def test_draft_store_survives_restart_and_marks_conflict(self):
  with tempfile.TemporaryDirectory()as d:
   p=os.path.join(d,"s.db");s=DraftStore(p,"user:profile:assignment");key=str(uuid.uuid4());s.save("i","v",{"decision":"defer"},key,"pending");s.db.close();s=DraftStore(p,"user:profile:assignment");self.assertEqual(s.load("i","v")["idempotencyKey"],key);s.mark("i","v","conflict");self.assertEqual(s.load("i","v")["state"],"conflict");s.close()
 def test_learner_excludes_reviewer(self):
  with open(os.path.join(os.path.dirname(__file__),"..","learner","__init__.py")) as source: learner=source.read()
  self.assertNotIn("snaportho_reviewer",learner)
  with open(os.path.join(os.path.dirname(__file__),"..","addon","__init__.py")) as source: bootstrap=source.read()
  self.assertIn("from .snaportho_reviewer.bootstrap import register",bootstrap)
  with open(os.path.join(os.path.dirname(__file__),"..","addon","snaportho_reviewer","bootstrap.py"))as source:surfaces=source.read()
  self.assertIn("browser_menus_did_init",surfaces);self.assertIn("reviewer_did_show_question",surfaces);self.assertIn("Review Current Card",surfaces);self.assertIn("Get Started / Master Deck",surfaces);self.assertIn("Propose SnapOrtho changes",surfaces);self.assertIn("editor_did_init_buttons",surfaces)
 def test_user_and_reviewer_editions_have_distinct_runtime_surfaces(self):
  with open(os.path.join(os.path.dirname(__file__),"..","addon","snaportho_reviewer","bootstrap.py"))as source:text=source.read()
  self.assertIn("from . import REVIEWER_EDITION",text)
  reviewer=text[text.index("if self.reviewer_edition:"):text.index("self._maybe_first_run_prompt()")]
  self.assertIn("ReviewerSidePanel",reviewer)
  self.assertIn("_register_editor_propose_button",reviewer)
  self.assertIn("LearnerSidePanel",reviewer)
  self.assertLess(reviewer.index("ReviewerSidePanel"),reviewer.index("LearnerSidePanel"))
 def test_packaged_editions_can_coexist(self):
  with open(os.path.join(os.path.dirname(__file__),"..","scripts","package_addon.py"))as source:text=source.read()
  self.assertIn('"conflicts":[]',text)
 def test_user_addon_is_preferred_relay_handler_when_both_are_installed(self):
  with open(os.path.join(os.path.dirname(__file__),"..","addon","snaportho_reviewer","bootstrap.py"))as source:text=source.read()
  self.assertIn("if self._handles_search_relay():",text)
  handler=text[text.index("def _handles_search_relay"):text.index("def open_dashboard")]
  self.assertIn('if not self.reviewer_edition:return True',handler)
  self.assertIn('"snaportho" not in set(self.mw.addonManager.allAddons())',handler)
 def test_user_edition_installs_browse_search_before_reviewer_gate(self):
  with open(os.path.join(os.path.dirname(__file__),"..","addon","snaportho_reviewer","bootstrap.py"))as source:text=source.read()
  browse=text[text.index("    def add_browser_action"):text.index("    def open_resource_search")]
  self.assertLess(browse.index("install_browser_search_surface"),browse.index("if not self.reviewer_enabled:return"))
  self.assertLess(browse.index("Search SnapOrtho by Orthobullets ID"),browse.index("if not self.reviewer_enabled:return"))
  self.assertGreater(browse.index("Propose SnapOrtho changes"),browse.index("if not self.reviewer_enabled:return"))
 def test_configuration_and_https(self):
  settings=validate({"environment":"local","base_url":"http://127.0.0.1:3000","request_timeout_seconds":15,"diagnostics_enabled":False});self.assertEqual(settings.environment,"local")
  with self.assertRaises(ValueError):validate({"environment":"production","base_url":"http://example.com","request_timeout_seconds":15,"diagnostics_enabled":False})
  with self.assertRaises(ValueError):validate({"environment":"local","base_url":"http://127.0.0.1:3000","request_timeout_seconds":15,"diagnostics_enabled":False,"token":"x"})
  with open(os.path.join(os.path.dirname(__file__),"..","addon","config.json"))as source:packaged=json.load(source)
  self.assertEqual(packaged["environment"],"production");self.assertEqual(packaged["base_url"],"https://snap-ortho.com")
 def test_credentials_namespace_and_failure(self):
  store=FakeCredentialStore();store.set("secret");self.assertEqual(store.get(),"secret");store.delete();self.assertIsNone(store.get())
  with self.assertRaises(CredentialUnavailable):FakeCredentialStore(False).get()
 def test_api_safe_error_and_no_token(self):
  store=FakeCredentialStore();api=ReviewerApi("http://127.0.0.1:3000",store)
  with self.assertRaises(ApiError):api.me()
  self.assertNotIn("secret",str(api.safe_error(ApiError("authorization_failed",401))))
 def test_workspace_proposal_posts_edits_to_backend_with_auth_and_idempotency(self):
  class Response:
   status=200
   def __enter__(self):return self
   def __exit__(self,*args):return False
   def read(self,*args):return json.dumps({"proposalId":str(uuid.uuid4()),"status":"submitted","canonicalDataChanged":False}).encode()
  captured=[]
  def open_request(request,timeout):captured.append(request);return Response()
  credentials=FakeCredentialStore();credentials.set("reviewer-device-token")
  api=ReviewerApi("https://snap-ortho.com",credentials)
  key=str(uuid.uuid4())
  payload={"contractVersion":"snaportho-anki-reviewer.v1","editedFields":[{"name":"Text","value":"Corrected calcitonin card"}]}
  with patch("snaportho_reviewer.api.urllib.request.urlopen",open_request):
   _,body=api.submit_workspace_proposal(payload,key)
  request=captured[0]
  self.assertEqual(request.full_url,"https://snap-ortho.com/api/anki/reviewer/workspace/proposals")
  self.assertEqual(request.method,"POST")
  headers={name.lower():value for name,value in request.header_items()}
  self.assertEqual(headers["x-snaportho-anki-token"],"reviewer-device-token")
  self.assertEqual(headers["idempotency-key"],key)
  self.assertEqual(json.loads(request.data)["editedFields"][0]["value"],"Corrected calcitonin card")
  self.assertFalse(body["canonicalDataChanged"])
 def test_resource_search_input_parsing_and_contract(self):
  for raw in ("123456","ob:123456","qid: 123456","orthobullets:123456"):
   self.assertEqual(parse_orthobullets_id(raw),"123456")
  for raw in ("OBQ14.85","ob:OBQ14.85","OBQ14-85","obq14.85"):
   self.assertEqual(parse_orthobullets_id(raw),"OBQ14-85")
  self.assertEqual(parse_orthobullets_id("https://www.orthobullets.com/testview?qid=OBQ14.85"),"OBQ14-85")
  self.assertEqual(parse_orthobullets_id("https://www.orthobullets.com/testview?qid=ABC-12"),"ABC-12")
  self.assertEqual(parse_orthobullets_id("https://www.orthobullets.com/questions/ABC-12"),"ABC-12")
  self.assertIsNone(parse_orthobullets_id("https://example.com/testview?qid=123"))
  self.assertIsNone(parse_orthobullets_id("bad id"))
  payload=request_payload("123456",100)
  self.assertEqual(payload["contractVersion"],"snaportho-resource-search.v1")
  self.assertEqual(payload["scopes"],["direct"]);self.assertEqual(payload["limit"],50)
  semantic=request_payload("123456",12,"Superior trunk brachial plexus","Finger abduction remains intact")
  self.assertEqual(semantic["scopes"],["direct","latest_deck_concept"])
  self.assertEqual(semantic["query"]["testedConcept"],"Superior trunk brachial plexus")
  topic=request_payload("4092",50,"Duchenne muscular dystrophy","Sections",["dystrophin"],"topic_page",[
   {"id":"diagnosis","heading":"Diagnosis","concepts":["genetic testing"],"priority":5},
  ])
  self.assertEqual(topic["query"]["kind"],"topic_page")
  self.assertEqual(topic["query"]["sections"][0]["id"],"diagnosis")
 def test_resource_search_local_resolution_and_query(self):
  class LocalGateway:
   def cards_by_guid_ordinal(self,guid,ordinal):
    return {"found":[Card(9,"")],"duplicate":[Card(3,""),Card(4,"")]}.get(guid,[])
   def content_hash(self,card):return card.h
  results=[
   {"canonicalCardId":"a","noteGuid":"found","cardOrdinal":0},
   {"canonicalCardId":"b","noteGuid":"missing","cardOrdinal":0},
   {"canonicalCardId":"c","noteGuid":"duplicate","cardOrdinal":1},
   {"canonicalCardId":"d","noteGuid":"found","cardOrdinal":0,"contentHash":"a"*64},
  ]
  local=resolve_local_results(LocalGateway(),results)
  self.assertEqual(local["cardIds"],[9,9])
  self.assertEqual([row["status"]for row in local["dispositions"]],["available","missing","ambiguous","version_mismatch"])
  self.assertEqual(anki_card_query([9,3,9]),"cid:3 OR cid:9")
  body={"resolution":{"status":"resolved","nativeId":"123","canonicalEntities":[{"label":"Patellar instability"}]},"results":results}
  summary=result_summary(body,local)
  self.assertIn("Patellar instability",summary);self.assertIn("2 available locally",summary);self.assertIn("differ from the current canonical version",summary)
 def test_assignment_surface_is_removed(self):
  api=ReviewerApi("http://127.0.0.1:3000")
  for gone in("assignments","assignment","start_assignment","submit_mapping","submit_proposal","submit_assignment"):
   self.assertFalse(hasattr(api,gone),gone)
  self.assertTrue(hasattr(api,"review_queue"))
 def test_search_relay_only_reports_completion_after_opening_browse(self):
  with open(os.path.join(os.path.dirname(__file__),"..","addon","snaportho_reviewer","bootstrap.py"))as source:
   text=source.read()
  poll=text[text.index("def poll_search_relay"):text.index("def _claimed_search")]
  self.assertNotIn("reviewer_enabled",poll)
  relay=text[text.index("def _resolve_relay_search"):text.index("def propose_from_editor")]
  self.assertLess(relay.index("open_browse_with_card_ids("),relay.index("complete_search_request("))
  self.assertIn('"errorCode":"browse_open_failed"',relay)
  self.assertNotIn("local_concept_card_ids",relay)
  self.assertIn('"localSupplementCount":0',relay)
 def test_question_relay_does_not_apply_the_topic_page_cap(self):
  with open(os.path.join(os.path.dirname(__file__),"..","addon","snaportho_reviewer","bootstrap.py"))as source:
   text=source.read()
  claim=text[text.index("def _claimed_search"):text.index("def _resolve_relay_search")]
  self.assertIn('30 if request.get("query_kind")=="topic_page" else 50',claim)
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
  self.assertEqual(headers["x-snaportho-addon-base-url"],"http://127.0.0.1:3000");self.assertEqual(headers["x-snaportho-client"],f"reviewer-addon/{ADDON_VERSION}")
 def test_brobot_uses_shared_web_chat_contract(self):
  class Response:
   status=200
   def __enter__(self):return self
   def __exit__(self,*args):return False
   def read(self,*args):return json.dumps({"conversationId":str(uuid.uuid4()),"messageId":str(uuid.uuid4()),"answer":"Answer","detectedMode":"oite","priorityPoints":[],"knowledgeGaps":[],"suggestedQuestions":[],"tags":[]}).encode()
  captured=[]
  def open_request(request,timeout):captured.append((request,timeout));return Response()
  credentials=FakeCredentialStore();credentials.set("device-token")
  api=ReviewerApi("http://127.0.0.1:3000",credentials)
  with patch("snaportho_reviewer.api.urllib.request.urlopen",open_request):
   api.brobot_chat({"message":"Question","prompt":"Question"})
  request,timeout=captured[0]
  self.assertEqual(request.full_url,"http://127.0.0.1:3000/api/brobot/chat")
  self.assertEqual(timeout,75)
  headers={key.lower():value for key,value in request.header_items()}
  self.assertEqual(headers["x-brobot-response-version"],"2")
  self.assertEqual(headers["x-snaportho-anki-token"],"device-token")
 def test_safe_diagnostics(self):
  settings=validate({"environment":"local","base_url":"http://127.0.0.1:3000","request_timeout_seconds":15,"diagnostics_enabled":False});data=build({"ankiVersion":"26.05","qtVersion":6,"profileHash":"abc"},settings,False)
  self.assertNotIn("token",str(data).lower());self.assertEqual(data["profileHash"],"abc");self.assertEqual(data["addonVersion"],ADDON_VERSION)
 def test_link_success_copy_separates_device_and_reviewer_state(self):
  title,detail=linked_copy();self.assertEqual(title,"Signed in successfully");self.assertIn("credential was saved securely",detail)
  title,detail=linked_copy({"displayName":"Dr Reviewer"});self.assertEqual(title,"Signed in successfully");self.assertIn("Dr Reviewer",detail);self.assertIn("BroBot",detail)
 def test_request_too_large_error_copy_is_honest(self):
  err=ApiError("request_too_large",413,server_message="body_bytes=200000 limit=128000")
  self.assertEqual(headline(err),"Request too large")
  self.assertIn("inventory",describe(err).lower())
  self.assertNotIn("This card is too large",describe(err))
 def test_merge_sync_plan_actions_priority(self):
  from snaportho_reviewer.sync import chunk_list,merge_sync_plan_actions
  self.assertEqual(chunk_list([1,2,3,4,5],2),[[1,2],[3,4],[5]])
  merged=merge_sync_plan_actions([
   [{"canonicalCardId":"a","action":"add"},{"canonicalCardId":"b","action":"unchanged"}],
   [{"canonicalCardId":"a","action":"add"},{"canonicalCardId":"b","action":"update"}],
   [{"canonicalCardId":"c","action":"conflict","reason":"x"}],
  ])
  by={x["canonicalCardId"]:x["action"] for x in merged}
  self.assertEqual(by,{"a":"add","b":"update","c":"conflict"})
 def test_side_panel_status_soft_mismatch(self):
  from snaportho_reviewer.surfaces import (
   build_enrichment_edited_fields,
   build_enrichment_proposal_payload,
   build_enrichment_tag_changes,
   build_ob_qid_tag,
   label_for_tag,
   parse_ob_question_id,
   side_panel_status,
   LEVEL_OPTIONS,
   IMPORTANCE_OPTIONS,
  )
  matched=side_panel_status({"found":True,"contentMatches":True,"versionNumber":3,"mappings":[{},{}]})
  self.assertIn("Master",matched);self.assertIn("v3",matched);self.assertIn("2 KG",matched)
  # Soft style mismatch must NOT alarm as "Differs from master"
  mismatch=side_panel_status({"found":True,"identityResolved":True,"contentMatches":False,"styleMismatchLikely":True,"versionNumber":1,"mappings":[]})
  self.assertIn("Master",mismatch);self.assertIn("No KG links yet",mismatch)
  self.assertNotIn("Differs from master",mismatch)
  missing=side_panel_status({"found":False,"identityResolved":False})
  self.assertIn("Not in the master deck",missing)
  with open(os.path.join(os.path.dirname(__file__),"..","addon","snaportho_reviewer","surfaces.py"))as source:panel=source.read()
  self.assertIn("GOVERNED HIERARCHY",panel)
  self.assertIn("No leaf fact will be proposed yet",panel)
  self.assertIn("Hierarchy first",panel)
  fields=build_enrichment_edited_fields({},orthobullets="bullets",orthobullets_link="https://ob.example",rock="",rock_link="")
  self.assertEqual({f["name"] for f in fields},{"Orthobullets","Orthobullets_Link"})
  tags=build_enrichment_tag_changes(
   ["SnapOrtho::Level::PGY1","SnapOrtho::Yield::Low","SnapOrtho::Foot"],
   level_label="PGY3",importance_label="High",ob_question_id="3009",
  )
  self.assertIn("SnapOrtho::Level::PGY3",tags["add"])
  self.assertIn("SnapOrtho::Yield::High",tags["add"])
  self.assertIn("SnapOrtho::OB::QuestionId::3009",tags["add"])
  self.assertIn("SnapOrtho::Level::PGY1",tags["remove"])
  self.assertIn("SnapOrtho::Yield::Low",tags["remove"])
  self.assertNotIn("SnapOrtho::Foot",tags["remove"])
  self.assertEqual(parse_ob_question_id(["SnapOrtho::OB::QuestionId::abc-1"]),"abc-1")
  self.assertEqual(build_ob_qid_tag("  12 34  "),"SnapOrtho::OB::QuestionId::12-34")
  self.assertEqual(label_for_tag(LEVEL_OPTIONS,["SnapOrtho::Level::MS4"]),"MS4")
  self.assertEqual(label_for_tag(IMPORTANCE_OPTIONS,["SnapOrtho::Yield::High"]),"High")
  payload=build_enrichment_proposal_payload(
   {"found":True,"canonicalCardId":"c","canonicalCardVersionId":"v","contentHash":"a"*64},
   {"noteGuid":"g","cardOrdinal":0,"contentHash":"b"*64},
   edited_fields=fields,mapping_changes=[],notes="hi",central_tag_changes=tags,
  )
  self.assertEqual(payload["sourceSurface"],"reviewer_panel")
  self.assertEqual(payload["proposalKind"],"edit_existing_card")
  self.assertEqual(payload["editedFields"],fields)
  self.assertEqual(payload["notes"],"hi")
  self.assertEqual(payload["centralTagChanges"],tags)
 def test_settings_access_level_and_deck_summary(self):
  self.assertEqual(access_level_label(["administrator","clinical_editor"]),"Administrator")
  self.assertEqual(access_level_label(["clinical_editor"]),"Clinical editor")
  self.assertEqual(access_level_label([],status="pending"),"Inactive (pending)")
  self.assertIn("Clinical editor",format_roles(["clinical_editor","mapping_reviewer"]))
  empty=summarize_local_deck([])
  self.assertFalse(empty["installed"]);self.assertEqual(empty["cardCount"],0)
  installed=summarize_local_deck([{"canonicalCardVersionId":"v1"},{"canonicalCardVersionId":"v1"},{"canonicalCardVersionId":"v2"}])
  self.assertTrue(installed["installed"]);self.assertEqual(installed["cardCount"],3);self.assertEqual(installed["versionCount"],2)
 def test_personal_fields_and_tags_never_enter_central_upload(self):
  fields=central_fields([{"name":"Front","value":"central"},{"name":"Personal_Notes","value":"mine"}]);self.assertEqual(fields,[{"name":"Front","value":"central"}])
  self.assertEqual(central_tags(["SnapOrtho::Foot","personal::favorite"]),["SnapOrtho::Foot"])
 def test_error_copy_never_conflates_auth_with_conflict(self):
  auth=ApiError("authorization_failed",403);self.assertEqual(headline(auth),"Sign-in needed");self.assertIn("Sign In",describe(auth))
  conflict=ApiError("conflict",409,False,"local_content_changed");self.assertEqual(headline(conflict),"Needs comparison");self.assertIn("master card changed",describe(conflict))
  self.assertEqual(headline(ApiError("network_error",0,True)),"Offline")
  self.assertEqual(headline(ApiError("request_timeout",0,True)),"BroBot took too long")
  self.assertIn("too long",describe(ApiError("request_timeout",0,True)).lower())
  self.assertNotIn("Manual comparison",describe(auth))
 def test_typed_release_errors_are_human(self):
  no_release=ApiError("no_release",404,server_message="no published SnapOrtho deck release")
  self.assertEqual(headline(no_release),"No deck published")
  self.assertIn("No published SnapOrtho Master Deck",describe(no_release))
  self.assertNotIn("api_error",describe(no_release))
  no_boot=ApiError("no_bootstrap_artifact",404)
  self.assertEqual(headline(no_boot),"Starter pack missing")
  self.assertIn("starter",describe(no_boot).lower())
  upgrade=ApiError("upgrade_required",426,body={"downloadUrl":"https://example.com/addon"})
  self.assertIn("newer",describe(upgrade).lower());self.assertIn("example.com",describe(upgrade))
 def test_http_error_classification_for_releases(self):
  from snaportho_reviewer.api import _classify_http_error
  self.assertEqual(_classify_http_error(404,{"error":"no published SnapOrtho deck release"},"/api/anki/deck/releases/current")[0],"no_release")
  self.assertEqual(_classify_http_error(404,{"error":"bootstrap artifact not found"},"/api/anki/deck/releases/x/artifact/bootstrap_apkg")[0],"no_bootstrap_artifact")
  self.assertEqual(_classify_http_error(426,{"error":"upgrade_required"},"/api/anki/deck/sync/plan")[0],"upgrade_required")
  self.assertEqual(_classify_http_error(500,{"error":"boom"},"/api/anki/deck/releases/current")[0],"server_error")
  self.assertEqual(_classify_http_error(503,{"error":"database_upgrade_required"},"/api/anki/reviewer/kg/improvements/suggest")[0],"database_upgrade_required")
 def test_master_deck_menu_entry_and_helpers(self):
  with open(os.path.join(os.path.dirname(__file__),"..","addon","snaportho_reviewer","bootstrap.py"))as source:boot=source.read()
  self.assertIn("Get Started / Master Deck",boot)
  self.assertIn("MasterDeckDialog",boot)
  from snaportho_reviewer import master_deck
  from snaportho_reviewer.master_deck import plan_counts,has_master_markers
  self.assertIs(master_deck.tempfile,tempfile)
  self.assertEqual(plan_counts({"actions":[{"action":"add"},{"action":"add"},{"action":"unchanged"}]}),{"add":2,"unchanged":1})
  # has_master_markers needs a collection; pure inventory empty via fake
  class Col:
   def find_cards(self,q):return[]
  self.assertFalse(has_master_markers(Col()))
 def test_master_deck_can_launch_native_anki_importer(self):
  with open(os.path.join(os.path.dirname(__file__),"..","addon","snaportho_reviewer","master_deck.py"))as source:text=source.read()
  self.assertIn('"Import into Anki now"',text)
  self.assertIn("from aqt.import_export.importing import import_file",text)
  self.assertIn("import_file(self.runtime.mw, path)",text)
  self.assertIn("self.dialog.accept()",text)
 def test_master_deck_download_resumes_partial_file(self):
  from snaportho_reviewer.master_deck import format_download_size,stream_download_to_part
  class Response:
   status=206
   def __init__(self,data):self.data=data
   def __enter__(self):return self
   def __exit__(self,*args):return False
   def getcode(self):return self.status
   def read(self,size):
    data,self.data=self.data[:size],self.data[size:]
    return data
  with tempfile.TemporaryDirectory()as d:
   path=os.path.join(d,"deck.part")
   with open(path,"wb")as handle:handle.write(b"abc")
   requests=[]
   progress=[]
   def open_request(request,timeout):
    requests.append(request)
    return Response(b"def")
   with patch("snaportho_reviewer.master_deck.urllib.request.urlopen",open_request):
    digest,written=stream_download_to_part("https://cdn.example/deck",path,30,6,lambda written,total:progress.append((written,total)))
   self.assertEqual(requests[0].get_header("Range"),"bytes=3-")
   self.assertEqual(written,6)
   self.assertEqual(progress,[(3,6),(6,6)])
   self.assertEqual(digest,"bef57ec7f53a6d40beb640a780a639c83bc29ac8a9816f1fc6c5c6dcd93c4721")
   with open(path,"rb")as handle:self.assertEqual(handle.read(),b"abcdef")
  self.assertEqual(format_download_size(1536),"1.5 KB")
  self.assertEqual(format_download_size(5*1024*1024),"5.0 MB")
 def test_structured_tags_round_trip_and_stay_consistent(self):
  structured,free=split_structured(["SnapOrtho::Level::Resident","SnapOrtho::Yield::High","SnapOrtho::Foot"])
  self.assertEqual(sorted(structured),["SnapOrtho::Level::Resident","SnapOrtho::Yield::High"]);self.assertEqual(free,["SnapOrtho::Foot"])
  self.assertEqual(combo_for_tag(LEVEL_TAGS,structured),"Resident");self.assertEqual(combo_for_tag(YIELD_TAGS,structured),"High yield")
  self.assertEqual(combo_for_tag(LEVEL_TAGS,[]),"—")
  self.assertEqual(tag_for_label(LEVEL_TAGS,"Resident"),"SnapOrtho::Level::Resident");self.assertIsNone(tag_for_label(LEVEL_TAGS,"—"))
 def test_structured_and_free_tags_pass_server_central_tag_pattern(self):
  for _,tag in LEVEL_TAGS+YIELD_TAGS:
   if tag:self.assertRegex(tag,CENTRAL_TAG_RE)
  self.assertIsNone(CENTRAL_TAG_RE.match("highyield"));self.assertIsNone(CENTRAL_TAG_RE.match("personal::mine"));self.assertRegex("SnapOrtho::HighYield",CENTRAL_TAG_RE)
 def test_workspace_draft_survives_restart_and_reuses_idempotency(self):
  with tempfile.TemporaryDirectory()as d:
   path=os.path.join(d,"state.db");s=DraftStore(path,"profile:local");payload={"editedFields":[{"name":"Front","value":"new"}],"localIdentity":{"contentHash":"a"*64}};key=str(uuid.uuid4());s.save_workspace("guid",0,"version",payload,key);s.close();s=DraftStore(path,"profile:local");draft=s.load_workspace("guid",0,"version");self.assertEqual(draft["idempotencyKey"],key);self.assertEqual(draft["payload"],payload);s.mark_workspace("guid",0,"version","conflict");self.assertEqual(s.load_workspace("guid",0,"version")["state"],"conflict");s.close()
 def test_cross_language_hash_parity_frozen_vectors(self):
  # These MUST equal the TS constants in anki-deck-incorporation.test.ts. Input has non-ASCII
  # (≥, µ), personal + marker fields, and unsorted tags to catch ensure_ascii / sort drift.
  from snaportho_reviewer.sync import PERSONAL_FIELD_RE,MARKER_FIELDS_LOWER
  from snaportho_reviewer.editor import proposed_content_hash
  import hashlib
  fields=[("Front","What is the ≥ threshold?"),("Back","µ value"),("Personal_Notes","mine"),("SnapOrtho_ID","abc")];tags=["SnapOrtho::Foot","SnapOrtho::Ankle","personal::fav","marked"];ordinal=2
  note=dict(fields);parts=[f"{n}\0{note[n]}" for n in sorted(note) if not(PERSONAL_FIELD_RE.match(n)or n.lower()in MARKER_FIELDS_LOWER)]
  parts+= [f"tag\0{t}" for t in sorted(t for t in tags if t.startswith("SnapOrtho::"))]+[f"ord\0{ordinal}"]
  central=hashlib.sha256("\n".join(parts).encode()).hexdigest()
  self.assertEqual(central,"9495123b73dc2f69148fa64ac0a20515a0086c2e34d4a34326f5eac978e074f5")
  identity=proposed_content_hash([{"name":n,"value":v}for n,v in fields],sorted(tags),ordinal)
  self.assertEqual(identity,"e636e4722e5b0d9b863b5c0c6f890d169d4dc55757744d1b9e4f8f7e39ef53d3")
 def test_delta_apply_splits_plan_strips_personal_and_never_writes_conflicts(self):
  from snaportho_reviewer.deck_update import build_operations,apply_operations,central_snapshot_fields,marker_values,ack_status
  def card(cid,vid,guid,ordinal=0,media=None):
   return{"canonicalCardId":cid,"canonicalCardVersionId":vid,"noteGuid":guid,"cardOrdinal":ordinal,"contentHash":"c"*64,"deckPath":"SnapOrtho::Foot","centralTags":["SnapOrtho::Foot"],"fieldSnapshot":[{"name":"Front","value":"Q"},{"name":"Personal_Notes","value":"mine"},{"name":"SnapOrtho_ID","value":"x"}],"mediaHashes":media or[]}
  manifest=[card("u","v1","g-u",media=["a"*64]),card("a","v2","g-a"),card("c","v3","g-c")]
  actions=[{"canonicalCardId":"u","action":"update"},{"canonicalCardId":"a","action":"add"},{"canonicalCardId":"c","action":"conflict","reason":"local_central_fields_changed"},{"canonicalCardId":"x","action":"update"},{"canonicalCardId":"z","action":"unchanged"}]
  ops=build_operations(actions,manifest)
  self.assertEqual([c["canonicalCardId"]for c in ops["update"]],["u"]);self.assertEqual([c["canonicalCardId"]for c in ops["add"]],["a"])
  self.assertEqual(len(ops["conflict"]),1);self.assertEqual(ops["conflict"][0]["reason"],"local_central_fields_changed")
  self.assertEqual(ops["missing_manifest"],["x"]);self.assertEqual(ops["media"],{"a"*64})
  # personal + marker fields are stripped before any write
  self.assertEqual(central_snapshot_fields(manifest[0]["fieldSnapshot"]),[{"name":"Front","value":"Q"}])
  self.assertEqual(marker_values(manifest[0]),{"SnapOrtho_ID":"u","SnapOrtho_Version":"v1","SnapOrtho_Installed_Hash":"c"*64})
  class FakeGateway:
   def __init__(self):self.updates=[];self.creates=[]
   def write_central_update(self,guid,ordinal,fields,tags,deck,markers):self.updates.append((guid,fields,tags,deck,markers));return True
   def create_central_card(self,guid,fields,tags,deck,markers):self.creates.append((guid,fields,markers));return True
  progress=[]
  g=FakeGateway();summary=apply_operations(g,ops,progress=lambda completed,total,activity:progress.append((completed,total,activity)))
  self.assertEqual((summary["updated"],summary["added"],summary["conflicts"]),(1,1,1));self.assertEqual(summary["errors"],[])
  self.assertEqual(len(g.updates),1);self.assertEqual(len(g.creates),1)  # conflict card was never written
  self.assertEqual(g.updates[0][1],[{"name":"Front","value":"Q"}])  # no personal/marker leaked into the write
  self.assertEqual(progress,[(1,2,"Updating cards"),(2,2,"Adding cards")])
  self.assertEqual(ack_status(summary),"applied")
  self.assertEqual(ack_status({"errors":["x"],"updated":1,"added":0}),"partial");self.assertEqual(ack_status({"errors":["x"],"updated":0,"added":0}),"failed")
 def test_delta_apply_reports_not_found_without_aborting(self):
  from snaportho_reviewer.deck_update import build_operations,apply_operations
  manifest=[{"canonicalCardId":"u","canonicalCardVersionId":"v","noteGuid":"g","cardOrdinal":0,"contentHash":"c"*64,"deckPath":"SnapOrtho::Foot","centralTags":[],"fieldSnapshot":[{"name":"Front","value":"Q"}],"mediaHashes":[]}]
  ops=build_operations([{"canonicalCardId":"u","action":"update"}],manifest)
  class MissingGateway:
   def write_central_update(self,*a):return False
  summary=apply_operations(MissingGateway(),ops)
  self.assertEqual(summary["updated"],0);self.assertIn("not_found:u",summary["errors"])
 def test_central_sync_hash_ignores_personal_fields(self):
  class Note(dict):
   guid="g";tags=["SnapOrtho::Foot","personal::favorite"]
  class SyncCard:
   ord=0
   def __init__(self,personal):self.n=Note(Front="central",Personal_Notes=personal)
   def note(self):return self.n
  self.assertEqual(central_sync_hash(SyncCard("one")),central_sync_hash(SyncCard("two")))
 def test_note_sync_v2_merge_protects_personal_and_replaces_governed_tags(self):
  from snaportho_reviewer.deck_sync_v2 import checksum,merge_fields,merge_governed_tags
  self.assertEqual(checksum({"unicode":"≥ µ","a":[1,True,None],"z":{"b":"x"}}),"e6ecd9c1ebaf418390c451e61a9c1caf0547c39c0038a219b89d0546ad7f0dc4")
  result=merge_fields({"Text":"base","Extra":"old"},{"Text":"mine","Extra":"old","Personal_Notes":"private"},{"Text":"remote","Extra":"new","Personal_Notes":"server"},["Text"])
  self.assertEqual(result["fields"]["Text"],"mine");self.assertEqual(result["fields"]["Extra"],"new");self.assertEqual(result["fields"]["Personal_Notes"],"private")
  tags=merge_governed_tags(["mine","SnapOrtho::Diagnosis::Old","SnapOrtho_Protect::Text"],["SnapOrtho::Diagnosis::New"],["SnapOrtho::Diagnosis"])
  self.assertEqual(tags,["SnapOrtho::Diagnosis::New","SnapOrtho_Protect::Text","mine"])
 def test_note_sync_v2_cursor_journal_and_idempotent_empty_followup(self):
  from snaportho_reviewer.deck_sync_v2 import CONTRACT,NoteSyncV2Importer,checksum
  class FakeGateway:
   def __init__(self):self.notes={};self.writes=0
   def snapshot(self,nid):return self.notes.get(nid,{"fields":{},"tags":[]})
   def upsert_note(self,nid,payload,fields,tags):self.notes[nid]={"fields":fields,"tags":tags};self.writes+=1;return{"ankiNoteId":7,"noteGuid":payload["noteGuid"]}
  release={"id":"release","sequence":1,"version":"1","aggregateChecksum":"a"*64}
  payload={"noteGuid":"guid","noteTypeName":"SnapOrtho Master","deckPath":"SnapOrtho","fields":{"Text":"Q"},"governedTags":["SnapOrtho::Diagnosis::ACL"],"governedPrefixes":["SnapOrtho::Diagnosis"],"contentChecksum":"b"*64,"tagsChecksum":"c"*64}
  op={"cursor":1,"releaseId":"release","operationIndex":0,"operation":"upsert_note","noteId":"note","noteVersionId":"version","payloadChecksum":checksum(payload),"payload":payload}
  page={"contractVersion":CONTRACT,"release":release,"nextCursor":1,"remaining":0,"operations":[op],"pageChecksum":checksum([op])}
  with tempfile.TemporaryDirectory()as d:
   store=DraftStore(os.path.join(d,"state.db"),"scope");gateway=FakeGateway();sync=NoteSyncV2Importer(store,gateway)
   self.assertEqual(sync.apply_page(page)["notes"],1);self.assertEqual(gateway.writes,1);self.assertEqual(store.deck_subscription()["cursor"],1);self.assertEqual(store.pending_deck_journal(),[])
   empty={"contractVersion":CONTRACT,"release":release,"nextCursor":1,"remaining":0,"operations":[],"pageChecksum":checksum([])}
   self.assertEqual(sync.apply_page(empty)["notes"],0);self.assertEqual(gateway.writes,1);store.close()
 def test_note_sync_v2_validates_more_than_four_thousand_ordered_operations(self):
  from snaportho_reviewer.deck_sync_v2 import CONTRACT,checksum,validate_page
  ops=[]
  for i in range(1,4002):
   payload={"deckPath":f"SnapOrtho::{i}"}
   ops.append({"cursor":i,"operation":"move_note","payload":payload,"payloadChecksum":checksum(payload)})
  page={"contractVersion":CONTRACT,"nextCursor":4001,"operations":ops,"pageChecksum":checksum(ops)}
  self.assertEqual(validate_page(page,0),[])
 def test_safe_diagnostics_advertise_note_sync_v2(self):
  class Settings:environment="production";base_url="https://snap-ortho.com"
  data=build({"ankiVersion":"25.09","qtVersion":6,"profileHash":"safe","deckSubscription":{"cursor":9},"deckRecoveryInventory":{"inventoryCards":10},"pendingDeckJournal":0},Settings(),True)
  self.assertEqual(data["apiContract"],"snaportho-anki-note-sync.v2");self.assertEqual(data["localSchemaVersion"],4);self.assertEqual(data["deckSubscription"]["cursor"],9)
if __name__=="__main__":unittest.main()
