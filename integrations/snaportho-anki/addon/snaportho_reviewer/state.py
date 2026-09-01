import json,os,shutil,sqlite3,time
SCHEMA_VERSION=4
FORBIDDEN={"token","access_token","credential","service_role_key","rendered_html","card_html","media"}
class DraftStore:
    def __init__(self,path,scope):
        self.path=path;self.scope=scope;os.makedirs(os.path.dirname(path)or".",exist_ok=True)
        try:self.db=sqlite3.connect(path);self.db.execute("pragma quick_check").fetchone()
        except sqlite3.DatabaseError:raise RuntimeError("local reviewer database is corrupt")
        self._migrate()
    def _migrate(self):
        version=self.db.execute("pragma user_version").fetchone()[0]
        if version>SCHEMA_VERSION:raise RuntimeError("local schema is newer than this add-on")
        if version and version<SCHEMA_VERSION and os.path.exists(self.path):shutil.copy2(self.path,self.path+f".v{version}.backup")
        if version<1:self.db.execute("create table drafts(scope text,item_id text,version_id text,payload text,idempotency_key text,state text,updated_at integer,primary key(scope,item_id,version_id))");version=1
        if version<2:
            self.db.execute("create table if not exists cache(scope text,key text,value text,updated_at integer,primary key(scope,key))");version=2
        if version<3:
            self.db.execute("create table if not exists workspace_drafts(scope text,note_guid text,card_ordinal integer,base_version text,payload text,idempotency_key text,state text,updated_at integer,primary key(scope,note_guid,card_ordinal,base_version))");version=3
        if version<4:
            self.db.execute("create table if not exists deck_subscriptions(scope text,deck_key text,release_id text,release_sequence integer,release_version text,cursor integer,aggregate_checksum text,status text,updated_at integer,primary key(scope,deck_key))")
            self.db.execute("create table if not exists deck_note_baselines(scope text,deck_key text,canonical_note_id text,anki_note_id integer,note_guid text,note_version_id text,fields_json text,tags_json text,content_checksum text,tags_checksum text,updated_at integer,primary key(scope,deck_key,canonical_note_id))")
            self.db.execute("create table if not exists deck_apply_journal(scope text,deck_key text,cursor integer,canonical_note_id text,operation text,before_json text,status text,updated_at integer,primary key(scope,deck_key,cursor))")
            self.db.execute("create index if not exists deck_note_baselines_anki_idx on deck_note_baselines(scope,anki_note_id)")
            version=4
        self.db.execute(f"pragma user_version={version}");self.db.commit()
    def save(self,item_id,version_id,payload,idempotency_key,state="draft"):
        if any(str(k).lower() in FORBIDDEN for k in payload):raise ValueError("credentials or protected content forbidden")
        self.db.execute("insert or replace into drafts values(?,?,?,?,?,?,?)",(self.scope,item_id,version_id,json.dumps(payload,sort_keys=True),idempotency_key,state,int(time.time())));self.db.commit()
    def load(self,item_id,version_id):
        row=self.db.execute("select payload,idempotency_key,state from drafts where scope=? and item_id=? and version_id=?",(self.scope,item_id,version_id)).fetchone();return None if not row else{"payload":json.loads(row[0]),"idempotencyKey":row[1],"state":row[2]}
    def delete(self,item_id,version_id):self.db.execute("delete from drafts where scope=? and item_id=? and version_id=?",(self.scope,item_id,version_id));self.db.commit()
    def pending(self):return self.db.execute("select item_id,version_id,idempotency_key from drafts where scope=? and state='pending'",(self.scope,)).fetchall()
    def mark(self,item_id,version_id,state):self.db.execute("update drafts set state=?,updated_at=? where scope=? and item_id=? and version_id=?",(state,int(time.time()),self.scope,item_id,version_id));self.db.commit()
    def cache(self,key,value):self.db.execute("insert or replace into cache values(?,?,?,?)",(self.scope,key,json.dumps(value,sort_keys=True),int(time.time())));self.db.commit()
    def cached(self,key):
        row=self.db.execute("select value from cache where scope=? and key=?",(self.scope,key)).fetchone();return None if not row else json.loads(row[0])
    def save_workspace(self,note_guid,card_ordinal,base_version,payload,idempotency_key,state="draft"):
        if any(str(k).lower() in FORBIDDEN for k in payload):raise ValueError("credentials or diagnostics content forbidden")
        self.db.execute("insert or replace into workspace_drafts values(?,?,?,?,?,?,?,?)",(self.scope,note_guid,card_ordinal,base_version,json.dumps(payload,sort_keys=True),idempotency_key,state,int(time.time())));self.db.commit()
    def load_workspace(self,note_guid,card_ordinal,base_version):
        row=self.db.execute("select payload,idempotency_key,state,updated_at from workspace_drafts where scope=? and note_guid=? and card_ordinal=? and base_version=?",(self.scope,note_guid,card_ordinal,base_version)).fetchone();return None if not row else{"payload":json.loads(row[0]),"idempotencyKey":row[1],"state":row[2],"updatedAt":row[3]}
    def mark_workspace(self,note_guid,card_ordinal,base_version,state):self.db.execute("update workspace_drafts set state=?,updated_at=? where scope=? and note_guid=? and card_ordinal=? and base_version=?",(state,int(time.time()),self.scope,note_guid,card_ordinal,base_version));self.db.commit()
    def delete_workspace(self,note_guid,card_ordinal,base_version):self.db.execute("delete from workspace_drafts where scope=? and note_guid=? and card_ordinal=? and base_version=?",(self.scope,note_guid,card_ordinal,base_version));self.db.commit()
    def cleanup(self,max_age_days=90):
        cutoff=int(time.time())-max_age_days*86400;self.db.execute("delete from drafts where scope=? and state='submitted' and updated_at<?",(self.scope,cutoff));self.db.execute("delete from workspace_drafts where scope=? and state='submitted' and updated_at<?",(self.scope,cutoff));self.db.commit()
    def deck_subscription(self,deck_key="snaportho-master"):
        row=self.db.execute("select release_id,release_sequence,release_version,cursor,aggregate_checksum,status,updated_at from deck_subscriptions where scope=? and deck_key=?",(self.scope,deck_key)).fetchone()
        return None if not row else dict(zip(("releaseId","releaseSequence","releaseVersion","cursor","aggregateChecksum","status","updatedAt"),row))
    def save_deck_subscription(self,release,deck_key="snaportho-master",cursor=0,status="ready"):
        self.db.execute("insert or replace into deck_subscriptions values(?,?,?,?,?,?,?,?,?)",(self.scope,deck_key,release.get("id"),int(release.get("sequence")or 0),release.get("version"),int(cursor),release.get("aggregateChecksum"),status,int(time.time())));self.db.commit()
    def note_baseline(self,canonical_note_id,deck_key="snaportho-master"):
        row=self.db.execute("select anki_note_id,note_guid,note_version_id,fields_json,tags_json,content_checksum,tags_checksum from deck_note_baselines where scope=? and deck_key=? and canonical_note_id=?",(self.scope,deck_key,canonical_note_id)).fetchone()
        return None if not row else{"ankiNoteId":row[0],"noteGuid":row[1],"noteVersionId":row[2],"fields":json.loads(row[3]),"tags":json.loads(row[4]),"contentChecksum":row[5],"tagsChecksum":row[6]}
    def note_baselines(self,deck_key="snaportho-master"):
        rows=self.db.execute("select canonical_note_id,anki_note_id,note_guid,note_version_id,fields_json,tags_json,content_checksum,tags_checksum from deck_note_baselines where scope=? and deck_key=? order by canonical_note_id",(self.scope,deck_key)).fetchall()
        keys=("canonicalNoteId","ankiNoteId","noteGuid","noteVersionId","fields","tags","contentChecksum","tagsChecksum")
        return[dict(zip(keys,(row[0],row[1],row[2],row[3],json.loads(row[4]),json.loads(row[5]),row[6],row[7])))for row in rows]
    def save_note_baseline(self,canonical_note_id,anki_note_id,note_guid,note_version_id,fields,tags,content_checksum,tags_checksum,deck_key="snaportho-master"):
        self.db.execute("insert or replace into deck_note_baselines values(?,?,?,?,?,?,?,?,?,?,?)",(self.scope,deck_key,canonical_note_id,int(anki_note_id),note_guid,note_version_id,json.dumps(fields,sort_keys=True),json.dumps(sorted(tags)),content_checksum,tags_checksum,int(time.time())));self.db.commit()
    def journal_start(self,deck_key,cursor,canonical_note_id,operation,before):
        self.db.execute("insert or replace into deck_apply_journal values(?,?,?,?,?,?,?,?)",(self.scope,deck_key,int(cursor),canonical_note_id,operation,json.dumps(before,sort_keys=True),"pending",int(time.time())));self.db.commit()
    def journal_finish(self,deck_key,cursor,status="applied"):
        self.db.execute("update deck_apply_journal set status=?,updated_at=? where scope=? and deck_key=? and cursor=?",(status,int(time.time()),self.scope,deck_key,int(cursor)));self.db.commit()
    def pending_deck_journal(self,deck_key="snaportho-master"):
        return self.db.execute("select cursor,canonical_note_id,operation,before_json from deck_apply_journal where scope=? and deck_key=? and status='pending' order by cursor",(self.scope,deck_key)).fetchall()
    def close(self):self.db.close()
