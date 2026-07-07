# -*- coding: utf-8 -*-
"""生成 1996-2025 全明星卡池 assets/data/allstar_pool.json

资格判定: awards.json 中最新快照 allStar 数 > 1996年及以前快照 allStar 数
(即 1997 年后至少入选过一次全明星), 再并上 1996 年全明星正赛名单补充
(只在 1996 入选、之后再未入选的球员)。

每位球员输出:
- 巅峰赛季(1996-2025 内 gp>=40 且综合得分最高的常规赛)真实数据 + 当季球队
- 生涯荣誉计数(最新快照)
- 属性行: 距巅峰年最近的花名册 CSV 行(供 rowToPlayer 使用)
"""
import csv
import json
import os
import re
import unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HIST = os.path.join(ROOT, 'assets', 'data', 'historical')
DATA = os.path.join(ROOT, 'assets', 'data')
OUT = os.path.join(DATA, 'allstar_pool.json')

YEAR_FROM, YEAR_TO = 1996, 2025

# 1996 年全明星正赛名单(补充只在 1996 入选的球员; 已达标者并入为无操作)
ALLSTAR_1996_SUPPLEMENT = [
    'local:michaeljordan', 'local:scottiepippen', 'local:anferneehardaway',
    'local:granthill', 'nba:shaq-oneal', 'local:patrickewing',
    'local:alonzomourning', 'local:reggiemiller', 'local:vinbaker',
    'local:terrellbrandon', 'local:juwanhoward', 'local:hakeemolajuwon',
    'local:davidrobinson', 'local:charlesbarkley', 'local:karlmalone',
    'local:johnstockton', 'local:garypayton', 'local:shawnkemp',
    'local:clydedrexler', 'local:seanelliott', 'local:jasonkidd',
    'local:detlefschrempf',
]

# awards.json 缺失/为零的 90 年代名宿荣誉补丁(逐项取 max 合并; 均为公开生涯事实)
HONOR_PATCHES = {
    'local:charlesbarkley': {'allStar': 11, 'allStarMvp': 1, 'mvp': 1,
                             'allNba1': 5, 'allNba2': 5, 'allNba3': 1, 'rebound': 1},
    'local:clydedrexler': {'allStar': 10, 'rings': 1, 'allNba1': 1,
                           'allNba2': 2, 'allNba3': 2},
    'local:detlefschrempf': {'allStar': 3, 'sixthMan': 2, 'allNba3': 2},
    'local:seanelliott': {'allStar': 2, 'rings': 1},
    'local:terrellbrandon': {'allStar': 2},
}

# 花名册代码 -> 赛季年 (与 82-draft-challenge.js ROSTER_SEASONS 一致)
ROSTER_CODES = {
    1: 2025, 2: 2025, 3: 2024, 4: 2023, 5: 2022, 6: 2021, 7: 2020,
    8: 2019, 9: 2018, 10: 2016, 11: 2012, 12: 2009, 13: 2006, 14: 2003,
    15: 1996,  # 属性兜底: 1998 前后巅峰的球员(如乔丹)取 1996 名册属性
}

TEAM_CN = {
    'BOS': '凯尔特人', 'BKN': '篮网', 'NJN': '篮网', 'NYK': '尼克斯', 'PHI': '76人',
    'TOR': '猛龙', 'CHI': '公牛', 'CLE': '骑士', 'DET': '活塞', 'IND': '步行者',
    'MIL': '雄鹿', 'ATL': '老鹰', 'CHA': '黄蜂', 'CHH': '黄蜂', 'MIA': '热火',
    'ORL': '魔术', 'WAS': '奇才', 'DEN': '掘金', 'MIN': '森林狼', 'OKC': '雷霆',
    'SEA': '超音速', 'POR': '开拓者', 'UTA': '爵士', 'GSW': '勇士', 'LAC': '快船',
    'LAL': '湖人', 'PHX': '太阳', 'PHO': '太阳', 'SAC': '国王', 'DAL': '独行侠',
    'HOU': '火箭', 'MEM': '灰熊', 'VAN': '灰熊', 'NOP': '鹈鹕', 'NOH': '黄蜂',
    'NOK': '黄蜂', 'SAS': '马刺', 'BRK': '篮网', 'CHO': '黄蜂', 'WSB': '子弹',
}

