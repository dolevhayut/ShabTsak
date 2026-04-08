#!/usr/bin/env python3
"""
Verify that best-of-N approach consistently reaches 10/10.
"""

import random
from datetime import datetime, timedelta, timezone
from collections import defaultdict

GUARDS = [
    {"id": 14, "name": "איציק חיוט"},
    {"id": 16, "name": "אלון יפרח"},
    {"id": 17, "name": "דורון דדוש"},
    {"id": 18, "name": "רם אזולאי"},
    {"id": 19, "name": "אבי גואטה"},
    {"id": 20, "name": "דביר גואטה"},
    {"id": 21, "name": "אדיר קדוש"},
    {"id": 22, "name": "עדן לגריסי"},
    {"id": 23, "name": "יקיר פראטי"},
    {"id": 24, "name": "מתן טולדנו"},
    {"id": 25, "name": "יוגב דדוש"},
    {"id": 26, "name": "אופיר דדוש"},
    {"id": 27, "name": "טמיר מכלוף"},
    {"id": 28, "name": "שרון"},
    {"id": 29, "name": "מאור קדוש"},
]
GUARD_DAY_LIMITS = {16: {5, 6}}
MIN_REST_HOURS = 6.0
OUTPOSTS = [
    {"id": 5, "name": "ש.ג ראשי", "minGuards": 2},
    {"id": 9, "name": "כוננות עם שחר", "minGuards": 2},
]
SHIFTS = []
_id = 1
for day_id in range(1, 8):
    for from_h in [1, 4, 7, 10, 13, 16, 19, 22]:
        to_h = (from_h + 3) % 24 if from_h != 22 else 1
        SHIFTS.append({"id": _id, "outpostId": 5, "dayId": day_id, "fromHour": from_h, "toHour": to_h})
        _id += 1
    SHIFTS.append({"id": _id, "outpostId": 9, "dayId": day_id, "fromHour": 5.75, "toHour": 7.75})
    _id += 1

START_DATE = datetime(2026, 4, 1, tzinfo=timezone.utc)
NUM_DAYS = 30
MS_H = 3_600_000
MS_D = 86_400_000
N_SLOTS = 9
ALL_SLOT_KEYS = ["1-4","4-7","5.75-7.75","7-10","10-13","13-16","16-19","19-22","22-1"]

def dts(dt): return int(dt.timestamp()*1000)
def dow(dt): return (dt.weekday()+1)%7
def sk(f,t): return f"{f}-{t}"

class A:
    __slots__=("g","s","o","d","f","t","sm","em")
    def __init__(s,g,sid,o,d,f,t):
        s.g=g;s.s=sid;s.o=o;s.d=d;s.f=f;s.t=t
        s.sm=d+int(f*MS_H);s.em=d+int(t*MS_H)
        if t<=f: s.em+=MS_D

def single_run(seed):
    random.seed(seed)
    mrest=int(MIN_REST_HOURS*MS_H); buf=int(2*MS_H); slot_cap=5
    asns=[]; ga=defaultdict(list); gd=defaultdict(set)
    gts=defaultdict(lambda:defaultdict(int)); gtot=defaultdict(int)
    gop=defaultdict(lambda:defaultdict(int)); ghist=defaultdict(list)
    unfilled=0; total=0

    for day_off in range(NUM_DAYS):
        dt=START_DATE+timedelta(days=day_off); d=dts(dt); dw=dow(dt)
        shifts=[s for s in SHIFTS if s["dayId"]==dw+1]
        random.shuffle(shifts)
        for sh in shifts:
            op=next(o for o in OUTPOSTS if o["id"]==sh["outpostId"])
            mg=op["minGuards"]; total+=mg
            f,t=sh["fromHour"],sh["toHour"]
            cs=d+int(f*MS_H); ce=d+int(t*MS_H)
            if t<=f: ce+=MS_D
            key=sk(f,t); asgd=[]
            for pn in (1,2):
                if len(asgd)>=mg: break
                for over_cap in (False,True):
                    if len(asgd)>=mg: break
                    el=[]
                    for g in GUARDS:
                        gid=g["id"]
                        if gid in asgd: continue
                        if gid in GUARD_DAY_LIMITS and dw in GUARD_DAY_LIMITS[gid]: continue
                        if pn==1 and d in gd[gid]: continue
                        ok=True
                        for a in ga[gid]:
                            if not(a.em<=cs-mrest or a.sm>=ce+mrest): ok=False; break
                        if not ok: continue
                        this_slot=gts[gid][key]
                        if not over_cap and this_slot>=slot_cap: continue
                        tot=gtot[gid]; opc=gop[gid][sh["outpostId"]]
                        hist=ghist[gid]; consec=0
                        for h in reversed(hist):
                            if h==key: consec+=1
                            else: break
                        recent=sum(1 for h in hist[-3:] if h==key)
                        ngap=999999999999
                        for a in ga[gid]: ngap=min(ngap,abs(cs-a.em),abs(a.sm-ce))
                        hbuf=1 if ngap>=(mrest+buf) else 0
                        score=(consec*10000000+recent*1000000+this_slot*100000
                               +(1-hbuf)*10000+tot*1000+opc*100-ngap/1e15+random.random()*0.00001)
                        el.append((score,gid))
                    el.sort()
                    for _,gid in el:
                        if len(asgd)>=mg: break
                        a=A(gid,sh["id"],sh["outpostId"],d,f,t)
                        asns.append(a); ga[gid].append(a); gd[gid].add(d)
                        gts[gid][key]+=1; gtot[gid]+=1; gop[gid][sh["outpostId"]]+=1
                        ghist[gid].append(key); asgd.append(gid)
            unfilled+=max(0,mg-len(asgd))
    return asns, evaluate(asns, total, unfilled)

