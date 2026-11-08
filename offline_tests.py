"""Run only import-safe unittest modules; standalone integration scripts run separately."""
import subprocess
import sys
from pathlib import Path
ROOT=Path(__file__).resolve().parent
EXCLUDE={'test_stage12_browser.py','test_stage22_postgres_live.py','test_stage41_postgres_atomic_live.py','test_v3_2.py'}
modules=[p.stem for p in sorted(ROOT.glob('test_*.py')) if p.name not in EXCLUDE]
if __name__=='__main__':
    raise SystemExit(subprocess.call([sys.executable,'-m','unittest','-v',*modules],cwd=ROOT))
