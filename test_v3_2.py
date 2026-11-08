
# Standalone integration smoke test: intentionally inert during unittest discovery.
def main():
    import base64, hashlib, http.client, json, os, subprocess, sys, tempfile, time, socket
    from pathlib import Path
    with tempfile.TemporaryDirectory() as td:
        Path(td,'index.html').write_text('<h1>test</h1>')
        for filename in ('server.py', 'google_calendar.py', 'calendar_audit_store.py', 'atomic_calendar.py'):
            Path(td,filename).write_bytes(Path(__file__).with_name(filename).read_bytes())
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0))
            port = sock.getsockname()[1]
        env={**os.environ,'LIFEOS_DB':td+'/state.sqlite','LIFEOS_USERNAME':'testuser','LIFEOS_PASSWORD':'testpass','LIFEOS_TOKEN':'testtoken','PORT':str(port)}
        env.pop('LIFEOS_DATABASE_URL',None)
        proc=subprocess.Popen([sys.executable,td+'/server.py'],env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        try:
            def req(method,path,body=None,token=True,auth=True):
                conn=http.client.HTTPConnection('127.0.0.1',port,timeout=2)
                headers={}
                if auth: headers['Authorization']='Basic '+base64.b64encode(b'testuser:testpass').decode()
                if token: headers['X-LifeOS-Token']='testtoken'
                if body is not None: headers['Content-Type']='application/json'
                conn.request(method,path,body=json.dumps(body) if body is not None else None,headers=headers)
                r=conn.getresponse();b=r.read();conn.close()
                return r.status,json.loads(b) if b and r.getheader('Content-Type','').startswith('application/json') else b
            for _ in range(50):
                try: req('GET','/healthz');break
                except OSError:time.sleep(.05)
            assert req('GET','/backup',auth=False)[0]==401
            assert req('GET','/api/state',token=False)[0]==401
            assert req('GET','/api/state')[1]=={'revision':0,'data':None}
            assert req('GET','/backup')[1]['revision']==0
            d={'version':1,'sessions':[],'events':[]}
            assert req('PUT','/api/state',{'revision':0,'data':d})==(200,{'revision':1})
            assert req('PUT','/api/state',{'revision':0,'data':d})[0]==409
            assert req('GET','/api/state')[1]=={'revision':1,'data':d}
            backup=req('GET','/backup')[1]
            assert backup['data']==d and backup['revision']==1
            canonical=json.dumps({'revision':1,'data':d},sort_keys=True,separators=(',',':')).encode()
            assert backup['sha256']==hashlib.sha256(canonical).hexdigest()
            assert req('PUT','/api/state',{'revision':1,'data':d})==(200,{'revision':2})
            assert req('GET','/healthz')[0]==200
            print('PASS: SQLite fallback, auth, token, backup checksum, conflict, revision update')
        finally:
            proc.terminate();proc.wait(timeout=3)


if __name__ == "__main__":
    main()
