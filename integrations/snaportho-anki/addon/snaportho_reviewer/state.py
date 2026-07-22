import json,os,shutil,sqlite3,time
SCHEMA_VERSION=3
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
    def close(self):self.db.close()
class RetryQueue:
    def __init__(self,store):self.store=store
    def drain(self,client,device_active=True,cancelled=lambda:False):
        if not device_active:return[]
        results=[]
        for item,version,key in self.store.pending():
            if cancelled():break
            result=client.retry(item,version,key);results.append(result)
            if result=="accepted":self.store.mark(item,version,"submitted")
            elif result in{"conflict","unauthorized","revoked"}:self.store.mark(item,version,"conflict")
        return results
