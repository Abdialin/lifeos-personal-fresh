"""LifeOS next-phase planning foundation: pure, opt-in, no database writes.

Suggestions are drafts only. No schedule/calendar modification is performed.
"""
from datetime import datetime, timedelta, timezone
from collections import defaultdict
from typing import Iterable

DAY_MS = 86400000

def _valid_interval(item):
    try:
        start, end = int(item['start']), int(item['end'])
        return (start, end) if end > start else None
    except (KeyError, TypeError, ValueError, OverflowError):
        return None

def merged_duration(intervals):
    """Milliseconds covered by union of valid half-open intervals."""
    clean = []
    for interval in intervals:
        pair = _valid_interval(interval)
        if pair and pair[1] is not None:
            clean.append(pair)
    clean.sort()
    total, left, right = 0, None, None
    for start, end in clean:
        if left is None:
            left, right = start, end
        elif start <= right:
            right = max(right, end)
        else:
            total += right - left
            left, right = start, end
    return total + (right - left if left is not None else 0)

def day_metrics(sessions: Iterable[dict], day_start_ms: int, now_ms: int, gap_threshold_min=45):
    """Summarize actual tracked time; unlogged gaps are *not* distractions.

    Each segment is clipped to the requested 24h local-day interval. Caller must
    pass the actual next local-midnight timestamp if handling DST transitions;
    this initial contract uses a fixed 24h window.
    """
    end_day = day_start_ms + DAY_MS
    end = min(end_day, now_ms)
    if end < day_start_ms:
        end = day_start_ms
    intervals = []
    total = 0
    for session in sessions:
        for segment in session.get('segments', []):
            start = segment.get('start')
            stop = segment.get('end', None)
            if stop is None:
                stop = now_ms if session.get('status') != 'finished' else None
            try:
                start, stop = int(start), int(stop)
            except (ValueError, TypeError, OverflowError):
                continue
            a, b = max(day_start_ms, start), min(end, stop)
            if b > a:
                intervals.append((a,b))
                total += b-a
    unique = merged_duration([{'start':a,'end':b} for a,b in intervals])
    intervals.sort()
    union = []
    for a,b in intervals:
        if union and a <= union[-1][1]:
            union[-1] = (union[-1][0], max(union[-1][1], b))
        else:
            union.append((a,b))
    gaps=[]
    cursor=day_start_ms
    for a,b in union:
        if a-cursor >= gap_threshold_min*60000:
            gaps.append({'start':cursor,'end':a,'classification':'unlogged'})
        cursor=b
    if end-cursor >= gap_threshold_min*60000:
        gaps.append({'start':cursor,'end':end,'classification':'unlogged'})
    return {'actual_total_ms':total,'actual_unique_ms':unique,'overlap_ms':total-unique,
            'unlogged_gaps':gaps,'planned_ms':None,'data_quality':'partial' if gaps else 'tracked'}

def recommendation(goal: dict, observed_days: list[dict], min_days=14):
    """Conservative, explainable suggestion. Never changes a goal or schedule."""
    target=goal.get('weekly_target')
    if not isinstance(target,(int,float)) or isinstance(target,bool) or target <= 0:
        return {'status':'insufficient_data','reason':'A positive weekly target is required'}
    if len(observed_days)<min_days:
        return {'status':'insufficient_data','reason':f'At least {min_days} observed days are required'}
    if any(d.get('verified') is not True for d in observed_days[-min_days:]):
        return {'status':'insufficient_data','reason':'Recent days contain unverified observations'}
    if any(d.get('recovery_risk') for d in observed_days[-min_days:]):
        return {'status':'hold','reason':'Recovery risk reported; do not increase workload'}
    recent=observed_days[-min_days:]
    achieved=sum(float(d.get('goal_completed',0)) for d in recent)
    expected=target * min_days / 7
    if achieved >= expected*0.9:
        return {'status':'review','suggestion':'consider_small_increase',
                'reason':'At least 90% of target achieved across verified recent days',
                'requires_approval':True,'applied':False}
    return {'status':'hold','reason':'Maintain target until consistency improves','applied':False}