HONOR_KEYS = ['rings', 'mvp', 'fmvp', 'dpoy', 'roy', 'allStar', 'allStarMvp',
              'allNba1', 'allNba2', 'allNba3', 'allDefensive', 'scoring',
              'rebound', 'assist', 'block', 'steal', 'sixthMan']


def norm_key(name):
    s = unicodedata.normalize('NFKD', str(name or ''))
    s = ''.join(c for c in s if not unicodedata.combining(c))
    return re.sub(r'[^a-z0-9]', '', s.lower())


def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def latest_snapshot(snaps, until=9999):
    years = sorted(int(y) for y in snaps if int(y) <= until)
    return snaps[str(years[-1])] if years else None


def merge_honors(base, patch):
    out = {k: int(base.get(k, 0) or 0) for k in HONOR_KEYS}
    for k, v in (patch or {}).items():
        out[k] = max(out.get(k, 0), int(v))
    return out


def qualified_allstars(awards):
    out = {}
    supplement = set(ALLSTAR_1996_SUPPLEMENT)
    for pid, snaps in awards['playerAwards'].items():
        last = latest_snapshot(snaps) or {}
        pre = latest_snapshot(snaps, until=1996) or {}
        in_window = last.get('allStar', 0) > pre.get('allStar', 0)
        honors = merge_honors(last, HONOR_PATCHES.get(pid))
        if (in_window or pid in supplement) and honors['allStar'] > 0:
            out[pid] = honors
    # 补充名单里 awards DB 完全没有的球员: 直接采用补丁荣誉
    for pid in sorted(supplement - set(awards['playerAwards'])):
        honors = merge_honors({}, HONOR_PATCHES.get(pid))
        if honors['allStar'] > 0:
            out[pid] = honors
        else:
            print('  ! 1996 supplement missing from awards DB and no patch:', pid)
    return out


def load_seasons():
    """realId -> [season rows 1998-2025 regular]"""
    by_player = {}
    for year in range(YEAR_FROM, YEAR_TO + 1):
        path = os.path.join(HIST, f'player_seasons_{year}.json')
        if not os.path.exists(path):
            continue
        data = load_json(path)
        rows = data if isinstance(data, list) else (
            data.get('rows') or data.get('players') or data.get('seasons') or [])
        for row in rows:
            if str(row.get('type', 'regular')) != 'regular':
                continue
            if int(row.get('seasonEndYear', year) or year) != year:
                continue
            rid = row.get('realId')
            if rid:
                by_player.setdefault(rid, []).append(row)
    return by_player


def season_score(row):
    return (float(row.get('ppg', 0) or 0)
            + float(row.get('rpg', 0) or 0) * 1.1
            + float(row.get('apg', 0) or 0) * 1.4
            + float(row.get('spg', 0) or 0) * 1.6
            + float(row.get('bpg', 0) or 0) * 1.6)


def pick_peak(rows):
    ok = [r for r in rows if int(r.get('gp', 0) or 0) >= 40]
    pool = ok or rows
    return max(pool, key=season_score) if pool else None


def load_rosters():
    """norm(nameBirth) -> [(code, year, row)]"""
    by_name = {}
    for code, year in ROSTER_CODES.items():
        path = os.path.join(DATA, f'rosters{code:02d}.csv')
        if not os.path.exists(path):
            continue
        with open(path, encoding='utf-8-sig') as f:
            reader = csv.DictReader(f, delimiter=';')
            for row in reader:
                row = {(k or '').strip('﻿'): v for k, v in row.items()}
                key = norm_key(row.get('nameBirth') or row.get('name'))
                if key:
                    by_name.setdefault(key, []).append((code, year, row))
    return by_name


