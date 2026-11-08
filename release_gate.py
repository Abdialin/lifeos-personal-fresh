"""Offline, read-only release gate. Reports unverified external requirements."""
import argparse
import json
import os
from pathlib import Path
from deployment_preflight import inspect

ROOT = Path(__file__).resolve().parent
REQUIRED_GATES = ('docker','postgres','browser','oauth','backup_restore','operator_approval')

def evaluate(env=None, root=ROOT):
    env = dict(os.environ if env is None else env)
    # Local placeholder credentials are only for static package inspection.
    test_env = {'LIFEOS_USERNAME':'offline-check','LIFEOS_PASSWORD':'offline-check-password',
                'LIFEOS_TOKEN':'offline-check-not-for-deployment-' + 'x'*32}
    package = inspect(root, test_env)
    evidence = {k: env.get('LIFEOS_VERIFIED_' + k.upper()) == 'YES' for k in REQUIRED_GATES}
    # Evidence flags are operator attestations, NOT proof the test ran.
    missing = [k for k, ok in evidence.items() if not ok]
    return {'package_valid':package['ready'], 'package_errors':package['errors'],
            'operator_attested':evidence, 'missing_approvals':missing,
            'release_approved':package['ready'] and not missing,
            'warning':'Attestations are self-reported; verify logs, backups and external systems before deploying.'}

if __name__=='__main__':
    p=argparse.ArgumentParser()
    p.add_argument('--json',action='store_true')
    p.add_argument('--require-release',action='store_true')
    args=p.parse_args()
    result=evaluate()
    print(json.dumps(result,indent=2))
    raise SystemExit(1 if not result['package_valid'] or (args.require_release and not result['release_approved']) else 0)
