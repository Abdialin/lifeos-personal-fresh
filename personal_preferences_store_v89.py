"""V89 isolated, revision-checked preferences for a single private LifeOS workspace.

Uses existing API token and HTTP Basic boundary in server.py. Not multi-tenant.
Never accesses the activity/state table and never stores credentials.
"""
import json
import sqlite3

MAX_BYTES = 100_000
FORMAT = 'lifeos.personal.preferences.v88'
GROUPS = frozenset(('durations', 'workouts', 'exercisePlans'))
DURATION_KEYS = frozenset(('fajr','dhuhr','asr','maghrib','isha','prayer','quran','gym','study','work','reading','other'))
WORKOUT_TYPES = frozenset(('Gym','Walking','Running','Boxing','Cycling','Swimming','Yoga','Team sports','Other'))

def validate(data):
    if not isinstance(data, dict) or set(data)-GROUPS:
        raise ValueError('Unsupported preference group; device notification permissions cannot be cloud-synced')
    clean={}
    if 'durations' in data:
        d=data['durations']
        if not isinstance(d, dict) or len(d)>len(DURATION_KEYS) or set(d)-DURATION_KEYS:
            raise ValueError('Invalid duration categories')
        for name,v in d.items():
            if not isinstance(v,dict) or set(v)!=set(('minutes',)) or type(v['minutes']) is not int or not 5<=v['minutes']<=1440:
                raise ValueError('Invalid duration profile')
        clean['durations']=d
    if 'workouts' in data:
        a=data['workouts']
        if not isinstance(a,list) or len(a)>30:
            raise ValueError('Invalid workout list')
        for w in a:
            if not isinstance(w,dict) or set(w)!=set(('id','label','type','minutes','intensity','detail')):
                raise ValueError('Invalid workout preset fields')
            if not isinstance(w['id'],str) or not 1<=len(w['id'])<=90 or not isinstance(w['label'],str) or not 1<=len(w['label'].strip())<=70:
                raise ValueError('Invalid workout identifier')
            if w['type'] not in WORKOUT_TYPES or w['intensity'] not in ('','Easy','Moderate','Hard') or not isinstance(w['detail'],str) or len(w['detail'])>500:
                raise ValueError('Invalid workout preset values')
            if w['minutes'] is not None and (type(w['minutes']) is not int or not 0<=w['minutes']<=1440):
                raise ValueError('Invalid workout minutes')
        clean['workouts']=a
    if 'exercisePlans' in data:
        plans=data['exercisePlans']
        if not isinstance(plans,list) or len(plans)>20:
            raise ValueError('Invalid exercise plan list')
        ids=set()
        for p in plans:
            if not isinstance(p,dict) or set(p)!=set(('id','name','type','exercises')):
                raise ValueError('Invalid exercise plan fields')
            if not isinstance(p['id'],str) or not 1<=len(p['id'])<=100 or p['id'] in ids:
                raise ValueError('Invalid or duplicated plan ID')
            ids.add(p['id'])
            if not isinstance(p['name'],str) or not 1<=len(p['name'].strip())<=70 or p['type'] not in WORKOUT_TYPES:
                raise ValueError('Invalid plan name or type')
            exercises=p['exercises']
            if not isinstance(exercises,list) or not 1<=len(exercises)<=30:
                raise ValueError('Exercise plans require 1–30 exercises')
            for e in exercises:
                if not isinstance(e,dict) or set(e)!=set(('name','sets','reps','load')):
                    raise ValueError('Invalid exercise fields')
                if not isinstance(e['name'],str) or not 1<=len(e['name'].strip())<=65:
                    raise ValueError('Invalid exercise name')
                if type(e['sets']) is not int or not 1<=e['sets']<=20 or type(e['reps']) is not int or not 1<=e['reps']<=100:
                    raise ValueError('Invalid exercise sets or reps')
                if e['load'] is not None and (type(e['load']) not in (int,float) or not 0<=e['load']<=1000):
                    raise ValueError('Invalid exercise load')
        clean['exercisePlans']=plans
    if len(json.dumps(clean,ensure_ascii=False).encode())>MAX_BYTES:
        raise ValueError('Preferences exceed size limit')
    return clean

def init_sqlite(path):
    with sqlite3.connect(path) as db:
        db.execute('''CREATE TABLE IF NOT EXISTS personal_preferences (
            id INTEGER PRIMARY KEY CHECK(id=1),
            revision INTEGER NOT NULL,
            payload TEXT NOT NULL)''')

def read(db_url,sqlite_path,psycopg,lock):
    if db_url:
        with psycopg.connect(db_url,connect_timeout=10) as db:
            with db.cursor() as cur:
                cur.execute('SELECT revision,payload FROM lifeos.personal_preferences WHERE id=1')
                row=cur.fetchone()
        return {'revision':int(row[0]),'preferences':row[1] if isinstance(row[1],dict) else json.loads(row[1])} if row else {'revision':0,'preferences':{}}
    with lock,sqlite3.connect(sqlite_path) as db:
        row=db.execute('SELECT revision,payload FROM personal_preferences WHERE id=1').fetchone()
    return {'revision':int(row[0]),'preferences':json.loads(row[1])} if row else {'revision':0,'preferences':{}}

def write(db_url,sqlite_path,psycopg,jsonb,lock,expected,data):
    preferences=validate(data)
    if type(expected) is not int or expected<0:
        raise ValueError('Invalid expected revision')
    if db_url:
        with psycopg.connect(db_url,connect_timeout=10) as db:
            with db.cursor() as cur:
                if expected==0:
                    cur.execute('''INSERT INTO lifeos.personal_preferences(id,revision,payload)
                       VALUES(1,1,%s) ON CONFLICT(id) DO NOTHING RETURNING revision''',(jsonb(preferences),))
                else:
                    cur.execute('''UPDATE lifeos.personal_preferences SET revision=revision+1,
                       payload=%s,updated_at=now() WHERE id=1 AND revision=%s RETURNING revision''',(jsonb(preferences),expected))
                row=cur.fetchone()
                if row:return True,int(row[0])
                cur.execute('SELECT revision FROM lifeos.personal_preferences WHERE id=1')
                conflict=cur.fetchone()
                return False,int(conflict[0]) if conflict else 0
    with lock,sqlite3.connect(sqlite_path) as db:
        db.execute('BEGIN IMMEDIATE')
        row=db.execute('SELECT revision FROM personal_preferences WHERE id=1').fetchone()
        current=int(row[0]) if row else 0
        if current!=expected:
            db.rollback()
            return False,current
        db.execute('''INSERT INTO personal_preferences(id,revision,payload) VALUES(1,?,?)
                 ON CONFLICT(id) DO UPDATE SET revision=excluded.revision,payload=excluded.payload''',
                 (current+1,json.dumps(preferences,separators=(',',':'))))
        db.commit()
        return True,current+1