def honor_summary(h):
    labels = [('rings', '总冠军'), ('mvp', 'MVP'), ('fmvp', 'FMVP'), ('dpoy', 'DPOY'),
              ('roy', 'ROY'), ('allStar', '全明星'), ('allStarMvp', '全明星MVP'),
              ('allNba1', '一阵'), ('allNba2', '二阵'), ('allNba3', '三阵'),
              ('allDefensive', '一防'), ('scoring', '得分王'), ('rebound', '篮板王'),
              ('assist', '助攻王'), ('block', '盖帽王'), ('steal', '抢断王')]
    parts = [f'{label}x{h[k]}' for k, label in labels if h.get(k, 0) > 0]
    return ' / '.join(parts) if parts else '暂无已验证荣誉'


def main():
    awards = load_json(os.path.join(HIST, 'awards.json'))
    qualified = qualified_allstars(awards)
    seasons = load_seasons()
    rosters = load_rosters()

    pool, dropped = [], []
    for pid, honors in sorted(qualified.items()):
        rows = seasons.get(pid) or []
        peak = pick_peak(rows)
        if not peak:
            dropped.append((pid, f'no {YEAR_FROM}-{YEAR_TO} season'))
            continue
        peak_year = int(peak.get('seasonEndYear', 0) or 0)
        key = norm_key(pid.split(':', 1)[-1])
        cand = rosters.get(key) or rosters.get(norm_key(peak.get('name'))) or []
        if not cand:
            dropped.append((pid, f'no roster row ({peak.get("name")})'))
            continue
        code, roster_year, row = min(cand, key=lambda item: abs(item[1] - peak_year))
        abbr = str(peak.get('team', '') or '').upper()
        entry = {
            'id': pid,
            'nameEn': peak.get('name') or row.get('nameBirth') or '',
            'nameCn': row.get('name') or peak.get('name') or '',
            'peakYear': peak_year,
            'peakTeamAbbr': abbr,
            'peakTeamCn': TEAM_CN.get(abbr, abbr),
            'peakTeamId': int(peak.get('teamId', 0) or 0),
            'stats': {
                'gp': int(peak.get('gp', 0) or 0),
                'mins': float(peak.get('mins', 0) or 0),
                'ppg': float(peak.get('ppg', 0) or 0),
                'rpg': float(peak.get('rpg', 0) or 0),
                'apg': float(peak.get('apg', 0) or 0),
                'spg': float(peak.get('spg', 0) or 0),
                'bpg': float(peak.get('bpg', 0) or 0),
                'fgPct': float(peak.get('fgPct', 0) or 0),
                'tpPct': float(peak.get('tpPct', 0) or 0),
                'ftPct': float(peak.get('ftPct', 0) or 0),
            },
            'honors': honors,
            'honorSummary': honor_summary(honors),
            'rosterCode': code,
            'rosterYear': roster_year,
            'row': row,
        }
        pool.append(entry)

    pos_count = {}
    for p in pool:
        pos_count[p['row'].get('positionFirst', '?')] = pos_count.get(
            p['row'].get('positionFirst', '?'), 0) + 1
        if str(p['row'].get('positionSecond', '0')) not in ('', '0'):
            pos_count['+' + p['row']['positionSecond']] = pos_count.get(
                '+' + p['row']['positionSecond'], 0) + 1

    out = {
        'version': 1,
        'range': [YEAR_FROM, YEAR_TO],
        'count': len(pool),
        'players': pool,
    }
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, separators=(',', ':'))

    print(f'pool: {len(pool)} players -> {OUT}')
    print('primary position counts:', {k: v for k, v in sorted(pos_count.items())})
    if dropped:
        print(f'dropped {len(dropped)}:')
        for pid, why in dropped:
            print('  -', pid, why)


if __name__ == '__main__':
    main()