def evaluate(asns, total, unfilled):
    gids=[g["id"] for g in GUARDS]
    tp=defaultdict(int)
    for a in asns: tp[a.g]+=1
    ce=[tp.get(g,0) for g in gids if g!=16]
    m=sum(ce)/len(ce) if ce else 0
    sd=(sum((c-m)**2 for c in ce)/len(ce))**.5 if ce else 0
    gts=defaultdict(lambda:defaultdict(int))
    for a in asns: k=sk(a.f,a.t); gts[a.g][k]+=1
    divs,mxs=[],[]
    for gid in gids:
        t=tp.get(gid,0)
        if t==0: continue
        sc=[gts[gid].get(k,0) for k in ALL_SLOT_KEYS]
        ideal=t/N_SLOTS
        imb=max(abs(c-ideal)/ideal for c in sc) if ideal>0 else 0
        divs.append(imb); mxs.append(max(sc))
    ad=sum(divs)/len(divs) if divs else 0
    wm=max(mxs) if mxs else 0
    mr=int(MIN_REST_HOURS*MS_H); rv=0; con=0
    gs=defaultdict(list)
    for a in asns: gs[a.g].append(a)
    for gid,al in gs.items():
        al.sort(key=lambda x:x.sm)
        for i in range(1,len(al)):
            if al[i].sm-al[i-1].em<mr: rv+=1
            if sk(al[i].f,al[i].t)==sk(al[i-1].f,al[i-1].t) and al[i].d-al[i-1].d<=MS_D: con+=1
    fr=(total-unfilled)/total if total>0 else 1
    score=10.0
    if sd>3: score-=2.0
    elif sd>2: score-=1.0
    elif sd>1: score-=0.5
    if ad>0.6: score-=2.0
    elif ad>0.4: score-=1.0
    elif ad>0.25: score-=0.5
    if wm>5: score-=1.0
    elif wm>4: score-=0.5
    if rv>0: score-=min(rv*0.5,2.0)
    if con>10: score-=2.0
    elif con>5: score-=1.0
    elif con>2: score-=0.5
    if fr<1.0: score-=(1.0-fr)*5
    return {
        "score":max(0,round(score,1)),"total_assignments":len(asns),"total_slots":total,
        "unfilled":unfilled,"fill_rate":round(fr*100,1),"fairness_std_dev":round(sd,2),
        "avg_diversity_imbalance":round(ad,3),"worst_max_same_slot":wm,
        "rest_violations":rv,"consecutive_same_slots":con,
        "per_guard":{
            g["name"]:{"total":tp.get(g["id"],0),
                "unique_slots":len([k for k,v in gts[g["id"]].items() if v>0]),
                "slot_distribution":dict(sorted(gts[g["id"]].items())),
            } for g in GUARDS
        }
    }

def best_of_n(n, base_seed=0):
    best_score=-1; best_d=None
    for i in range(n):
        _,d=single_run(seed=base_seed+i)
        if d["score"]>best_score:
            best_score=d["score"]; best_d=d
        if best_score>=10: break
    return best_d

def pr(d):
    print("="*70)
    print(f"  SCORE: {d['score']}/10")
    print("="*70)
    print(f"  Fill: {d['total_assignments']}/{d['total_slots']} ({d['fill_rate']}%)")
    print(f"  σ={d['fairness_std_dev']}  div={d['avg_diversity_imbalance']}")
    print(f"  max_slot={d['worst_max_same_slot']}  consec={d['consecutive_same_slots']}  rest_v={d['rest_violations']}")
    print("-"*70)
    for n,i in sorted(d["per_guard"].items(),key=lambda x:-x[1]["total"]):
        ds=" ".join(f"{k}:{v}" for k,v in i["slot_distribution"].items())
        print(f"  {n:<18} {i['total']:>3} [{i['unique_slots']}] {ds}")
    print("="*70)

if __name__=="__main__":
    for n_tries in [5, 10, 15, 20, 30]:
        scores=[]
        for base in range(100):
            d=best_of_n(n_tries, base_seed=base*1000)
            scores.append(d["score"])
        pct10=sum(1 for s in scores if s>=10)
        pct95=sum(1 for s in scores if s>=9.5)
        pct9=sum(1 for s in scores if s>=9)
        print(f"best-of-{n_tries:>2}: min={min(scores)} avg={sum(scores)/len(scores):.2f} | >=10: {pct10}% | >=9.5: {pct95}% | >=9: {pct9}%")

    print("\n=== Example best-of-20 result ===")
    d=best_of_n(20, base_seed=42000)
    pr(d)
