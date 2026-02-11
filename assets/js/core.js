// core.js
// ============ GAME DATA ============
const TEAMS = [
  { id: 1, n: "Celtics", z: "凯尔特人", a: "BOS", c: "East", cl: "#007A33", r: 88 },
  { id: 2, n: "Nets", z: "篮网", a: "BKN", c: "East", cl: "#000", r: 75 },
  { id: 3, n: "Knicks", z: "尼克斯", a: "NYK", c: "East", cl: "#006BB6", r: 82 },
  { id: 4, n: "76ers", z: "76人", a: "PHI", c: "East", cl: "#006BB6", r: 80 },
  { id: 5, n: "Raptors", z: "猛龙", a: "TOR", c: "East", cl: "#CE1141", r: 76 },
  { id: 6, n: "Bulls", z: "公牛", a: "CHI", c: "East", cl: "#CE1141", r: 74 },
  { id: 7, n: "Cavaliers", z: "骑士", a: "CLE", c: "East", cl: "#860038", r: 85 },
  { id: 8, n: "Pistons", z: "活塞", a: "DET", c: "East", cl: "#C8102E", r: 70 },
  { id: 9, n: "Pacers", z: "步行者", a: "IND", c: "East", cl: "#002D62", r: 81 },
  { id: 10, n: "Bucks", z: "雄鹿", a: "MIL", c: "East", cl: "#00471B", r: 84 },
  { id: 11, n: "Hawks", z: "老鹰", a: "ATL", c: "East", cl: "#E03A3E", r: 77 },
  { id: 12, n: "Hornets", z: "黄蜂", a: "CHA", c: "East", cl: "#1D1160", r: 71 },
  { id: 13, n: "Heat", z: "热火", a: "MIA", c: "East", cl: "#98002E", r: 79 },
  { id: 14, n: "Magic", z: "魔术", a: "ORL", c: "East", cl: "#0077C0", r: 83 },
  { id: 15, n: "Wizards", z: "奇才", a: "WAS", c: "East", cl: "#002B5C", r: 68 },
  { id: 16, n: "Nuggets", z: "掘金", a: "DEN", c: "West", cl: "#0E2240", r: 86 },
  { id: 17, n: "Timberwolves", z: "森林狼", a: "MIN", c: "West", cl: "#0C2340", r: 84 },
  { id: 18, n: "Thunder", z: "雷霆", a: "OKC", c: "West", cl: "#007AC1", r: 87 },
  { id: 19, n: "Trail Blazers", z: "开拓者", a: "POR", c: "West", cl: "#E03A3E", r: 72 },
  { id: 20, n: "Jazz", z: "爵士", a: "UTA", c: "West", cl: "#002B5C", r: 69 },
  { id: 21, n: "Warriors", z: "勇士", a: "GSW", c: "West", cl: "#1D428A", r: 80 },
  { id: 22, n: "Clippers", z: "快船", a: "LAC", c: "West", cl: "#C8102E", r: 78 },
  { id: 23, n: "Lakers", z: "湖人", a: "LAL", c: "West", cl: "#552583", r: 81 },
  { id: 24, n: "Suns", z: "太阳", a: "PHX", c: "West", cl: "#1D1160", r: 79 },
  { id: 25, n: "Kings", z: "国王", a: "SAC", c: "West", cl: "#5A2D81", r: 77 },
  { id: 26, n: "Mavericks", z: "独行侠", a: "DAL", c: "West", cl: "#00538C", r: 82 },
  { id: 27, n: "Rockets", z: "火箭", a: "HOU", c: "West", cl: "#CE1141", r: 73 },
  { id: 28, n: "Grizzlies", z: "灰熊", a: "MEM", c: "West", cl: "#5D76A9", r: 83 },
  { id: 29, n: "Pelicans", z: "鹈鹕", a: "NOP", c: "West", cl: "#0C2340", r: 76 },
  { id: 30, n: "Spurs", z: "马刺", a: "SAS", c: "West", cl: "#C4CED4", r: 74 }
];

const POS = [
  { id: 1, n: "PG", z: "控球后卫", d: "组织进攻，传球为主", tend: { pass: 15, shotInt: -5, shotExt: 10, blk: -15, reb: -10, stl: 10 } },
  { id: 2, n: "SG", z: "得分后卫", d: "外线得分，投射能力强", tend: { pass: 5, shotInt: 0, shotExt: 15, blk: -10, reb: -5, stl: 5 } },
  { id: 3, n: "SF", z: "小前锋", d: "全能型，攻防兼备", tend: { pass: 0, shotInt: 5, shotExt: 5, blk: 0, reb: 0, stl: 0 } },
  { id: 4, n: "PF", z: "大前锋", d: "内线进攻，篮板能力强", tend: { pass: -5, shotInt: 10, shotExt: -5, blk: 5, reb: 10, stl: -5 } },
  { id: 5, n: "C", z: "中锋", d: "护筐，内线统治力", tend: { pass: -10, shotInt: 15, shotExt: -15, blk: 15, reb: 15, stl: -10 } }
];

const ATTRS = [
  { k: "pass", n: "传球", e: "Pass" }, { k: "shotInt", n: "内线", e: "Interior" },
  { k: "shotExt", n: "三分", e: "3PT" }, { k: "shotFree", n: "罚球", e: "FT" },
  { k: "physique", n: "体能", e: "Athletic" }, { k: "blk", n: "盖帽", e: "Block" },
  { k: "reb", n: "篮板", e: "Rebound" }, { k: "stl", n: "抢断", e: "Steal" },
  { k: "speed", n: "速度", e: "Speed" }, { k: "strength", n: "力量", e: "Strength" }
];

const TEMPLATES_BY_POS = {
  1: [
    { id: "pg_floor_general", n: "场上大脑", z: "Floor General", d: "高传控，组织优先", boost: { pass: 14, shotFree: 5, speed: 4 }, nerf: { strength: -4, blk: -8 } },
    { id: "pg_speed_breaker", n: "极速突破", z: "Speed Breaker", d: "爆发第一步，强突篮下", boost: { speed: 12, shotInt: 8, physique: 4 }, nerf: { strength: -4, reb: -4 } },
    { id: "pg_shot_creator", n: "持球投射", z: "Shot Creator", d: "挡拆后自主终结", boost: { shotExt: 10, shotInt: 5, shotFree: 6 }, nerf: { reb: -5, blk: -8 } },
    { id: "pg_pick_roll", n: "挡拆大师", z: "Pick & Roll", d: "传投兼备的挡拆发动机", boost: { pass: 10, shotExt: 7, shotInt: 4 }, nerf: { strength: -3, reb: -3 } },
    { id: "pg_two_way", n: "攻防指挥官", z: "Two-Way Guard", d: "后场防守与组织并重", boost: { pass: 8, stl: 9, speed: 4 }, nerf: { reb: -4, blk: -7 } },
    { id: "pg_press_break", n: "压迫破解", z: "Press Breaker", d: "高压下稳定控失误", boost: { pass: 11, speed: 5, physique: 3 }, nerf: { shotInt: -3, reb: -4 } },
    { id: "pg_clutch", n: "关键控卫", z: "Clutch Guard", d: "关键球处理能力突出", boost: { shotExt: 8, shotFree: 8, pass: 6 }, nerf: { blk: -7, strength: -3 } },
    { id: "pg_transition", n: "快攻发起者", z: "Transition Lead", d: "推反击节奏，转换得分", boost: { speed: 10, pass: 8, shotInt: 4 }, nerf: { strength: -4, blk: -8 } },
    { id: "pg_balanced", n: "均衡核心", z: "Balanced Creator", d: "无明显短板的核心控卫", boost: { pass: 8, shotExt: 6, speed: 4 }, nerf: { blk: -5 } }
  ],
  2: [
    { id: "sg_sniper", n: "纯射手", z: "Sniper", d: "定点与跑位投射顶级", boost: { shotExt: 14, shotFree: 7, speed: 3 }, nerf: { reb: -4, blk: -8 } },
    { id: "sg_three_level", n: "三威胁得分手", z: "Three-Level", d: "内外线都能稳定得分", boost: { shotInt: 8, shotExt: 8, shotFree: 6 }, nerf: { pass: -3, reb: -3 } },
    { id: "sg_slasher", n: "切入终结者", z: "Slasher", d: "冲击篮筐和造罚球", boost: { shotInt: 11, speed: 7, physique: 5 }, nerf: { shotExt: -6, pass: -3 } },
    { id: "sg_lock", n: "外线大锁", z: "Perimeter Lock", d: "防守对位尖兵", boost: { stl: 10, physique: 5, speed: 4 }, nerf: { pass: -4, shotFree: -3 } },
    { id: "sg_offball", n: "无球专家", z: "Off-Ball Ace", d: "空切与接球投篮兼备", boost: { shotExt: 9, speed: 6, shotInt: 4 }, nerf: { pass: -4, reb: -3 } },
    { id: "sg_microwave", n: "第六人火力", z: "Microwave", d: "上场即得分的爆发手", boost: { shotExt: 9, shotInt: 6, shotFree: 5 }, nerf: { pass: -5, reb: -4 } },
    { id: "sg_combo", n: "双能后卫", z: "Combo Guard", d: "持球与无球都能打", boost: { pass: 6, shotExt: 7, speed: 5 }, nerf: { blk: -6, reb: -3 } },
    { id: "sg_transition", n: "反击尖刀", z: "Transition Wing", d: "快攻与追身三分", boost: { speed: 8, shotInt: 6, shotExt: 5 }, nerf: { strength: -3, blk: -6 } },
    { id: "sg_two_way_star", n: "攻防明星", z: "Two-Way Star", d: "高产得分并保持防守强度", boost: { shotExt: 7, stl: 8, physique: 4 }, nerf: { reb: -3 } }
  ],
  3: [
    { id: "sf_two_way", n: "全能侧翼", z: "Two-Way Wing", d: "攻防全面的锋线核心", boost: { shotInt: 6, shotExt: 6, stl: 6 }, nerf: { pass: -2 } },
    { id: "sf_point_forward", n: "组织前锋", z: "Point Forward", d: "锋线持球组织", boost: { pass: 9, shotInt: 5, reb: 4 }, nerf: { blk: -3, shotExt: -2 } },
    { id: "sf_slasher", n: "冲框前锋", z: "Rim Wing", d: "对篮筐持续施压", boost: { shotInt: 10, speed: 6, physique: 5 }, nerf: { shotExt: -5, shotFree: -2 } },
    { id: "sf_corner_sniper", n: "底角狙击", z: "Corner Sniper", d: "高效空间型侧翼", boost: { shotExt: 11, shotFree: 5, speed: 3 }, nerf: { pass: -3, blk: -3 } },
    { id: "sf_lockdown", n: "锁防之翼", z: "Lockdown Wing", d: "盯防顶级得分点", boost: { stl: 9, physique: 6, blk: 4 }, nerf: { pass: -3, shotFree: -3 } },
    { id: "sf_rebounder", n: "篮板前锋", z: "Rebound Wing", d: "二次进攻和防守篮板", boost: { reb: 10, strength: 6, shotInt: 4 }, nerf: { shotExt: -5, pass: -3 } },
    { id: "sf_iso", n: "单打王牌", z: "Iso Wing", d: "中距离和背身单打能力", boost: { shotInt: 8, shotExt: 6, shotFree: 6 }, nerf: { pass: -4, reb: -2 } },
    { id: "sf_fastbreak", n: "快攻终结", z: "Fastbreak Wing", d: "速度型转换得分手", boost: { speed: 8, shotInt: 6, stl: 4 }, nerf: { strength: -3, blk: -3 } },
    { id: "sf_glue", n: "团队胶水", z: "Glue Wing", d: "什么都能做一点", boost: { pass: 6, reb: 6, stl: 5 }, nerf: { shotExt: -2, shotInt: -2 } }
  ],
  4: [
    { id: "pf_stretch", n: "空间四号位", z: "Stretch Four", d: "外线拉开空间", boost: { shotExt: 10, shotFree: 6, pass: 3 }, nerf: { blk: -4, strength: -3 } },
    { id: "pf_post", n: "低位硬解", z: "Post Scorer", d: "背身和中距离终结", boost: { shotInt: 11, strength: 7, shotFree: 4 }, nerf: { speed: -4, stl: -3 } },
    { id: "pf_rim_runner", n: "顺下终结者", z: "Rim Runner", d: "吃饼与空接威胁", boost: { shotInt: 9, speed: 5, physique: 6 }, nerf: { shotExt: -7, pass: -3 } },
    { id: "pf_glass", n: "篮板怪兽", z: "Glass Cleaner", d: "前后场篮板压制", boost: { reb: 12, strength: 7, blk: 5 }, nerf: { shotExt: -8, pass: -3 } },
    { id: "pf_def_anchor", n: "防守轴心", z: "Defensive Anchor", d: "护筐和协防覆盖", boost: { blk: 10, reb: 8, physique: 4 }, nerf: { shotExt: -7, shotFree: -3 } },
    { id: "pf_playmaker", n: "策应内锋", z: "Playmaking Four", d: "高位策应串联", boost: { pass: 8, shotInt: 5, reb: 5 }, nerf: { shotExt: -4, stl: -2 } },
    { id: "pf_midrange", n: "中投内线", z: "Midrange Four", d: "肘区中投和挡拆外弹", boost: { shotInt: 7, shotExt: 6, shotFree: 5 }, nerf: { blk: -3, speed: -2 } },
    { id: "pf_energy", n: "蓝领发动机", z: "Energy Four", d: "拼抢、补防、快下", boost: { reb: 8, physique: 6, speed: 4 }, nerf: { shotExt: -6, pass: -3 } },
    { id: "pf_two_way_star", n: "双向四号位", z: "Two-Way Four", d: "稳定攻防产出", boost: { shotInt: 7, reb: 7, blk: 6 }, nerf: { shotExt: -3 } }
  ],
  5: [
    { id: "c_paint_beast", n: "禁区巨兽", z: "Paint Beast", d: "篮下终结与护筐统治", boost: { shotInt: 12, strength: 9, reb: 8 }, nerf: { shotExt: -12, speed: -5 } },
    { id: "c_rim_protector", n: "护筐中锋", z: "Rim Protector", d: "协防补位和封盖", boost: { blk: 13, reb: 9, physique: 5 }, nerf: { shotExt: -10, pass: -4 } },
    { id: "c_stretch5", n: "空间中锋", z: "Stretch Five", d: "拉开禁区的外线中锋", boost: { shotExt: 10, shotFree: 6, pass: 4 }, nerf: { shotInt: -4, blk: -4 } },
    { id: "c_rebound", n: "篮板塔", z: "Rebound Tower", d: "控制篮板和二次进攻", boost: { reb: 13, strength: 7, shotInt: 5 }, nerf: { shotExt: -10, speed: -4 } },
    { id: "c_high_post", n: "高位策应", z: "High-Post Hub", d: "肘区传导和手递手", boost: { pass: 9, shotInt: 6, shotFree: 5 }, nerf: { shotExt: -6, speed: -3 } },
    { id: "c_pickroll", n: "挡拆终结", z: "P&R Finisher", d: "顺下终结和吃饼", boost: { shotInt: 10, physique: 7, speed: 3 }, nerf: { shotExt: -10, pass: -4 } },
    { id: "c_mobile5", n: "机动五号位", z: "Mobile Five", d: "换防和快速回防", boost: { speed: 7, blk: 8, reb: 6 }, nerf: { strength: -4, shotExt: -7 } },
    { id: "c_brickwall", n: "掩护堡垒", z: "Brick Wall", d: "高质量掩护和内线对抗", boost: { strength: 10, physique: 7, shotInt: 6 }, nerf: { shotExt: -12, stl: -4 } },
    { id: "c_two_way_star", n: "双向中锋", z: "Two-Way Center", d: "攻防两端稳定高效", boost: { shotInt: 8, reb: 8, blk: 8 }, nerf: { shotExt: -6 } }
  ]
};
const ALL_TEMPLATES = Object.values(TEMPLATES_BY_POS).flat();

// ============ X-FACTOR 天赋系统 ============
// 分为5类：进攻型(7)、防守型(5)、身体型(5)、精神型(5)、成长型(3)
const XFACTORS = [
  // ========== 进攻型天赋 ==========
  { id: "sniper", n: "神射手", d: "三分命中率+8%，罚球命中率+6%", icon: "🎯", effect: { tpPctBonus: 0.08, ftPctBonus: 0.06 } },
  { id: "finisher", n: "终结者", d: "内线得分+3，命中率+3%", icon: "💪", effect: { attrBoost: { shotInt: 6 }, fgPctBonus: 0.03 } },
  { id: "microwave", n: "微波炉", d: "上场即爆发，得分+12%，命中率+3%", icon: "🌶️", effect: { usageBoost: 0.12, fgPctBonus: 0.03 } },
  { id: "clutch", n: "关键先生", d: "关键时刻属性+18%，命中率+4%", icon: "🔥", effect: { clutchBoost: 0.18, fgPctBonus: 0.04 } },
  { id: "floor_general", n: "持球核心", d: "助攻+2，失误-20%", icon: "🧠", effect: { astFlat: 2, tovMult: -0.20 } },
  { id: "showtime", n: "花式大师", d: "高光表现几率+15%，士气+3", icon: "✨", effect: { highlightBoost: 0.15, teamBoost: 3 } },
  { id: "deep_range", n: "空间炸弹", d: "三分命中率+5%，三分能力+5", icon: "💣", effect: { tpPctBonus: 0.05, attrBoost: { shotExt: 5 } } },

  // ========== 防守型天赋 ==========
  { id: "rim_wall", n: "禁飞区", d: "盖帽+2，伤病率-15%", icon: "🚧", effect: { blkFlat: 2, injuryMult: 0.85 } },
  { id: "board_king", n: "篮板之王", d: "篮板+3，力量+6", icon: "🧲", effect: { rebFlat: 3, attrBoost: { strength: 6 } } },
  { id: "pickpocket", n: "抢断专家", d: "抢断+1.5，失误-10%", icon: "🕵️", effect: { stlFlat: 1.5, tovMult: -0.10 } },
  { id: "two_way_force", n: "双向统治", d: "全属性+6%，抢断+1，盖帽+1", icon: "🌓", effect: { attrPct: 0.06, stlFlat: 1, blkFlat: 1 } },
  { id: "clamps", n: "钳子防守", d: "防守属性+8，抢断+1", icon: "🔒", effect: { attrBoost: { stl: 8, blk: 4 }, stlFlat: 1 } },

  // ========== 身体型天赋 ==========
  { id: "iron", n: "铁人", d: "伤病率-80%，体力消耗-30%，恢复+12", icon: "🛡️", effect: { injuryMult: 0.20, staminaCostMult: 0.70, staminaRegen: 12 } },
  { id: "glass_man", n: "玻璃人", d: "全属性+10，但伤病率+150%", icon: "🩹", effect: { attrBonus: 10, injuryMult: 2.50 } },
  { id: "speedster", n: "风驰电掣", d: "速度+10，但体力消耗+10%", icon: "⚡", effect: { attrBoost: { speed: 10 }, staminaCostMult: 1.10 } },
  { id: "bruiser", n: "重型坦克", d: "力量+10，体能+8，伤病率-15%", icon: "🦬", effect: { attrBoost: { strength: 10, physique: 8 }, injuryMult: 0.85 } },
  { id: "workhorse", n: "高负荷引擎", d: "体力消耗-25%，恢复+10", icon: "🐎", effect: { staminaCostMult: 0.75, staminaRegen: 10 } },

  // ========== 精神型天赋 ==========
  { id: "mentor", n: "领袖", d: "团队胜率+6%，经验获取+15%", icon: "👑", effect: { teamBoost: 6, xpMult: 1.15 } },
  { id: "streaky", n: "情绪化", d: "表现波动极大(±12分)", icon: "🎭", effect: { varianceRange: 12 } },
  { id: "underdog", n: "逆境之王", d: "落后时属性+18%", icon: "💥", effect: { underdogBoost: 0.18 } },
  { id: "calm_mind", n: "冷静心态", d: "波动减半，罚球+6%，失误-12%", icon: "🧘", effect: { varianceRange: 2, ftPctBonus: 0.06, tovMult: -0.12 } },
  { id: "toxic", n: "更衣室毒瘤", d: "个人得分+10%，但团队胜率降低", icon: "☠️", effect: { toxicAura: true, usageBoost: 0.10 } },

  // ========== 成长型天赋 ==========
  { id: "quick_learner", n: "快速学习", d: "经验获取+25%，年度成长+40%", icon: "📚", effect: { xpMult: 1.25, growthBoost: 0.40 } },
  { id: "late_bloomer", n: "大器晚成", d: "成长曲线+30%，抗衰退+60%", icon: "🌱", effect: { growthBoost: 0.30, declineResist: 0.60 } },
  { id: "prodigy", n: "天才新秀", d: "新秀赛季+15%，经验获取+15%", icon: "🌟", effect: { rookieBoost: 0.15, xpMult: 1.15 } }
];

const APK_BADGE_IMG_BASE = 'assets/images/badges';


// ============ RANDOM EVENTS DATA ============
// 随机事件已移除

const EVENTS_LEAGUE = [
  { id: "rule_change", n: "规则变动", d: "联盟修改了比赛规则", effects: ["三分线外移，外线投篮难度+5%", "增加挑战次数，比赛节奏变慢", "缩短暂停时间，体力消耗增加"] },
  { id: "injury_wave", n: "伤病潮", d: "本赛季伤病频发", effects: ["多名球星受伤，竞争减弱", "你的球队受到影响", "医疗团队升级，恢复加快"] },
  { id: "trade_deadline", n: "交易截止日", d: "联盟交易市场火热", effects: ["你的球队进行了补强", "竞争对手变得更强", "有球队对你感兴趣"] }
];

const KEY_MOMENTS = [
  {
    id: "clutch_shot", n: "关键投篮", d: "比赛最后时刻，你持球面对防守",
    choices: [{ t: "强行出手", attr: "shotExt", diff: 75, reward: { pts: 3, grade: 15 } }, { t: "突破上篮", attr: "shotInt", diff: 70, reward: { pts: 2, grade: 12 } }, { t: "传给空位队友", attr: "pass", diff: 60, reward: { ast: 1, grade: 10 } }]
  },
  {
    id: "fast_break", n: "快攻机会", d: "你带球快攻，身后有追防球员",
    choices: [{ t: "暴扣", attr: "physique", diff: 65, reward: { pts: 2, grade: 12 } }, { t: "拉杆上篮", attr: "shotInt", diff: 70, reward: { pts: 2, grade: 15 } }, { t: "传球助攻", attr: "pass", diff: 55, reward: { ast: 1, grade: 8 } }]
  },
  {
    id: "post_up", n: "低位单打", d: "你在低位要到位置，背身面对防守",
    choices: [{ t: "转身跳投", attr: "shotInt", diff: 68, reward: { pts: 2, grade: 10 } }, { t: "强打篮下", attr: "strength", diff: 72, reward: { pts: 2, grade: 12 } }, { t: "分球外线", attr: "pass", diff: 50, reward: { ast: 1, grade: 6 } }]
  },
  {
    id: "defense_stop", n: "防守关键", d: "对手持球进攻，你需要做出防守选择",
    choices: [{ t: "贴身防守", attr: "stl", diff: 70, reward: { stl: 1, grade: 12 } }, { t: "协防盖帽", attr: "blk", diff: 75, reward: { blk: 1, grade: 15 } }, { t: "保守站位", attr: "speed", diff: 55, reward: { grade: 6 } }]
  },
  {
    id: "screen_play", n: "挡拆配合", d: "队友为你做了一个掩护",
    choices: [{ t: "中距离急停", attr: "shotExt", diff: 62, reward: { pts: 2, grade: 10 } }, { t: "顺下突破", attr: "speed", diff: 65, reward: { pts: 2, grade: 12 } }, { t: "回传挡拆", attr: "pass", diff: 55, reward: { ast: 1, grade: 8 } }]
  },
  {
    id: "rebound_battle", n: "篮板争夺", d: "球弹出篮筐，你和对手同时起跳",
    choices: [{ t: "卡位抢板", attr: "reb", diff: 60, reward: { reb: 1, grade: 10 } }, { t: "点拨给队友", attr: "reb", diff: 50, reward: { grade: 6 } }, { t: "直接补篮", attr: "shotInt", diff: 75, reward: { pts: 2, grade: 15 } }]
  }
];

// ============ GAME STATE ============
let G = {
  phase: "create",
  player: {
    name: "", pos: 0, template: "", xfactor: "", age: 19, height: 0, weight: 0, wingspan: 0,
    attrs: {}, tendencies: { in: 55, mid: 55, ex: 55 }, potential: 0, badges: {}, xp: 0, stamina: 100, maxStamina: 100,
    fame: 10, trust: 50, tradeValue: 50, salary: 0, contractYears: 0, cash: 0,
    teamsPlayed: [], injury: { active: false, games: 0, type: "" },
    rivalId: 0, mood: 50
  },
  team: null, teamId: 0,
  season: 1, year: 2025, startYear: 2025, gameNum: 0, totalGames: 82,
  dayNum: 0, seasonDays: 180, gameDays: [], // 天数模拟系统
  trades: [], pendingTrade: null, pendingUserTrade: null, // 交易系统
  tradeDeadline: 120, renewalDeadline: 160, // 截止日
  schedule: [], results: [],
  seasonStats: { pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, tov: 0, mins: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, gp: 0, wins: 0, losses: 0 },
  careerStats: [],
  standings: { East: [], West: [] },
  playoffs: { active: false, round: 0, series: [] },
  awards: [], allAwards: [],
  leagueAwards: [],
  hallOfFame: [],
  hallOfFameThreshold: 120,
  news: [], phone: [], events: [],
  draftPick: 0, draftBoard: null,
  leagueSeason: { round: 0, teamRecords: {}, playerStats: {}, roundSchedule: [], teamGameLogs: {}, gameDetails: [] },
  social: {
    posts: [],
    nextPostId: 1,
    lastGeneratedDay: -1,
    generatedDayCounts: {},
    pendingRequiredDay: -1,
    playerRepliedPostIds: {},
    playerPostsByDay: {},
    llm: { enabled: false, baseUrl: 'https://api.openai.com/v1', model: 'gpt-4.1-mini', apiKey: '' }
  },
  economy: { staminaCoachLevel: 0, trainingCoachLevel: 0, ownedItems: [], logs: [], salaryPaidSeason: 0 },
  offseasonStage: 0,
  offseasonSummary: [],
  _pendingRegularSeasonAwardsModal: false,
  settings: { simSpeed: 1 },
  nomadCount: 0
};

const LEAGUE = {
  loaded: false,
  teams: {},
  coaches: [],
  rookieCatalog: [],
  rootHandle: null,
  loadError: null,
  rookiesBySeason: {},
  namesPool: [],
  availableScriptYears: [],
  years: { roster: 25, coach: 1, rosterCode: 1 }
};

const APK_NBA_START_YEARS = [
  2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017,
  2015, 2011, 2008, 2005, 2004, 1995, 1983, 1971, 1946
];
const APK_ROSTER_INDEX_TO_START_YEAR = {
  1: 2025, 2: 2024, 3: 2023, 4: 2022, 5: 2021, 6: 2020, 7: 2019, 8: 2018, 9: 2017,
  10: 2015, 11: 2011, 12: 2008, 13: 2005, 14: 2004, 15: 1995, 16: 1983, 17: 1971,
  18: 1946, 19: 1946, 20: 2025, 21: 1946
};
const APK_START_YEAR_TO_ROSTER_INDEXES = {
  2025: [1, 20],
  2024: [2],
  2023: [3],
  2022: [4],
  2021: [5],
  2020: [6],
  2019: [7],
  2018: [8],
  2017: [9],
  2015: [10],
  2011: [11],
  2008: [12],
  2005: [13],
  2004: [14],
  2003: [14],
  1995: [15],
  1983: [16],
  1971: [17],
  1946: [18, 19, 21]
};
const APK_RAW_BASE_PATH = 'APK/resources/res/raw';

// ============ UTILITY FUNCTIONS ============
const $ = id => document.getElementById(id);
const rng = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const pick = arr => arr[rng(0, arr.length - 1)];
const pct = v => (v * 100).toFixed(1) + "%";
const ovr = attrs => { const vals = Object.values(attrs); return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) };

function barClass(v) { return v >= 75 ? 'hi' : v >= 55 ? 'md' : 'lo' }
function gradeClass(g) { return g >= 90 ? 'grade-a' : g >= 75 ? 'grade-b' : g >= 55 ? 'grade-c' : g >= 35 ? 'grade-d' : 'grade-f' }
function gradeLetter(g) { return g >= 95 ? 'A+' : g >= 90 ? 'A' : g >= 85 ? 'A-' : g >= 80 ? 'B+' : g >= 75 ? 'B' : g >= 70 ? 'B-' : g >= 65 ? 'C+' : g >= 55 ? 'C' : g >= 45 ? 'D+' : g >= 35 ? 'D' : 'F' }

function pad2(v) { return String(v).padStart(2, '0') }
function pad4(v) { return String(v).padStart(4, '0') }
function parseNum(v, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}
function normalizeSalaryMillion(v) {
  const n = parseNum(v, 0);
  if (n <= 0) return 0;
  return n > 500000 ? +(n / 1000000).toFixed(2) : +n.toFixed(2);
}
function formatSalaryMillion(v, digits = 2) {
  return normalizeSalaryMillion(v).toFixed(digits);
}
function normalizeLeagueSalaryUnits({ includeUser = true } = {}) {
  if (includeUser && G?.player) {
    G.player.salary = normalizeSalaryMillion(G.player.salary);
  }
  if (!LEAGUE?.loaded || !LEAGUE?.teams) return;
  Object.values(LEAGUE.teams).forEach(t => {
    (t.players || []).forEach(p => {
      p.salary = normalizeSalaryMillion(p.salary);
    });
  });
}
function parseCSV(text) {
  const rows = (text || '').replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
  if (rows.length < 2) return [];
  const headers = rows[0].split(';').map(h => h.trim());
  return rows.slice(1).map(line => {
    const cols = line.split(';');
    const o = {};
    headers.forEach((h, i) => o[h] = cols[i] !== undefined ? cols[i].trim() : '');
    return o;
  });
}
function normalizeTeamToken(v) {
  return String(v || '').toLowerCase().trim()
    .replace(/[·\.\-_']/g, '')
    .replace(/\s+/g, '')
    .replace(/队$/, '');
}
const TEAM_NAME_ID_MAP = (() => {
  const m = new Map();
  TEAMS.forEach(t => {
    [t.z, t.n, t.a].forEach(v => {
      const key = normalizeTeamToken(v);
      if (key) m.set(key, t.id);
    });
  });
  m.set('76人', 4);
  m.set('trailblazers', 19);
  m.set('blazers', 19);
  m.set('okcthunder', 18);
  m.set('lalakers', 23);
  m.set('laclippers', 22);
  m.set('gswarriors', 21);
  m.set('nyknicks', 3);
  m.set('phxsuns', 24);
  return m;
})();
const RAW_TEAM_ID_REMAP = {
  16: 26, 17: 27, 18: 28, 19: 29, 20: 30,
  21: 16, 22: 17, 23: 19, 24: 18, 25: 20,
  26: 21, 27: 22, 28: 23, 29: 24, 30: 25
};
function resolveTeamId(rawTeamId, rawTeamName = '') {
  const token = normalizeTeamToken(rawTeamName);
  const byName = TEAM_NAME_ID_MAP.get(token);
  if (byName && byName >= 1 && byName <= 30) return byName;
  const byId = parseNum(rawTeamId, 0);
  if (byId >= 1 && byId <= 30) {
    const byIdTeam = TEAMS.find(t => t.id === byId);
    if (byIdTeam) {
      const matchById = [byIdTeam.z, byIdTeam.n, byIdTeam.a].some(v => normalizeTeamToken(v) === token);
      if (matchById) return byId;
    }
  }
  if ((rawTeamName || '').trim() && RAW_TEAM_ID_REMAP[byId]) return RAW_TEAM_ID_REMAP[byId];
  if (byId >= 1 && byId <= 30) return byId;
  return 0;
}
function teamNameFallback(id) {
  const t = TEAMS.find(x => x.id === id);
  return t ? t.z : `Team ${id}`;
}
function getTeamAltLogoPath(id) {
  return `assets/images/Team/cbaTeam${pad2(id)}.png`;
}
function getTeamLogoPath(id, abbr = '') {
  // Use current year to determine era, default to 2023 if undefined
  const currentYear = (typeof G !== 'undefined' && G.year) ? G.year : 2023;

  // Available logo sets: 1984, 1996, 2003, 2008, 2018, 2023
  let yearPrefix = 2023;
  if (currentYear < 1996) yearPrefix = 1984;
  else if (currentYear < 2003) yearPrefix = 1996;
  else if (currentYear < 2008) yearPrefix = 2003;
  else if (currentYear < 2018) yearPrefix = 2008;
  else if (currentYear < 2023) yearPrefix = 2018;

  return `assets/images/Team/team${yearPrefix}${pad2(id)}.png`;
}
function getPlayerPhotoPath(imageId) {
  const id = clamp(parseNum(imageId, 0), 0, 9999);
  return `assets/images/Player/IMG${pad4(id)}.png`;
}
function stripUndefinedTokens(text) {
  return String(text == null ? '' : text).replace(/\b(?:undefined|underfined)\b/gi, '').trim();
}
function getPlayerPhotoSrc(player) {
  // Support uploaded avatar/photo (data URL / remote URL / local blob URL)
  const avatar = stripUndefinedTokens(player && typeof player.avatar === 'string' ? player.avatar : '');
  const photoRaw = stripUndefinedTokens(player && typeof player.photo === 'string' ? player.photo : '');
  if (avatar && avatar !== 'null') return avatar;
  if (photoRaw && (photoRaw.startsWith('data:image/') || photoRaw.startsWith('blob:') || /^https?:\/\//i.test(photoRaw))) return photoRaw;
  const imageId = clamp(parseNum(player?.image, 0), 0, 9999);
  return photoRaw || getPlayerPhotoPath(imageId);
}
function resolveDisplayName(name, nameBirth, fallback = '') {
  const n = (name || '').trim();
  const b = (nameBirth || '').trim();
  if (!n && !b) return fallback;
  if (!n) return b || fallback;
  if (/[�]/.test(n) && b) return b;
  return n;
}
function toTeamMeta(id, teamName = '') {
  const base = TEAMS.find(t => t.id === id);
  return {
    id,
    n: base ? base.n : teamNameFallback(id),
    z: teamName || (base ? base.z : '') || teamNameFallback(id),
    a: base ? base.a : `T${pad2(id)}`,
    c: base ? base.c : (id <= 15 ? 'East' : 'West'),
    cl: base ? base.cl : '#2d5ab8',
    r: base ? base.r : 75,
    logo: getTeamLogoPath(id, base?.a || ''),
    logoFallback: getTeamAltLogoPath(id)
  };
}
function calcPlayerRating(row) {
  const att = parseNum(row.ATT, -1);
  const def = parseNum(row.DEF, -1);
  if (att >= 0 && def >= 0) return Math.round((att + def) / 2);
  const vals = [
    parseNum(row.skillPass, 55), parseNum(row.skillShotInterior, 55), parseNum(row.skillShotExterior, 55),
    parseNum(row.skillShotFree, 55), parseNum(row.skillPhysique, 55), parseNum(row.skillBlock, 55),
    parseNum(row.skillRebound, 55), parseNum(row.skillSteal, 55)
  ];
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}
function parsePlayerAttrs(row) {
  return {
    pass: parseNum(row.skillPass, 55),
    shotInt: parseNum(row.skillShotInterior, 55),
    shotExt: parseNum(row.skillShotExterior, 55),
    shotFree: parseNum(row.skillShotFree, 55),
    physique: parseNum(row.skillPhysique, 55),
    blk: parseNum(row.skillBlock, 55),
    reb: parseNum(row.skillRebound, 55),
    stl: parseNum(row.skillSteal, 55),
    speed: parseNum(row.skillPhysique, 55),
    strength: parseNum(row.skillPhysique, 55)
  };
}
function normalizePotentialValue(v, rating = 70) {
  const n = parseNum(v, 0);
  if (n <= 0) return clamp(rating + rng(5, 14), 58, 95);
  if (n <= 20) return clamp(55 + n * 2 + rng(-3, 3), 55, 95);
  if (n <= 120) return clamp(Math.round(n), 55, 99);
  return clamp(rating + rng(4, 12), 58, 95);
}
function rowToPlayer(row, fallbackId, extra = {}) {
  const yearsLeague = parseNum(row.yearsLeague, 0);
  const rating = calcPlayerRating(row);
  const potential = normalizePotentialValue(row.potential, rating);
  const nameCn = cleanText(row.name);
  const nameEn = cleanText(row.nameBirth);
  const ovrValue = rating; // Assuming ovrValue is rating
  const potValue = potential; // Assuming potValue is potential
  const attrs = parsePlayerAttrs(row); // Assuming attrs is parsed from row
  const imgId = parseNum(row.image, 0); // Assuming imgId is parsed from row.image

  const player = {
    id: parseNum(row.id, fallbackId),
    uid: row.uid ? String(row.uid) : `p_${parseNum(row.id, fallbackId)}`,
    name: cleanText(row.name),
    altName: cleanText(row.nameBirth || row.altName), // use nameBirth as english
    nameCn: cleanText(row.name),
    nameEn: cleanText(row.nameBirth || row.altName),
    teamId: extra.teamId || 0,
    pos: clamp(parseNum(row.positionFirst, 3), 1, 5),
    pos2: clamp(parseNum(row.positionSecond, 0), 0, 5),
    rating: ovrValue,
    potential: potValue,
    att: ovrValue, // simplified
    def: ovrValue, // simplified
    age: clamp(parseNum(row.age, 24), 18, 45),
    yearsLeague: parseNum(row.yearsLeague, 0),
    draft: parseNum(row.draftYear, 0) * 100 + parseNum(row.draftRound, 0), // rough draft info
    contract: { amount: parseNum(row.contractAmount, 50), years: parseNum(row.contractExpDifference, 1) },
    photo: getPlayerPhotoPath(imgId),
    image: imgId,
    info: row.info || '',
    attrs,
    tendencies: {
      in: parseNum(row.tendencyIn, 55),
      mid: parseNum(row.tendencyEx, 55),
      ex: parseNum(row.tendencyFr, 55)
    },
    ...extra
  };

  // Assign initial badges
  player.badges = assignInitialBadges({ ...player, attrs });

  return player;
}
function toRotation(players) {
  const ranked = (players || [])
    .map(p => ({ ...p, isSelf: false, roleScore: roleScoreForPlayer(p) }))
    .sort((a, b) => b.roleScore - a.roleScore);
  const ordered = buildOrderedRotationCandidates(ranked, 10);
  const template = [35, 34, 33, 32, 31, 24, 19, 17, 15, 10];
  const rotation = ordered.map((p, i) => ({
    id: p.id,
    name: p.name,
    pos: parseNum(p.pos, 3),
    pos2: parseNum(p.pos2, 0),
    slotPos: parseNum(p.slotPos, 0),
    rotationRole: p.rotationRole || (i < 5 ? 'starter' : (i === 5 ? 'sixth' : 'role')),
    minutes: clamp(template[i] || 10, 6, 40),
    rating: parseNum(p.rating, 65),
    roleScore: parseNum(p.roleScore, 0),
    photo: p.photo,
    avatar: p.avatar || '',
    image: p.image
  }));
  // 分配7层角色并用角色目标分钟覆盖模板
  const byRat2 = [...rotation].sort((a, b) => b.rating - a.rating);
  const topIds2 = ['alpha', 'second', 'third'];
  const done2 = new Set();
  byRat2.slice(0, 3).forEach((p, i) => { p.teamTier = topIds2[i]; done2.add(p.id); });
  rotation.forEach((p, idx) => {
    if (done2.has(p.id)) return;
    const role = p.rotationRole || (idx < 5 ? 'starter' : (idx === 5 ? 'sixth' : 'role'));
    if (role === 'starter' || idx < 5) p.teamTier = 'rolestarter';
    else if (role === 'sixth' || idx === 5) p.teamTier = 'sixthman';
    else if (idx <= 8) p.teamTier = 'bench';
    else p.teamTier = 'end';
  });
  rotation.forEach(p => {
    const td = typeof getTierDef === 'function' ? getTierDef(p.teamTier) : null;
    if (td) p.minutes = clamp(td.minTarget, Math.max(td.minRange[0], 0), td.minRange[1]);
  });
  normalizeRotationMinutes(rotation, 240);
  return rotation;
}
function rotationIdKey(player) {
  return String(player?.id ?? '');
}
function positionFitBonus(player, targetPos) {
  const pos = parseNum(player?.pos, 0);
  const pos2 = parseNum(player?.pos2, 0);
  if (pos === targetPos) return 28;
  if (pos2 === targetPos && pos2 > 0) return 21;
  if (targetPos === 1 && pos === 2) return 15;
  if (targetPos === 2 && pos === 1) return 15;
  if (targetPos === 2 && pos === 3) return 10;
  if (targetPos === 3 && pos === 2) return 10;
  if (targetPos === 3 && pos === 4) return 10;
  if (targetPos === 4 && pos === 3) return 10;
  if (targetPos === 4 && pos === 5) return 13;
  if (targetPos === 5 && pos === 4) return 14;
  return 0;
}
function pickStarterForSlot(candidates, used, targetPos) {
  let best = null;
  let bestScore = -1e9;
  candidates.forEach(p => {
    const key = rotationIdKey(p);
    if (used.has(key)) return;
    const fit = positionFitBonus(p, targetPos);
    if (fit <= 0) return;
    const score = parseNum(p.roleScore, 0) + fit + parseNum(p.rating, 65) * 0.06;
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  });
  if (best) return best;
  return candidates.find(p => !used.has(rotationIdKey(p))) || null;
}
function buildOrderedRotationCandidates(candidates, maxPlayers = 10) {
  const used = new Set();
  const ordered = [];
  const starterSlots = [1, 2, 3, 4, 5];
  starterSlots.forEach(slotPos => {
    if (ordered.length >= maxPlayers) return;
    const picked = pickStarterForSlot(candidates, used, slotPos);
    if (!picked) return;
    const key = rotationIdKey(picked);
    if (used.has(key)) return;
    used.add(key);
    ordered.push({ ...picked, slotPos, rotationRole: 'starter' });
  });
  while (ordered.length < Math.min(5, maxPlayers)) {
    const fallback = candidates.find(p => !used.has(rotationIdKey(p)));
    if (!fallback) break;
    const key = rotationIdKey(fallback);
    used.add(key);
    ordered.push({ ...fallback, slotPos: starterSlots[ordered.length] || 0, rotationRole: 'starter' });
  }
  const bench = candidates.filter(p => !used.has(rotationIdKey(p)));
  if (bench.length && ordered.length < maxPlayers) {
    const sixth = bench.shift();
    used.add(rotationIdKey(sixth));
    ordered.push({ ...sixth, slotPos: 0, rotationRole: 'sixth' });
  }
  bench.forEach(p => {
    if (ordered.length >= maxPlayers) return;
    const key = rotationIdKey(p);
    if (used.has(key)) return;
    used.add(key);
    ordered.push({ ...p, slotPos: 0, rotationRole: 'role' });
  });
  return ordered;
}
function getRotationRoleLabel(role, player) {
  // 优先使用7层角色名
  if (player?.teamTier && typeof getTierDef === 'function') {
    const td = getTierDef(player.teamTier);
    if (td) return td.name;
  }
  if (role === 'starter') return '首发';
  if (role === 'sixth') return '第六人';
  return '角色球员';
}
function getRotationPositionDisplay(player, index = 0) {
  const tier = player?.teamTier;
  const posStr = posLabel(parseNum(player?.pos, 3));
  if (tier && typeof getTierDef === 'function') {
    const td = getTierDef(tier);
    if (td) return `${td.name} (${posStr})`;
  }
  const role = player?.rotationRole || (index < 5 ? 'starter' : (index === 5 ? 'sixth' : 'role'));
  const slotPos = parseNum(player?.slotPos, 0);
  if (role === 'starter') {
    return slotPos > 0 ? posLabel(slotPos) : posStr;
  }
  return `角色 (${posStr})`;
}
function parseDraftPickValue(v) {
  const n = parseNum(v, 0);
  if (n <= 0) return 0;
  if (n <= 60) return n;
  if (n >= 1000) return n % 100;
  return 0;
}
function isFirstRoundRookiePlayer(player) {
  if (player?.isSelf) {
    return G.season === 1 && G.draftPick > 0 && G.draftPick <= 30;
  }
  const years = parseNum(player?.yearsLeague, 0);
  const pick = parseNum(player?.draftPick, 0) || parseDraftPickValue(player?.draft);
  return years <= 1 && pick > 0 && pick <= 30;
}
function getPlayerBadgePower(player) {
  if (!player || !player.badges) return 0;
  if (Array.isArray(player.badges)) {
    return player.badges.filter(id => BADGES.some(b => b.id === id)).length;
  }
  if (typeof player.badges === 'object') {
    return Object.entries(player.badges).reduce((sum, [id, lv]) => {
      if (!BADGES.some(b => b.id === id)) return sum;
      return sum + clamp(parseNum(lv, 0), 0, 4);
    }, 0);
  }
  return 0;
}
function roleScoreForPlayer(player) {
  const rating = parseNum(player?.rating, ovr(player?.attrs || {}));
  const att = parseNum(player?.att, rating);
  const def = parseNum(player?.def, rating);
  const potential = parseNum(player?.potential, rating);
  const age = parseNum(player?.age, 24);
  let score = rating * 0.82 + att * 0.1 + def * 0.08 + (potential - rating) * 0.15;
  if (age <= 24) score += 1.1;
  if (age >= 33) score -= 1.1;
  if (player?.isSelf) {
    const trust = clamp(parseNum(G.player?.trust, 50), 0, 100);
    const mood = clamp(parseNum(G.player?.mood, 50), 0, 100);
    score += 0.6 + (trust - 50) * 0.12 + (mood - 50) * 0.05;
  }
  score += Math.min(3.5, getPlayerBadgePower(player) * 0.18);
  return score + rng(-2, 2);
}
function adjustUserMinutesByTrust(rotation) {
  const self = rotation.find(r => r.isSelf || String(r.id) === 'USER_SELF');
  if (!self) return;
  const trust = clamp(parseNum(G.player?.trust, 50), 0, 100);
  const mood = clamp(parseNum(G.player?.mood, 50), 0, 100);
  const rating = parseNum(self.rating, ovr(G.player?.attrs || {}));
  const sortedRatings = (rotation || []).map(r => parseNum(r?.rating, 65)).sort((a, b) => b - a);
  const second = parseNum(sortedRatings[1], rating);

  // 用7层角色的分钟范围
  const tier = self.teamTier || 'bench';
  const td = typeof getTierDef === 'function' ? getTierDef(tier) : null;
  let min = td ? td.minRange[0] : 10, max = td ? td.minRange[1] : 22;
  if (rating >= 84) { min = Math.max(min, 33); max = Math.max(max, 40); }

  const current = clamp(Math.round(parseNum(self.minutes, 22)), 6, 40);
  const trustAdj = Math.round((trust - 50) / 16);
  const moodAdj = Math.round((mood - 50) / 35);
  const ratingAdj = Math.round((rating - Math.max(70, second)) / 5);
  const target = current + trustAdj + moodAdj + ratingAdj;
  self.minutes = clamp(Math.max(target, min), min, max);
}
function normalizeRotationMinutes(rotation, target = 240) {
  rotation.forEach(r => r.minutes = clamp(Math.round(parseNum(r.minutes, 0)), 0, 40));
  let total = rotation.reduce((s, r) => s + r.minutes, 0);
  // 角色优先级: end=0, bench=1, sixthman=2, rolestarter=3, third=4, second=5, alpha=6
  const tierPri = { end: 0, bench: 1, sixthman: 2, rolestarter: 3, third: 4, second: 5, alpha: 6 };
  const cutOrder = () => {
    const arr = [];
    for (let i = 0; i < rotation.length; i++) {
      const pri = tierPri[rotation[i].teamTier] ?? 1;
      arr.push({ i, pri });
    }
    arr.sort((a, b) =>
      a.pri - b.pri ||
      rotation[b.i].minutes - rotation[a.i].minutes ||
      parseNum(rotation[a.i].roleScore, 0) - parseNum(rotation[b.i].roleScore, 0)
    );
    return arr.map(x => x.i);
  };
  const addOrder = () => {
    const arr = [];
    for (let i = 0; i < rotation.length; i++) {
      const pri = tierPri[rotation[i].teamTier] ?? 1;
      arr.push({ i, pri });
    }
    arr.sort((a, b) =>
      b.pri - a.pri ||
      parseNum(rotation[b.i].roleScore, 0) - parseNum(rotation[a.i].roleScore, 0) ||
      rotation[a.i].minutes - rotation[b.i].minutes
    );
    return arr.map(x => x.i);
  };
  let guard = 0;
  while (total > target && guard < 700) {
    const idx = cutOrder().find(i => rotation[i].minutes > 0);
    if (idx == null) break;
    rotation[idx].minutes--;
    total--;
    guard++;
  }
  guard = 0;
  while (total < target && guard < 700) {
    const idx = addOrder().find(i => rotation[i].minutes < 40);
    if (idx == null) break;
    rotation[idx].minutes++;
    total++;
    guard++;
  }
}
function buildDynamicTeamRotation(teamId, { includeUser = false } = {}) {
  const pool = (getTeamPlayers(teamId) || []).map(p => ({ ...p, isSelf: false }));
  if (includeUser) {
    const self = createUserRosterSnapshot();
    self.isSelf = true;
    self.id = 'USER_SELF';
    pool.push(self);
  }
  if (!pool.length) return [];
  const ranked = pool.map(p => ({ ...p, roleScore: roleScoreForPlayer(p) })).sort((a, b) => b.roleScore - a.roleScore);
  const template = [35, 34, 33, 32, 31, 24, 19, 17, 15, 10];
  const ordered = buildOrderedRotationCandidates(ranked, 10);
  let rotation = ordered.map((p, i) => ({
    id: p.id, name: p.name, pos: parseNum(p.pos, 3), pos2: parseNum(p.pos2, 0), slotPos: parseNum(p.slotPos, 0),
    rotationRole: p.rotationRole || (i < 5 ? 'starter' : (i === 5 ? 'sixth' : 'role')),
    rating: parseNum(p.rating, 65), photo: p.photo, avatar: p.avatar || '', image: p.image, isSelf: !!p.isSelf,
    minutes: clamp((template[i] || 10) + rng(-1, 1), 8, 40), roleScore: p.roleScore, rookie: !!p.rookie, draftPick: p.draftPick, draft: p.draft, yearsLeague: p.yearsLeague
  }));

  // 分配7层角色并用角色目标分钟覆盖模板
  const byRat = [...rotation].sort((a, b) => b.rating - a.rating);
  const topTierIds = ['alpha', 'second', 'third'];
  const assignedIds = new Set();
  byRat.slice(0, 3).forEach((p, i) => { p.teamTier = topTierIds[i]; assignedIds.add(p.id); });
  rotation.forEach((p, idx) => {
    if (assignedIds.has(p.id)) return;
    const role = p.rotationRole || (idx < 5 ? 'starter' : (idx === 5 ? 'sixth' : 'role'));
    if (role === 'starter' || idx < 5) p.teamTier = 'rolestarter';
    else if (role === 'sixth' || idx === 5) p.teamTier = 'sixthman';
    else if (idx <= 8) p.teamTier = 'bench';
    else p.teamTier = 'end';
  });
  rotation.forEach(p => {
    const td = typeof getTierDef === 'function' ? getTierDef(p.teamTier) : null;
    if (td) p.minutes = clamp(td.minTarget + rng(-1, 1), Math.max(td.minRange[0], 0), td.minRange[1]);
  });

  const firstRoundRookies = ranked.filter(p => isFirstRoundRookiePlayer(p));
  firstRoundRookies.forEach(rk => {
    let slot = rotation.find(r => String(r.id) === String(rk.id));
    if (!slot) {
      const benchMin = rng(8, 12);
      if (rotation.length < 10) {
        rotation.push({
          id: rk.id, name: rk.name, pos: parseNum(rk.pos, 3), pos2: parseNum(rk.pos2, 0), slotPos: 0, rotationRole: 'role',
          rating: parseNum(rk.rating, 65), photo: rk.photo, avatar: rk.avatar || '', image: rk.image, isSelf: !!rk.isSelf,
          minutes: benchMin, roleScore: rk.roleScore, rookie: !!rk.rookie, draftPick: rk.draftPick, draft: rk.draft, yearsLeague: rk.yearsLeague
        });
        return;
      }
      let replaceIdx = -1;
      for (let i = rotation.length - 1; i >= 0; i--) {
        if (rotation[i].rotationRole === 'role' && !rotation[i].isSelf) { replaceIdx = i; break; }
      }
      if (replaceIdx < 0) {
        for (let i = rotation.length - 1; i >= 0; i--) {
          if (rotation[i].rotationRole !== 'starter' && !rotation[i].isSelf) { replaceIdx = i; break; }
        }
      }
      if (replaceIdx < 0) replaceIdx = rotation.length - 1;
      const old = rotation[replaceIdx];
      rotation[replaceIdx] = {
        id: rk.id, name: rk.name, pos: parseNum(rk.pos, 3), pos2: parseNum(rk.pos2, 0), slotPos: 0, rotationRole: 'role',
        rating: parseNum(rk.rating, 65), photo: rk.photo, avatar: rk.avatar || '', image: rk.image, isSelf: !!rk.isSelf,
        minutes: benchMin, roleScore: rk.roleScore, rookie: !!rk.rookie, draftPick: rk.draftPick, draft: rk.draft, yearsLeague: rk.yearsLeague
      };
      if (old && old.minutes > benchMin) old.minutes = Math.max(6, old.minutes - (benchMin - 6));
    } else if (slot.minutes < 8) {
      slot.minutes = rng(8, 12);
    }
  });
  if (includeUser) {
    adjustUserMinutesByTrust(rotation);
  }
  normalizeRotationMinutes(rotation, 240);
  rotation.forEach(r => {
    if (isFirstRoundRookiePlayer(r) && r.minutes < 8) r.minutes = 8;
  });
  normalizeRotationMinutes(rotation, 240);
  return rotation;
}
function ensureGameRotation(force = false) {
  if (!force && Array.isArray(G._currentRotation) && G._rotationGame === G.gameNum && G._rotationTeam === G.teamId) {
    return G._currentRotation;
  }
  const rot = buildDynamicTeamRotation(G.teamId, { includeUser: true });
  G._currentRotation = rot;
  G._rotationGame = G.gameNum;
  G._rotationTeam = G.teamId;
  const teamObj = LEAGUE.teams?.[G.teamId];
  if (teamObj) {
    const aiRot = buildDynamicTeamRotation(G.teamId, { includeUser: false });
    teamObj.rotation = aiRot.map(r => ({
      id: r.id, name: r.name, pos: r.pos, pos2: r.pos2, slotPos: r.slotPos, rotationRole: r.rotationRole,
      minutes: r.minutes, rating: r.rating, photo: r.photo, avatar: r.avatar || ''
    }));
    teamObj.strength = calcTeamStrength(teamObj);
  }
  return rot;
}
function calcTeamStrength(teamObj) {
  const core = (teamObj.rotation || []).slice(0, 8);
  if (!core.length) return teamObj.meta.r || 75;
  const weight = [1, 1, 1, 1, 1, 0.7, 0.6, 0.5];
  let wSum = 0, val = 0;
  const coachFx = getCoachEffectsByCoach(teamObj.coach);
  core.forEach((p, i) => {
    const w = weight[i] || 0.4;
    wSum += w;
    const r = parseNum(p.rating, 70);
    const badgeBonus = Math.min(6, getPlayerBadgePower(p) * 0.22);
    const boosted = (r + badgeBonus) * coachFx.teamRatingMult;
    val += boosted * w;
  });
  return clamp(Math.round(val / Math.max(wSum, 1)), 50, 98);
}
const FILE_ACCESS = {
  dbName: 'nba_career_sim',
  store: 'fs',
  key: 'root'
};
const isFileMode = () => location.protocol === 'file:';
const canUseFS = () => typeof window.showDirectoryPicker === 'function' && typeof indexedDB !== 'undefined';
function normalizePath(path) {
  return String(path || '').replace(/\\/g, '/').replace(/^\.?\//, '');
}
function decodeTextBuffer(buf) {
  const utf8 = new TextDecoder('utf-8').decode(buf);
  if (!/�/.test(utf8)) return utf8;
  try {
    const gbk = new TextDecoder('gbk').decode(buf);
    if (!/�/.test(gbk)) return gbk;
  } catch (e) { }
  return utf8;
}
function openFSDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(FILE_ACCESS.dbName, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(FILE_ACCESS.store)) {
        db.createObjectStore(FILE_ACCESS.store);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('indexedDB open failed'));
  });
}
async function loadSavedRootHandle() {
  if (!canUseFS()) return null;
  try {
    const db = await openFSDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(FILE_ACCESS.store, 'readonly');
      const st = tx.objectStore(FILE_ACCESS.store);
      const req = st.get(FILE_ACCESS.key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error || new Error('indexedDB get failed'));
    });
  } catch (e) {
    return null;
  }
}
async function saveRootHandle(handle) {
  if (!canUseFS() || !handle) return;
  try {
    const db = await openFSDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(FILE_ACCESS.store, 'readwrite');
      const st = tx.objectStore(FILE_ACCESS.store);
      const req = st.put(handle, FILE_ACCESS.key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error || new Error('indexedDB put failed'));
    });
  } catch (e) { }
}
async function clearSavedRootHandle() {
  if (!canUseFS()) return;
  LEAGUE.rootHandle = null;
  try {
    const db = await openFSDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(FILE_ACCESS.store, 'readwrite');
      const st = tx.objectStore(FILE_ACCESS.store);
      const req = st.delete(FILE_ACCESS.key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error || new Error('indexedDB delete failed'));
    });
  } catch (e) { }
}
async function getRootHandle(autoOnly = true, forcePick = false) {
  if (!canUseFS()) return null;
  if (forcePick) {
    const picked = await window.showDirectoryPicker({ mode: 'read' });
    if (!picked) return null;
    const pp = await picked.requestPermission({ mode: 'read' });
    if (pp !== 'granted') return null;
    LEAGUE.rootHandle = picked;
    await saveRootHandle(picked);
    return picked;
  }
  if (LEAGUE.rootHandle) {
    try {
      const p = await LEAGUE.rootHandle.queryPermission({ mode: 'read' });
      if (p === 'granted') return LEAGUE.rootHandle;
      if (!autoOnly) {
        const asked = await LEAGUE.rootHandle.requestPermission({ mode: 'read' });
        if (asked === 'granted') return LEAGUE.rootHandle;
      }
    } catch (e) { }
  }
  const saved = await loadSavedRootHandle();
  if (saved) {
    LEAGUE.rootHandle = saved;
    try {
      const p = await saved.queryPermission({ mode: 'read' });
      if (p === 'granted') return saved;
      if (!autoOnly) {
        const asked = await saved.requestPermission({ mode: 'read' });
        if (asked === 'granted') {
          await saveRootHandle(saved);
          return saved;
        }
      }
    } catch (e) { }
  }
  if (autoOnly) return null;
  const picked = await window.showDirectoryPicker({ mode: 'read' });
  if (!picked) return null;
  const pp = await picked.requestPermission({ mode: 'read' });
  if (pp !== 'granted') return null;
  LEAGUE.rootHandle = picked;
  await saveRootHandle(picked);
  return picked;
}
function localPathVariants(path) {
  const norm = normalizePath(path);
  const set = new Set([norm]);
  // Support simplified asset structure
  if (norm.startsWith('assets/data/')) {
    set.add(norm.replace('assets/data/', ''));
    set.add(norm.replace('assets/data/', 'raw/')); // Legacy fallback just in case
  }
  return [...set].filter(Boolean);
}
async function readFromHandle(handle, path) {
  const segs = normalizePath(path).split('/').filter(Boolean);
  if (!segs.length) throw new Error('invalid path');
  let dir = handle;
  for (let i = 0; i < segs.length - 1; i++) {
    dir = await dir.getDirectoryHandle(segs[i], { create: false });
  }
  const fh = await dir.getFileHandle(segs[segs.length - 1], { create: false });
  const file = await fh.getFile();
  const buf = await file.arrayBuffer();
  return decodeTextBuffer(buf);
}
async function readFromRootHandle(path) {
  const root = await getRootHandle(true);
  if (!root) throw new Error(`LOCAL_FS_PERMISSION_REQUIRED:${path}`);
  const variants = localPathVariants(path);
  for (const p of variants) {
    try {
      return await readFromHandle(root, p);
    } catch (e) {
      if (e?.name !== 'NotFoundError') throw e;
    }
  }
  throw new Error(`LOCAL_FS_PATH_NOT_FOUND:${path}`);
}
async function fetchText(path) {
  const norm = normalizePath(path);
  if (isFileMode()) {
    return readFromRootHandle(norm);
  }
  const tried = [];
  for (const p of localPathVariants(norm)) {
    try {
      const res = await fetch(p);
      tried.push(p);
      if (!res.ok) continue;
      const buf = await res.arrayBuffer();
      return decodeTextBuffer(buf);
    } catch (e) {
      tried.push(`${p} (${e?.name || 'ERR'})`);
    }
  }
  throw new Error(`load failed: ${norm}; tried=${tried.join(', ')}`);
}
function isPermissionErr(e) {
  const m = String(e?.message || '');
  return m.startsWith('LOCAL_FS_PERMISSION_REQUIRED:');
}
function parseYearFromPath(path, prefix) {
  const m = String(path || '').match(new RegExp(`${prefix}(\\d{2})\\.csv$`));
  return m ? parseInt(m[1], 10) : null;
}
function uniquePaths(paths) {
  return [...new Set((paths || []).filter(Boolean))];
}
function resolveRosterIndexesByStartYear(startYear) {
  const y = parseNum(startYear, 0);
  const list = APK_START_YEAR_TO_ROSTER_INDEXES[y];
  if (Array.isArray(list) && list.length) return [...new Set(list.map(v => parseNum(v, 0)).filter(v => v >= 1 && v <= 99))];
  return [];
}
function buildRosterPathCandidatesByIndex(index) {
  const idx = clamp(parseNum(index, 1), 1, 99);
  const p = pad2(idx);
  return uniquePaths([
    `assets/data/rosters${p}.csv`
  ]);
}
function buildCoachPathCandidatesByIndex(index) {
  const idx = clamp(parseNum(index, 1), 1, 99);
  const p = pad2(idx);
  return uniquePaths([
    `assets/data/coaches${p}.csv`,
    `assets/data/coaches01.csv`
  ]);
}
function buildRookiePathCandidates() {
  const paths = [`assets/data/rostersRookiesReal.csv`];
  for (let y = 25; y >= 1; y--) {
    paths.push(`assets/data/rostersRookie${pad2(y)}.csv`);
  }
  return uniquePaths(paths);
}
function buildNamesPathCandidates() {
  return uniquePaths([`assets/data/names.json`]);
}
function buildRosterCandidatesByStartYear(startYear, { strictRoster = false } = {}) {
  const preferred = resolveRosterIndexesByStartYear(startYear);
  const candidates = [];
  preferred.forEach(idx => candidates.push(...buildRosterPathCandidatesByIndex(idx)));
  if (!strictRoster) {
    for (let idx = 1; idx <= 25; idx++) {
      if (preferred.includes(idx)) continue;
      candidates.push(...buildRosterPathCandidatesByIndex(idx));
    }
  }
  return uniquePaths(candidates);
}
async function fetchFirstText(candidates, { required = true, label = '' } = {}) {
  let lastErr = null;
  for (const p of candidates) {
    try {
      const text = await fetchText(p);
      return { path: p, text };
    } catch (e) {
      if (isPermissionErr(e)) throw e;
      lastErr = e;
    }
  }
  if (!required) return { path: '', text: '' };
  throw lastErr || new Error(`DATA_FILE_NOT_FOUND:${label || candidates[0] || 'unknown'}`);
}
function renderLocalFileHint() {
  if (!isFileMode()) return '';
  if (LEAGUE.loaded) {
    return `<div class="ev pos mb-16">✅ 已从本地文件夹自动读取名单数据（球员/教练/新秀）</div>`;
  }
  if (!canUseFS()) {
    return `<div class="ev neg mb-16">⚠️ 当前浏览器不支持文件夹授权读取。请改用本地 HTTP 服务打开页面。</div>`;
  }
  const err = String(LEAGUE.loadError?.message || '');
  const badPath = err.startsWith('LOCAL_FS_PATH_NOT_FOUND:');
  const needPerm = err.startsWith('LOCAL_FS_PERMISSION_REQUIRED:');
  if (badPath) {
    return `<div class="ev neg mb-16">
      ⚠️ 已授权目录中未找到名单文件。请重新选择目录。<br>
      可选目录：项目根目录（推荐，需包含 \`assets/data\` 名单）或 \`assets/data\` 本身。<br>
      <div class="mt-12"><button class="btn btn-cyan" onclick="grantLocalFolderAccess(true)">重新选择数据目录</button></div>
    </div>`;
  }
  if (needPerm) {
    return `<div class="ev neg mb-16">
      ⚠️ 需要本地目录读取权限。<br>
      <div class="mt-12"><button class="btn btn-cyan" onclick="grantLocalFolderAccess(true)">授权本地数据目录</button></div>
    </div>`;
  }
  return `<div class="ev neg mb-16">
    ⚠️ 检测到你用 file:// 打开页面，浏览器默认禁止 fetch 读取本地 CSV（CORS）。<br>
    点击按钮授权数据目录（根目录或 assets/data）后，可自动读取并记住权限。<br>
    <div class="mt-12"><button class="btn btn-cyan" onclick="grantLocalFolderAccess(true)">授权本地数据目录</button></div>
  </div>`;
}
async function grantLocalFolderAccess(forcePick = true) {
  if (!isFileMode() || !canUseFS()) return;
  try {
    const handle = await getRootHandle(false, forcePick);
    if (!handle) {
      alert('未获得目录读取权限');
      return;
    }
    await loadLeagueData({ startYear: G.startYear });
    renderCreate();
    if (LEAGUE.loaded) {
      alert('名单读取成功，后续将自动读取');
    } else {
      alert('已授权目录，但未读取到数据。请确认你选择的是项目根目录（包含 raw）或 raw 目录本身。');
    }
  } catch (e) {
    console.warn('grant local folder failed', e);
    alert('目录授权失败，请重试');
  }
}
function pickRookieTemplateFile(season) {
  const idx = ((season - 1) % 5) + 1;
  return `assets/data/rostersRookie${pad2(idx)}.csv`;
}
function pickRandomName() {
  if (!LEAGUE.namesPool.length) return `Rookie ${rng(1000, 9999)}`;
  const bucket = pick(LEAGUE.namesPool);
  const first = (bucket.male && bucket.male.length) ? pick(bucket.male) : 'Alex';
  const last = (bucket.surnames && bucket.surnames.length) ? pick(bucket.surnames) : 'Stone';
  return `${first} ${last}`;
}
async function loadLeagueData({ startYear = null, strictRoster = false } = {}) {
  try {
    const requestedStartYear = clamp(parseNum(startYear, parseNum(G.startYear, G.year || 2025)), 1946, 2100);
    const rosterCandidates = buildRosterCandidatesByStartYear(requestedStartYear, { strictRoster });
    const rosterPack = await fetchFirstText(rosterCandidates, { required: true, label: `roster@${requestedStartYear}` });
    const detectedRosterYear = parseYearFromPath(rosterPack.path, 'rosters');
    const preferredCoachIndex = detectedRosterYear || resolveRosterIndexesByStartYear(requestedStartYear)[0] || 1;
    const coachCandidates = buildCoachPathCandidatesByIndex(preferredCoachIndex);

    const [coachPack, namesPack, rookiePack] = await Promise.all([
      fetchFirstText(coachCandidates, { required: true, label: 'coach' }),
      fetchFirstText(buildNamesPathCandidates(), { required: false, label: 'names' }),
      fetchFirstText(buildRookiePathCandidates(), { required: false, label: 'rookies' })
    ]);

    const rosterText = rosterPack.text;
    const coachText = coachPack.text;
    const namesText = namesPack.text || '[]';
    const rookieText = rookiePack.text || '';

    const detectedCoachYear = parseYearFromPath(coachPack.path, 'coaches');
    const mappedRosterYear = resolveRosterScriptStartYear(detectedRosterYear);
    if (mappedRosterYear) LEAGUE.years.roster = mappedRosterYear;
    else LEAGUE.years.roster = requestedStartYear;
    LEAGUE.years.rosterCode = detectedRosterYear || preferredCoachIndex;
    if (detectedCoachYear) LEAGUE.years.coach = detectedCoachYear;

    const rosterRows = parseCSV(rosterText);
    const coachRows = parseCSV(coachText);
    const rookieRows = parseCSV(rookieText);
    try {
      LEAGUE.namesPool = JSON.parse(namesText);
    } catch (e) {
      LEAGUE.namesPool = [];
    }
    LEAGUE.teams = {};
    LEAGUE.coaches = [];
    LEAGUE.rookieCatalog = [];
    rosterRows.forEach((r, idx) => {
      const teamId = resolveTeamId(r.teamID, r.team);
      if (teamId <= 0 || teamId > 30) return;
      if (!LEAGUE.teams[teamId]) {
        LEAGUE.teams[teamId] = { meta: toTeamMeta(teamId, r.team), players: [], rotation: [], coach: null, strength: 75 };
      }
      LEAGUE.teams[teamId].players.push(rowToPlayer(r, idx + 1, { teamId }));
    });
    coachRows.forEach((c, idx) => {
      const teamId = resolveTeamId(c.teamID, c.team);
      if (teamId <= 0 || teamId > 30) return;
      if (!LEAGUE.teams[teamId]) {
        LEAGUE.teams[teamId] = { meta: toTeamMeta(teamId, c.team), players: [], rotation: [], coach: null, strength: 75 };
      }
      const coach = {
        id: idx + 1,
        name: c.name || 'Coach',
        teamId,
        techLevel: parseNum(c.techLevel, 2),
        techDev: parseNum(c.techDev, 2),
        baseShotIntPercent: parseNum(c.baseShotIntPercent, 40),
        baseShotTriplePercent: parseNum(c.baseShotTriplePercent, 40),
        baseOffensive: parseNum(c.baseOffensive, 40),
        baseDefense: parseNum(c.baseDefense, 40),
        currentShotIntPercent: parseNum(c.baseShotIntPercent, 40),
        currentShotTriplePercent: parseNum(c.baseShotTriplePercent, 40),
        currentOffensive: parseNum(c.baseOffensive, 40),
        currentDefense: parseNum(c.baseDefense, 40),
        loyalty: parseNum(c.loyalty, 5)
      };
      LEAGUE.teams[teamId].coach = coach;
      LEAGUE.coaches.push({ ...coach, teamMeta: LEAGUE.teams[teamId].meta });
    });
    LEAGUE.rookieCatalog = rookieRows.map((r, idx) => {
      const nameCn = cleanText(r.name);
      const nameEn = cleanText(r.nameBirth);
      const displayName = resolveRookieDisplayName(nameCn, nameEn, `新秀${idx + 1}号`);
      return rowToPlayer(r, 500000 + idx, {
        id: 500000 + idx,
        uid: `rookie_${idx + 1}`,
        name: displayName,
        altName: nameEn,
        nameCn,
        nameEn,
        rookie: true,
        yearsLeague: parseNum(r.yearsLeague, 0)
      });
    }).filter(p => p.name);
    const scriptYears = [...new Set(rookieRows.map(r => parseNum(r.yearsLeague, 0)).filter(y => y >= 1947 && y <= 2100))].sort((a, b) => a - b);
    LEAGUE.availableScriptYears = scriptYears.length ? scriptYears : [clamp(parseNum(G.year, 2025), 1947, 2100)];
    const startYears = getAvailableScriptYears();
    const preferredStart = resolveRosterScriptStartYear(LEAGUE.years.roster) || startYears[0] || parseNum(G.startYear, G.year || 2025);
    if (!startYears.includes(parseNum(G.startYear, 0))) {
      G.startYear = preferredStart;
    }
    if (!Number.isFinite(parseNum(G.year, 0)) || parseNum(G.year, 0) < 1900) {
      G.year = G.startYear;
    }

    // Fix: All existing roster players get +1 year experience initially, EXCEPT current class rookies
    // User request: "Draft 2004 players in 2004 start (0 years) should stay 0. Previous classes get +1."
    const currentSeasonYear = parseNum(G.year, 2025);
    Object.values(LEAGUE.teams).forEach(t => {
      t.players.forEach(p => {
        const draftYear = Math.floor(parseNum(p.draft, 0) / 100);
        if (draftYear === currentSeasonYear) {
          p.yearsLeague = 0;
        } else {
          p.yearsLeague = parseNum(p.yearsLeague, 0) + 1;
          p.age = parseNum(p.age, 20) + 1;
        }
      });
    });

    // Rookie catalog years are already correct in the file (e.g. 2005 class = yearsLeague 2005).
    // Do NOT shift them — the roster file already contains previous draft picks as active players.

    normalizeLeagueSalaryUnits({ includeUser: false });
    Object.values(LEAGUE.teams).forEach(t => {
      t.rotation = toRotation(t.players);
      t.strength = calcTeamStrength(t);
    });
    LEAGUE.loaded = true;
    LEAGUE.loadError = null;
    ensureLeagueBadges();
  } catch (e) {
    LEAGUE.loaded = false;
    LEAGUE.loadError = e;
    console.warn('League data load failed, fallback to static teams.', e);
  }
}
function getTeam(id) {
  if (LEAGUE.loaded && LEAGUE.teams[id]) return LEAGUE.teams[id].meta;
  return TEAMS.find(t => t.id === id);
}
function getTeamStrength(id) {
  if (LEAGUE.loaded && LEAGUE.teams[id]) return LEAGUE.teams[id].strength;
  return getTeam(id)?.r || 75;
}
function getTeamRotation(id) {
  if (LEAGUE.loaded && LEAGUE.teams[id]) return LEAGUE.teams[id].rotation || [];
  return [];
}
function getTeamPlayers(id) {
  if (LEAGUE.loaded && LEAGUE.teams[id]) return LEAGUE.teams[id].players || [];
  return [];
}
function getTeamCoach(id) {
  if (LEAGUE.loaded && LEAGUE.teams[id]) return LEAGUE.teams[id].coach;
  return null;
}
function getLeagueCoaches() {
  return LEAGUE.coaches || [];
}
function getRookieCatalog() {
  return LEAGUE.rookieCatalog || [];
}
function rookieDraftYear(p) {
  const y1 = parseNum(p?.yearsLeague, 0);
  if (y1 >= 1900 && y1 <= 2100) return y1;
  const d = parseNum(p?.draft, 0);
  if (d >= 190000) return Math.floor(d / 100);
  return 0;
}
function resolveRosterScriptStartYear(rosterCode) {
  const code = parseNum(rosterCode, 0);
  if (code >= 1900 && code <= 2100) return code;
  return APK_ROSTER_INDEX_TO_START_YEAR[code] || 0;
}
function hasCjkText(v) {
  return /[\u3400-\u9fff]/.test(String(v || ''));
}
function cleanText(v) {
  return String(v || '').trim();
}
// 英文名音译为中文名的映射表
const EN_TO_CN_SYLLABLE = {
  'le': '勒', 'la': '拉', 'li': '利', 'lo': '洛', 'lu': '卢', 'ly': '利',
  'ba': '巴', 'be': '贝', 'bi': '比', 'bo': '博', 'bu': '布', 'by': '拜',
  'ca': '卡', 'ce': '塞', 'ci': '西', 'co': '科', 'cu': '库', 'cy': '赛',
  'da': '达', 'de': '德', 'di': '迪', 'do': '多', 'du': '杜', 'dy': '戴',
  'fa': '法', 'fe': '费', 'fi': '菲', 'fo': '福', 'fu': '富',
  'ga': '加', 'ge': '格', 'gi': '吉', 'go': '戈', 'gu': '古',
  'ha': '哈', 'he': '赫', 'hi': '希', 'ho': '霍', 'hu': '胡',
  'ja': '贾', 'je': '杰', 'ji': '吉', 'jo': '乔', 'ju': '朱',
  'ka': '卡', 'ke': '克', 'ki': '基', 'ko': '科', 'ku': '库',
  'ma': '马', 'me': '梅', 'mi': '米', 'mo': '莫', 'mu': '穆',
  'na': '纳', 'ne': '内', 'ni': '尼', 'no': '诺', 'nu': '努',
  'pa': '帕', 'pe': '佩', 'pi': '皮', 'po': '波', 'pu': '普',
  'ra': '拉', 're': '雷', 'ri': '里', 'ro': '罗', 'ru': '鲁',
  'sa': '萨', 'se': '塞', 'si': '西', 'so': '索', 'su': '苏',
  'ta': '塔', 'te': '特', 'ti': '蒂', 'to': '托', 'tu': '图',
  'va': '瓦', 've': '维', 'vi': '维', 'vo': '沃', 'vu': '武',
  'wa': '瓦', 'we': '韦', 'wi': '威', 'wo': '沃', 'wu': '伍',
  'xa': '哈', 'xe': '泽', 'xi': '希',
  'ya': '亚', 'ye': '耶', 'yi': '伊', 'yo': '约', 'yu': '尤',
  'za': '扎', 'ze': '泽', 'zi': '齐', 'zo': '佐', 'zu': '祖',
  'cha': '查', 'che': '切', 'chi': '奇', 'cho': '乔', 'chu': '丘',
  'sha': '沙', 'she': '谢', 'shi': '希', 'sho': '肖', 'shu': '舒',
  'tha': '萨', 'the': '瑟', 'thi': '西', 'tho': '索', 'thu': '瑟',
  'wha': '瓦', 'whe': '惠', 'whi': '惠', 'who': '胡',
  'ph': '夫', 'th': '斯', 'sh': '什', 'ch': '奇', 'ck': '克',
  'an': '安', 'en': '恩', 'in': '因', 'on': '翁', 'un': '恩',
  'al': '阿尔', 'el': '埃尔', 'il': '伊尔', 'ol': '奥尔', 'ul': '乌尔',
  'ar': '阿', 'er': '尔', 'ir': '尔', 'or': '奥', 'ur': '尔',
  'ey': '伊', 'ay': '艾', 'oy': '奥伊', 'ow': '奥',
  'ton': '顿', 'son': '森', 'man': '曼', 'ner': '纳', 'ler': '勒',
  'ber': '伯', 'ter': '特', 'den': '登', 'ven': '文', 'ren': '伦',
  'kin': '金', 'lin': '林', 'win': '温', 'don': '顿', 'ron': '伦',
  'ian': '伊安', 'ean': '恩', 'ard': '阿德', 'ell': '埃尔',
  'ght': '特', 'tion': '申', 'sion': '申',
  'a': '阿', 'b': '布', 'c': '克', 'd': '德', 'e': '', 'f': '夫',
  'g': '格', 'h': '赫', 'i': '伊', 'j': '杰', 'k': '克', 'l': '尔',
  'm': '姆', 'n': '恩', 'o': '奥', 'p': '普', 'q': '奎', 'r': '尔',
  's': '斯', 't': '特', 'u': '乌', 'v': '夫', 'w': '', 'x': '克斯',
  'y': '伊', 'z': '兹'
};
function transliterateToChineseName(enName) {
  if (!enName) return '新秀球员';
  const parts = enName.trim().split(/\s+/);
  const result = parts.map(part => {
    let s = part.toLowerCase().replace(/[^a-z]/g, '');
    if (!s) return '';
    let out = '';
    let i = 0;
    while (i < s.length) {
      let matched = false;
      for (let len = Math.min(4, s.length - i); len >= 1; len--) {
        const sub = s.substring(i, i + len);
        if (EN_TO_CN_SYLLABLE[sub] !== undefined) {
          out += EN_TO_CN_SYLLABLE[sub];
          i += len;
          matched = true;
          break;
        }
      }
      if (!matched) { out += EN_TO_CN_SYLLABLE[s[i]] || ''; i++; }
    }
    return out;
  });
  return result.filter(Boolean).join('·') || '新秀球员';
}
function resolveRookieDisplayName(nameCn, nameEn, fallback = '') {
  const cn = cleanText(nameCn);
  const en = cleanText(nameEn);
  // 优先使用中文名
  if (cn && !/[�]/.test(cn) && hasCjkText(cn)) return cn;
  // 英文名尝试音译为中文
  if (en && !/[�]/.test(en)) return transliterateToChineseName(en);
  if (cn && !/[�]/.test(cn)) return cn;
  return fallback || '新秀球员';
}
function getAvailableDraftYears() {
  const years = (LEAGUE.availableScriptYears || []).filter(y => y >= 1947 && y <= 2100).sort((a, b) => a - b);
  if (years.length) return years;
  const y = clamp(parseNum(G.startYear, G.year || 2025), 1947, 2100);
  return [y];
}
function resolveDraftScriptYear(targetYear) {
  const years = getAvailableDraftYears();
  if (!years.length) return clamp(parseNum(targetYear, G.year || 2025), 1947, 2100);
  const y = parseNum(targetYear, years[years.length - 1]);
  if (years.includes(y)) return y;
  if (y < years[0]) return years[0];
  if (y > years[years.length - 1]) return years[years.length - 1];
  return years.reduce((best, cur) => Math.abs(cur - y) < Math.abs(best - y) ? cur : best, years[0]);
}
function getAvailableScriptYears() {
  const draftYears = getAvailableDraftYears();
  const startYears = APK_NBA_START_YEARS.filter(y => {
    if (y === 1946) return draftYears.includes(1947) || draftYears[0] <= 1947;
    return draftYears.includes(y);
  });
  if (startYears.length) return startYears;
  const fallback = resolveRosterScriptStartYear(LEAGUE.years?.roster) || parseNum(G.startYear, G.year || 2025);
  return [fallback];
}
function potential99ToApkTier(potential99) {
  const p = clamp(parseNum(potential99, 75), 50, 99);
  return clamp(Math.round((p - 50) / 4.9) + 1, 1, 11);
}
function getPlayerRawSkillByNum(player, skillNum) {
  const attrs = player?.attrs || {};
  const tend = player?.tendencies || {};
  if (skillNum === 1) return parseNum(attrs.physique, 55);
  if (skillNum === 2) return parseNum(attrs.blk, 55);
  if (skillNum === 3) return parseNum(attrs.stl, 55);
  if (skillNum === 4) return parseNum(attrs.reb, 55);
  if (skillNum === 5) return parseNum(attrs.pass, 55);
  if (skillNum === 6) return parseNum(attrs.shotInt, 55);
  if (skillNum === 7) return parseNum(attrs.shotExt, 55);
  if (skillNum === 8) return parseNum(attrs.shotFree, 55);
  if (skillNum === 9) return parseNum(tend.in, 70);
  if (skillNum === 10) return parseNum(tend.ex, 70);
  if (skillNum === 11) return parseNum(tend.fr, 70);
  return 50;
}
function attrKeyToSkillNum(key) {
  if (key === 'physique') return 1;
  if (key === 'blk') return 2;
  if (key === 'stl') return 3;
  if (key === 'reb') return 4;
  if (key === 'pass') return 5;
  if (key === 'shotInt') return 6;
  if (key === 'shotExt') return 7;
  if (key === 'shotFree') return 8;
  return 0;
}
function getCoachSkillValue(coach, skillNum) {
  if (!coach) {
    return skillNum > 2 ? 40 : -2;
  }
  if (skillNum === 1) return clamp(parseNum(coach.techDev, 0), -2, 3);
  if (skillNum === 2) return clamp(parseNum(coach.techLevel, 0), -2, 3);
  if (skillNum === 3) return clamp(parseNum(coach.currentShotIntPercent, coach.baseShotIntPercent), 35, 45);
  if (skillNum === 4) return clamp(parseNum(coach.currentShotTriplePercent, coach.baseShotTriplePercent), 35, 45);
  if (skillNum === 5) return clamp(parseNum(coach.currentOffensive, coach.baseOffensive), 35, 45);
  if (skillNum === 6) return clamp(parseNum(coach.currentDefense, coach.baseDefense), 35, 45);
  if (skillNum === 7) return clamp(parseNum(coach.baseShotIntPercent, 40), 35, 45);
  if (skillNum === 8) return clamp(parseNum(coach.baseShotTriplePercent, 40), 35, 45);
  if (skillNum === 9) return clamp(parseNum(coach.baseOffensive, 40), 35, 45);
  if (skillNum === 10) return clamp(parseNum(coach.baseDefense, 40), 35, 45);
  return skillNum > 2 ? 40 : -2;
}
function getSimEnergyValue(player) {
  const stamina = clamp(parseNum(player?.stamina, 78), 10, 100);
  return stamina;
}
function getPlayerModifierPosition(player, lineupPos) {
  const lp = clamp(parseNum(lineupPos, parseNum(player?.pos, 3)), 1, 5);
  const p1 = parseNum(player?.pos, 3);
  const p2 = parseNum(player?.pos2, 0);
  if (lp === p1 || lp === p2) return 0;
  return -7;
}
function getPlayerSkillCoachAddition(player, skillNum, { teamId = 0 } = {}) {
  const actualSkill = clamp(parseNum(getPlayerRawSkillByNum(player, skillNum), 55), 25, 99);
  const coach = getTeamCoach(teamId || parseNum(player?.teamId, 0));
  const coachOff = getCoachSkillValue(coach, 5);
  const coachDef = getCoachSkillValue(coach, 6);
  if (skillNum > 4) {
    if (skillNum >= 9 || skillNum <= 5) return actualSkill;
    return clamp(Math.round((actualSkill * (coachOff + 160)) / 200), 25, 99);
  }
  const coachSkill = actualSkill * (140 - coachOff);
  if (skillNum === 2) {
    return clamp(Math.round((coachSkill * (coachDef + 60)) / 10000), 15, 99);
  }
  if (skillNum === 3) {
    return clamp(Math.round((coachSkill * (140 - coachDef)) / 10000), 15, 99);
  }
  return clamp(Math.round(coachSkill / 100), 15, 99);
}
function getPlayerMatchSkillWithEnergy(player, skillNum, { teamId = 0, lineupPos = 0 } = {}) {
  const base = getPlayerSkillCoachAddition(player, skillNum, { teamId });
  const energy = getSimEnergyValue(player);
  const modifierEnergy = Math.round(((120 - energy) * (-1)) / 8);
  const modifierPos = getPlayerModifierPosition(player, lineupPos || parseNum(player?.pos, 3));

  // Speed Bonus: 速度略微增强进攻(6,7)和防守(2,3)属性
  // 10% of (Speed - 50)
  let speedBonus = 0;
  if ([2, 3, 6, 7].includes(skillNum)) {
    const speed = parseNum(player?.attrs?.speed, 55);
    speedBonus = Math.max(0, Math.round((speed - 50) * 0.1));
  }

  return clamp(base + (modifierEnergy * 2) + modifierPos + speedBonus, 10, 99);
}
function getOpponentDefenseForSkill(player, opponent, skillNum, { playerTeamId = 0, opponentTeamId = 0, lineupPos = 0 } = {}) {
  let blockInf = 5;
  let stealInf = 6;
  if (skillNum === 6 || skillNum === 9) {
    blockInf = 7;
    stealInf = 3;
  } else if (skillNum === 8 || skillNum === 11) {
    blockInf = 5;
    stealInf = 4;
  }
  const oppBlock = getPlayerMatchSkillWithEnergy(opponent, 2, { teamId: opponentTeamId, lineupPos: parseNum(opponent?.pos, 3) });
  const oppSteal = getPlayerMatchSkillWithEnergy(opponent, 3, { teamId: opponentTeamId, lineupPos: parseNum(opponent?.pos, 3) });
  const defense = ((oppBlock * blockInf) + (oppSteal * stealInf)) / 10 + 10;
  const own = getPlayerMatchSkillWithEnergy(player, skillNum, { teamId: playerTeamId, lineupPos });
  const twice = own * 2;
  const val = twice - defense;
  return Math.round(Math.min(val, twice / 2));
}
function getPlayerShotPercentByType(player, opponent, type, { playerTeamId = 0, opponentTeamId = 0, lineupPos = 0, minutes = 30 } = {}) {
  const lp = clamp(parseNum(lineupPos, parseNum(player?.pos, 3)), 1, 5);
  if (type === 'do') {
    // 使用内线(6)与三分(7)属性的加权平均值替代原本错误的罚球(8)加成
    const skill6 = getOpponentDefenseForSkill(player, opponent, 6, { playerTeamId, opponentTeamId, lineupPos: lp });
    const skill7 = getOpponentDefenseForSkill(player, opponent, 7, { playerTeamId, opponentTeamId, lineupPos: lp });
    let shotSkillNum = Math.round((skill6 * 0.4 + skill7 * 0.6)) - 55;
    if (shotSkillNum < 0) shotSkillNum = 0;
    let base = ((shotSkillNum * 56) / 100) + 30;
    if (parseNum(minutes, 0) > 41) base = (base * 9) / 10;
    return clamp(Math.round(base), 32, 60);
  }
  if (type === 'ex') {
    let shotSkillNum = getOpponentDefenseForSkill(player, opponent, 7, { playerTeamId, opponentTeamId, lineupPos: lp }) - 55;
    if (shotSkillNum < 0) shotSkillNum = 0;
    let base = ((shotSkillNum * 4) / 10) + 28;
    if (parseNum(minutes, 0) > 41) base = (base * 9) / 10;
    return clamp(Math.round(base), 22, 48);
  }
  if (type === 'fr') {
    const shotExSkill = getPlayerMatchSkillWithEnergy(player, 7, { teamId: playerTeamId, lineupPos: lp }) * 6;
    const shotFrSkill = getPlayerMatchSkillWithEnergy(player, 8, { teamId: playerTeamId, lineupPos: lp }) * 5;
    const shotSkillAll = (shotExSkill + shotFrSkill) / 10;
    let about = ((shotSkillAll + 10) - lp) - 55;
    if (about < 0) about = 0;
    let base = ((about * 9) / 10) + 50;
    if (parseNum(minutes, 0) > 41) base = (base * 9) / 10;
    return clamp(Math.round(base), 40, 95);
  }
  let shotSkillNum = getOpponentDefenseForSkill(player, opponent, 6, { playerTeamId, opponentTeamId, lineupPos: lp }) - 5;
  let about = (shotSkillNum + lp) - 55;
  if (about < 0) about = 0;
  let base = ((about * 8) / 10) + 40;
  if (parseNum(minutes, 0) > 41) base = (base * 9) / 10;
  return clamp(Math.round(base), 40, 80);
}
function getApkPlayerDevelopmentValue(player, coach) {
  const rating = parseNum(player?.rating, ovr(player?.attrs || {}));
  const age = parseNum(player?.age, 24);
  const potTier = potential99ToApkTier(parseNum(player?.potential, 75));
  if (age <= 33) {
    let value = ((rating - 36) * 2) + ((age - 10) * 8) - (potTier * 2);
    value += getCoachSkillValue(coach, 1) * (-12);
    if (rating >= 90) value += value;
    else if (rating >= 85) value += Math.round(value / 2);
    return value;
  }
  let value = rating + ((46 - age) * 8) + (potTier * 2);
  if (rating >= 90) value -= Math.round(value / 2);
  else if (rating >= 85) value -= Math.round(value / 3);
  return value;
}
function getApkNpcYearDelta(player, coach) {
  const rating = parseNum(player?.rating, 70);
  const age = parseNum(player?.age, 24);
  const devValue = getApkPlayerDevelopmentValue(player, coach);
  let delta = 0;
  if (age <= 22) {
    if (devValue <= 90) delta = rng(4, 7);
    else if (devValue <= 125) delta = rng(2, 5);
    else if (devValue <= 165) delta = rng(1, 3);
    else delta = rng(-1, 2);
  } else if (age <= 26) {
    if (devValue <= 110) delta = rng(2, 5);
    else if (devValue <= 155) delta = rng(1, 3);
    else if (devValue <= 200) delta = rng(0, 2);
    else delta = rng(-2, 1);
  } else if (age <= 30) {
    if (devValue <= 140) delta = rng(1, 2);
    else if (devValue <= 200) delta = rng(0, 2);
    else delta = rng(-2, 1);
  } else if (age <= 33) {
    delta = rng(-2, 1);
  } else {
    delta = rng(-4, 0);
  }
  if (rating >= 88) delta = Math.min(delta, rng(0, 2));
  if (rating <= 70 && potential99ToApkTier(parseNum(player?.potential, 75)) >= 10) delta = Math.max(delta, rng(3, 6));
  return clamp(delta, -6, 8);
}
function applyNpcSeasonDevelopment(player, coach) {
  const attrs = player.attrs && Object.keys(player.attrs).length ? { ...player.attrs } : parsePlayerAttrs(player);
  const delta = getApkNpcYearDelta(player, coach);
  applyOvrDeltaToAttrs(attrs, delta, clamp(parseNum(player.potential, 75), 50, 99), parseNum(player.age, 24));
  player.attrs = attrs;
  player.rating = ovr(attrs);
  player.att = player.rating;
  player.def = player.rating;
  player.age = parseNum(player.age, 24) + 1;
  player.yearsLeague = Math.max(0, parseNum(player.yearsLeague, 0) + 1);
  player.rookie = false;
}
function ageUserOneYear() {
  G.player.age = parseNum(G.player.age, 19) + 1;
  G.player.stamina = 100;
  G.player.maxStamina = 100;
}
function teamLogoMarkup(team, size = 50) {
  if (!team) return '';
  const src = team.logo || getTeamLogoPath(team.id, team.a || '');
  const fb = team.logoFallback || getTeamAltLogoPath(team.id);
  return `<img src="${src}" data-fallback="${fb}" alt="${team.a}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover" onerror="if(this.dataset.fallback){this.src=this.dataset.fallback;this.dataset.fallback='';}else{this.style.display='none';this.parentNode.textContent='${team.a || '??'}';this.parentNode.style.background='${team.cl || '#2d5ab8'}';}">`;
}
function nameKey(v) { return String(v || '').trim().toLowerCase().replace(/\s+/g, '') }
function playerIdentityKey(player) {
  const en = nameKey(player?.nameEn || player?.altName || '');
  if (en) return `en:${en}`;
  const n1 = nameKey(player?.name || player?.nameCn || '');
  if (n1) return `nm:${n1}`;
  const image = clamp(parseNum(player?.image, 0), 0, 9999);
  if (image > 0) return `img:${image}`;
  const id = parseNum(player?.id, 0);
  if (id > 0) return `id:${id}`;
  return '';
}
function realDraftValue(player) {
  return parseNum(player?.rating, 70) * 0.7 + parseNum(player?.potential, 75) * 0.3;
}
function evaluateDraftTierByRealClass(players) {
  if (!players.length) return 'normal';
  const ordered = [...players].sort((a, b) => realDraftValue(b) - realDraftValue(a));
  const top = ordered.slice(0, Math.min(5, ordered.length));
  const avg = top.reduce((s, p) => s + parseNum(p?.rating, 70), 0) / Math.max(top.length, 1);
  if (avg >= 79) return 'big';
  if (avg <= 74) return 'weak';
  return 'normal';
}

function badgeWeightedPick(pool) {
  const list = (pool || []).filter(x => x && x.id);
  if (!list.length) return '';
  const total = list.reduce((sum, item) => sum + Math.max(0.01, parseNum(item.w, 1)), 0);
  let r = Math.random() * total;
  for (const item of list) {
    r -= Math.max(0.01, parseNum(item.w, 1));
    if (r <= 0) return item.id;
  }
  return list[list.length - 1].id;
}
// ============ BADGE SYSTEM WITH LEVELS ============
const BADGES = [
  {
    id: 'goat', apkNo: 1, n: 'GOAT', d: '全能传奇，全面提升比赛统治力',
    req: '荣誉积分≥500', cat: 'legend',
    img: `${APK_BADGE_IMG_BASE}/badge_01.png`,
    effect: {
      fgPctBonus: 0.008, tpPctBonus: 0.008, ftPctBonus: 0.008,
      astFlat: 0.3, rebFlat: 0.3, stlFlat: 0.12, blkFlat: 0.12,
      attrBoost: { pass: 1, shotInt: 1, shotExt: 1, physique: 1, reb: 1, stl: 1, blk: 1 },
      injuryMult: 0.98
    }
  },
  {
    id: 'middy_magician', apkNo: 2, n: '运投高手', d: '持球节奏与中距离终结更稳定',
    req: '身体素质≥85；外线投射≥85', cat: 'shooting',
    img: `${APK_BADGE_IMG_BASE}/badge_02.png`,
    effect: { fgPctBonus: 0.008, insidePctBonus: 0.005, attrBoost: { shotExt: 1, physique: 0.5 }, clutchShot: 0.005 }
  },
  {
    id: 'cannon', apkNo: 3, n: '高位炮台', d: '大个子外线炮台，拉开空间',
    req: '外线倾向≥80；外线投射≥85；PF/C', cat: 'shooting',
    img: `${APK_BADGE_IMG_BASE}/badge_03.png`,
    effect: { tpPctBonus: 0.012, fgPctBonus: 0.003, attrBoost: { shotExt: 1, pass: 0.5 } }
  },
  {
    id: 'marksman', apkNo: 4, n: '百步穿杨', d: '纯射手徽章，三分稳定性显著提升',
    req: '外线投射≥90', cat: 'shooting',
    img: `${APK_BADGE_IMG_BASE}/badge_04.png`,
    effect: { tpPctBonus: 0.015, attrBoost: { shotExt: 1 }, clutchShot: 0.005 }
  },
  {
    id: 'rebounder', apkNo: 5, n: '篮板好手', d: '卡位和拼抢能力明显提升',
    req: '篮板争抢≥90', cat: 'rebounding',
    img: `${APK_BADGE_IMG_BASE}/badge_05.png`,
    effect: { rebFlat: 0.7, attrBoost: { reb: 1, strength: 1 } }
  },
  {
    id: 'interior_ruler', apkNo: 6, n: '内线主宰', d: '禁区终结与护筐压制力更强',
    req: '内线倾向≥80；内线终结≥85；PF/C', cat: 'finishing',
    img: `${APK_BADGE_IMG_BASE}/badge_06.png`,
    effect: { insidePctBonus: 0.012, blkFlat: 0.3, rebFlat: 0.3, attrBoost: { shotInt: 1, blk: 1, reb: 0.5 } }
  },
  {
    id: 'midrange_shooter', apkNo: 7, n: '中投靓仔', d: '中距离效率和关键终结能力更优',
    req: '中投倾向≥80；中投技巧≥80', cat: 'shooting',
    img: `${APK_BADGE_IMG_BASE}/badge_07.png`,
    effect: { fgPctBonus: 0.01, insidePctBonus: 0.004, attrBoost: { shotInt: 0.5, shotExt: 1 } }
  },
  {
    id: 'rhythm_master', apkNo: 8, n: '节奏大师', d: '组织梳理与控失误能力提升',
    req: '组织进攻≥85', cat: 'playmaking',
    img: `${APK_BADGE_IMG_BASE}/badge_08.png`,
    effect: { astFlat: 0.6, tovMult: 0.95, attrBoost: { pass: 1 } }
  }
];

function badgeById(id) {
  return BADGES.find(b => b.id === id) || null;
}
function getBadgeRequirementText(badgeOrId) {
  const b = typeof badgeOrId === 'string' ? badgeById(badgeOrId) : badgeOrId;
  return b?.req || '无';
}
function buildBadgeRuleContext(player = {}) {
  const attrs = (player?.attrs && Object.keys(player.attrs).length) ? player.attrs : parsePlayerAttrs(player || {});
  const shotInt = parseNum(attrs.shotInt, 55);
  const shotExt = parseNum(attrs.shotExt, 55);
  const pass = parseNum(attrs.pass, 55);
  const reb = parseNum(attrs.reb, 55);
  const physique = parseNum(attrs.physique, 55);
  const tendencyIn = parseNum(player?.tendencies?.in ?? player?.tendencyIn, 55);
  const tendencyMid = parseNum(player?.tendencies?.mid ?? player?.tendencyEx, 55);
  const tendencyExt = parseNum(player?.tendencies?.ex ?? player?.tendencyFr, 55);
  const pos = clamp(parseNum(player?.pos, 3), 1, 5);
  const isBig = pos === 4 || pos === 5;
  const shotMid = Math.round((shotInt + shotExt) / 2);
  const rating = clamp(parseNum(player?.rating, ovr(attrs)), 40, 99);
  const potential = clamp(parseNum(player?.potential, rating), 40, 99);
  const yearsLeague = Math.max(0, parseNum(player?.yearsLeague, 0));
  const hofScore = (() => {
    if (String(player?.id) === 'USER_SELF' && typeof getUserHallOfFameProfile === 'function') {
      const profile = getUserHallOfFameProfile();
      return parseNum(profile?.score, 0);
    }
    if (Number.isFinite(parseNum(player?.hallScore, NaN))) return parseNum(player?.hallScore, 0);
    return Math.max(0, Math.round((rating - 70) * 7 + (potential - 72) * 3 + yearsLeague * 9 + parseNum(player?.fame, 10) * 2));
  })();
  return {
    attrs, shotInt, shotExt, shotMid, pass, reb, physique,
    tendencyIn, tendencyMid, tendencyExt, pos, isBig, rating, potential, yearsLeague, hofScore
  };
}

// 检查是否满足基础要求 (Bronze Level)
function isBadgeRequirementMet(player, badgeOrId, { allowLegendFallback = true } = {}) {
  const badge = typeof badgeOrId === 'string' ? badgeById(badgeOrId) : badgeOrId;
  if (!badge) return false;
  const c = buildBadgeRuleContext(player);
  if (badge.id === 'goat') return c.hofScore >= 500;
  if (badge.id === 'middy_magician') return c.physique >= 85 && c.shotExt >= 85;
  if (badge.id === 'cannon') return c.tendencyExt >= 80 && c.shotExt >= 85 && c.isBig;
  if (badge.id === 'marksman') return c.shotExt >= 90;
  if (badge.id === 'rebounder') return c.reb >= 90;
  if (badge.id === 'interior_ruler') return c.tendencyIn >= 80 && c.shotInt >= 85 && c.isBig;
  if (badge.id === 'midrange_shooter') return c.tendencyMid >= 80 && c.shotMid >= 80; // Adjusted per user request
  if (badge.id === 'rhythm_master') return c.pass >= 85;
  return false;
}

// 计算徽章等级 (0=None, 1=Bronze, 2=Silver, 3=Gold, 4=HOF)
function getBadgeLevel(player, badgeOrId) {
  const badge = typeof badgeOrId === 'string' ? badgeById(badgeOrId) : badgeOrId;
  if (!badge) return 0;

  if (!isBadgeRequirementMet(player, badge)) return 0;

  const c = buildBadgeRuleContext(player);
  let excess = 0;

  // Define primary attribute for leveling calculation
  if (badge.id === 'goat') excess = Math.max(0, c.hofScore - 500) / 200; // Harder to level GOAT
  else if (badge.id === 'middy_magician') excess = Math.min(c.physique - 85, c.shotExt - 85);
  else if (badge.id === 'cannon') excess = c.shotExt - 85;
  else if (badge.id === 'marksman') excess = c.shotExt - 90;
  else if (badge.id === 'rebounder') excess = c.reb - 90;
  else if (badge.id === 'interior_ruler') excess = c.shotInt - 85;
  else if (badge.id === 'midrange_shooter') excess = c.shotMid - 80;
  else if (badge.id === 'rhythm_master') excess = c.pass - 85;

  // Level 1 (Bronze) is base. +1 level per 5 points excess
  const level = 1 + Math.floor(excess / 5);
  return clamp(level, 1, 4);
}

// 获取徽章属性加成量 (仅bonus部分)
function getBadgeAttrBonuses(player) {
  const bonuses = {};
  if (!player || !player.badges || typeof player.badges !== 'object') return bonuses;
  Object.keys(player.badges).forEach(badgeId => {
    const badge = badgeById(badgeId);
    if (!badge || !badge.effect || !badge.effect.attrBoost) return;
    const level = parseNum(player.badges[badgeId], 1);
    if (level <= 0) return;
    Object.entries(badge.effect.attrBoost).forEach(([attrKey, boostVal]) => {
      const bonus = boostVal * level;
      if (bonus !== 0) bonuses[attrKey] = (bonuses[attrKey] || 0) + bonus;
    });
  });
  return bonuses;
}

// 获取徽章加成后的属性
function getEffectivePlayerAttrs(player) {
  const baseAttrs = (player?.attrs && Object.keys(player.attrs).length) ? { ...player.attrs } : parsePlayerAttrs(player || {});
  if (!player.badges) return baseAttrs;

  // Clone to avoid mutating original
  const effective = { ...baseAttrs };

  Object.keys(player.badges).forEach(badgeId => {
    const badge = badgeById(badgeId);
    if (!badge || !badge.effect || !badge.effect.attrBoost) return;

    // Level is stored as 1, 2, 3, 4
    const level = parseNum(player.badges[badgeId], 1);

    Object.entries(badge.effect.attrBoost).forEach(([attrKey, boostVal]) => {
      // Bonus = BaseBoost * Level
      // e.g. Midrange Shooter Level 3 (Gold) -> ShotInt + (1 * 3), ShotExt + (2 * 3)
      const bonus = boostVal * level;
      if (effective[attrKey] !== undefined) {
        effective[attrKey] += bonus;
      }
    });
  });

  return effective;
}

function getBadgeRequirementStatusText(player, badgeOrId) {
  const badge = typeof badgeOrId === 'string' ? badgeById(badgeOrId) : badgeOrId;
  if (!badge) return '要求: -';
  const met = isBadgeRequirementMet(player, badge, { allowLegendFallback: false });
  return `${met ? '✅' : '⛔'} 要求: ${getBadgeRequirementText(badge)}`;
}

// 重新计算并赋予玩家徽章 (Deterministic)
function recalcPlayerBadges(player) {
  const newBadges = {};

  BADGES.forEach(badge => {
    const level = getBadgeLevel(player, badge);
    if (level > 0) {
      newBadges[badge.id] = level;
    }
  });

  player.badges = newBadges;
  return newBadges;
}

// Deprecated: Randomized initial logic replaced by deterministic logic
// Replaced by deterministic logic
function assignInitialBadges(player) {
  return recalcPlayerBadges(player);
}
function normalizePlayerBadges(player, { assignIfEmpty = true } = {}) {
  if (!player || typeof player !== 'object') return {};
  const out = {};
  const put = (id, lv = 1) => {
    if (!BADGES.some(b => b.id === id)) return;
    const level = clamp(parseNum(lv, 0), 0, 4);
    if (level <= 0) return;
    out[id] = Math.max(out[id] || 0, level);
  };

  if (Array.isArray(player.badges)) {
    player.badges.forEach(id => put(String(id || '').trim(), 1));
  } else if (player.badges && typeof player.badges === 'object') {
    Object.entries(player.badges).forEach(([id, lv]) => put(String(id || '').trim(), lv));
  }

  if (assignIfEmpty && Object.keys(out).length === 0) {
    Object.assign(out, assignInitialBadges(player));
  }
  player.badges = out;
  return out;
}
function ensureLeagueBadges() {
  if (LEAGUE.teams) {
    Object.values(LEAGUE.teams).forEach(t => {
      if (!Array.isArray(t.players)) return;
      t.players.forEach(p => normalizePlayerBadges(p, { assignIfEmpty: true }));
    });
  }
  if (Array.isArray(LEAGUE.rookieCatalog)) {
    LEAGUE.rookieCatalog.forEach(p => normalizePlayerBadges(p, { assignIfEmpty: true }));
  }
  if (G.player) normalizePlayerBadges(G.player, { assignIfEmpty: true });
}
function getBadgeCategoryIcon(cat) {
  const map = {
    legend: '👑',
    shooting: '🎯',
    finishing: '💥',
    playmaking: '🧠',
    defense: '🛡',
    rebounding: '🧲',
    athletic: '⚡',
    mental: '🔥'
  };
  return map[String(cat || '').trim()] || '🎖️';
}
function getBadgeIconMarkup(badge, size = 18) {
  if (!badge) return getBadgeCategoryIcon('');
  const src = stripUndefinedTokens(badge.img || '');
  if (!src) return getBadgeCategoryIcon(badge.cat);
  const s = clamp(parseNum(size, 18), 12, 96);
  return `<img src="${src}" alt="${badge.n || 'badge'}" style="width:${s}px;height:${s}px;object-fit:cover;border-radius:4px;vertical-align:middle" onerror="this.style.display='none';this.nextSibling && (this.nextSibling.style.display='inline');"><span style="display:none">${getBadgeCategoryIcon(badge.cat)}</span>`;
}
function scaleBadgeEffectValue(key, value, level = 1) {
  const lv = clamp(parseNum(level, 1), 1, 4);
  if (typeof value !== 'number') return value;
  if (String(key || '').toLowerCase().includes('mult')) {
    return 1 + (value - 1) * lv;
  }
  return value * lv;
}
function getBadgeEffectShortText(effect, level = 1) {
  if (!effect || typeof effect !== 'object') return '';
  const parts = [];
  const pct = v => `${(parseNum(v, 0) * 100).toFixed(0)}%`;
  const signed = v => `${parseNum(v, 0) >= 0 ? '+' : ''}${parseNum(v, 0).toFixed(0)}`;
  const scaled = key => scaleBadgeEffectValue(key, effect[key], level);

  const fgPct = parseNum(scaled('fgPct'), 0) + parseNum(scaled('fgPctBonus'), 0);
  const tpPct = parseNum(scaled('tpPctBonus'), 0) + parseNum(scaled('deep3'), 0) + parseNum(scaled('corner3'), 0) * 0.3;
  const ftPct = parseNum(scaled('ftPctBonus'), 0);
  if (fgPct) parts.push(`投篮命中率 ${fgPct >= 0 ? '+' : ''}${pct(fgPct)}`);
  if (tpPct) parts.push(`三分命中率 ${tpPct >= 0 ? '+' : ''}${pct(tpPct)}`);
  if (ftPct) parts.push(`罚球命中率 ${ftPct >= 0 ? '+' : ''}${pct(ftPct)}`);

  if (effect.attrBoost && typeof effect.attrBoost === 'object') {
    const attrText = Object.entries(effect.attrBoost).map(([k, v]) => {
      const at = ATTRS.find(a => a.k === k);
      const val = scaleBadgeEffectValue(k, v, level);
      return `${at?.n || k}${signed(val)}`;
    }).slice(0, 4).join(' / ');
    if (attrText) parts.push(attrText);
  }

  const staminaCostMult = parseNum(scaled('staminaCostMult'), 1) * (1 - parseNum(scaled('staminaSave'), 0));
  if (staminaCostMult !== 1) {
    const delta = (1 - staminaCostMult) * 100;
    parts.push(`体力消耗 ${delta >= 0 ? '-' : '+'}${Math.abs(delta).toFixed(0)}%`);
  }
  const injuryMult = parseNum(scaled('injuryMult'), 1);
  if (injuryMult !== 1) {
    const delta = (1 - injuryMult) * 100;
    parts.push(`伤病风险 ${delta >= 0 ? '-' : '+'}${Math.abs(delta).toFixed(0)}%`);
  }
  const tovMult = parseNum(scaled('tovMult'), 1);
  if (tovMult !== 1) {
    const delta = (1 - tovMult) * 100;
    parts.push(`失误率 ${delta >= 0 ? '-' : '+'}${Math.abs(delta).toFixed(0)}%`);
  }
  if (effect.clutchShot || effect.clutchBoost) {
    const clutch = parseNum(scaled('clutchShot'), 0) + parseNum(scaled('clutchBoost'), 0);
    if (clutch) parts.push(`关键时刻加成 ${clutch >= 0 ? '+' : ''}${pct(clutch)}`);
  }
  if (effect.rebRange || effect.boxoutStrength || effect.wormMove) {
    const reb = parseNum(scaled('rebRange'), 0) + parseNum(scaled('boxoutStrength'), 0) + parseNum(scaled('wormMove'), 0);
    parts.push(`篮板能力 ${reb >= 0 ? '+' : ''}${pct(reb)}`);
  }
  if (effect.blockBoost || effect.chaseDownBlock || effect.paintIntimidate) {
    const blk = parseNum(scaled('blockBoost'), 0) + parseNum(scaled('chaseDownBlock'), 0) * 0.6 + parseNum(scaled('paintIntimidate'), 0) * 0.5;
    parts.push(`护筐影响 ${blk >= 0 ? '+' : ''}${pct(blk)}`);
  }

  return parts.slice(0, 3).join(' | ');
}
function getPlayerBadgeList(player) {
  const out = [];
  if (!player || !player.badges) return out;
  if (Array.isArray(player.badges)) {
    player.badges.forEach(id => {
      const b = BADGES.find(x => x.id === id);
      if (b) out.push({ id: b.id, lv: 1, badge: b });
    });
  } else if (typeof player.badges === 'object') {
    Object.entries(player.badges).forEach(([id, lv]) => {
      const b = BADGES.find(x => x.id === id);
      const level = clamp(parseNum(lv, 0), 0, 4);
      if (b && level > 0) out.push({ id: b.id, lv: level, badge: b });
    });
  }
  out.sort((a, b) =>
    b.lv - a.lv ||
    parseNum(a.badge?.apkNo, 99) - parseNum(b.badge?.apkNo, 99) ||
    String(a.badge.n).localeCompare(String(b.badge.n), 'zh-CN')
  );
  return out;
}

function cloneRealRookie(base, pick, draftYear = G.year) {
  const nameCn = cleanText(base?.nameCn || base?.name || '');
  const nameEn = cleanText(base?.nameEn || base?.altName || base?.nameBirth || '');
  const displayName = resolveRookieDisplayName(nameCn, nameEn, `新秀${pick}号`);
  const imageId = clamp(parseNum(base?.image, 0), 0, 9999);
  const attrs = base?.attrs && Object.keys(base.attrs).length ? { ...base.attrs } : parsePlayerAttrs(base || {});
  const rating = clamp(parseNum(base?.rating, ovr(attrs)), 45, 99);
  const potential = clamp(parseNum(base?.potential, normalizePotentialValue(base?.potential, rating)), 50, 99);
  return {
    ...base,
    id: 720000 + draftYear * 1000 + pick,
    uid: `real_${draftYear}_${pick}_${parseNum(base?.id, pick)}`,
    name: displayName,
    altName: nameEn,
    nameCn,
    nameEn,
    pos: clamp(parseNum(base?.pos, parseNum(base?.positionFirst, 3)), 1, 5),
    pos2: clamp(parseNum(base?.pos2, parseNum(base?.positionSecond, 0)), 0, 5),
    rating,
    potential,
    att: clamp(parseNum(base?.att, rating), 35, 99),
    def: clamp(parseNum(base?.def, rating), 35, 99),
    age: clamp(parseNum(base?.age, 20), 18, 28),
    yearsLeague: 0,
    draft: draftYear * 100,
    photo: getPlayerPhotoPath(imageId),
    image: imageId,
    info: base?.info || '',
    attrs,
    rookie: true,
    injury: { active: false, games: 0, type: "" },
    draftPick: pick,
    sourceDraftYear: rookieDraftYear(base),
    sourceDraftYear: rookieDraftYear(base),
    badges: assignInitialBadges({ ...base, rating, potential, attrs, yearsLeague: 0 })
  };
}
function collectRealDraftCandidates(targetYear, classSize, activeNameSet) {
  const year = resolveDraftScriptYear(targetYear);
  const all = [...getRookieCatalog()].filter(p => {
    if (!p) return false;
    const key = playerIdentityKey(p);
    return !!key && !activeNameSet.has(key);
  });
  const byYear = new Map();
  all.forEach(p => {
    const y = rookieDraftYear(p);
    if (y < 1947 || y > 2100) return;
    if (!byYear.has(y)) byYear.set(y, []);
    byYear.get(y).push(p);
  });
  byYear.forEach(list => list.sort((a, b) => realDraftValue(b) - realDraftValue(a)));
  const years = [...byYear.keys()].sort((a, b) => {
    const da = Math.abs(a - year), db = Math.abs(b - year);
    if (da !== db) return da - db;
    if (a === year) return -1;
    if (b === year) return 1;
    return a - b;
  });
  const usedNames = new Set(activeNameSet);
  const selected = [];
  for (const y of years) {
    const list = byYear.get(y) || [];
    for (const p of list) {
      const key = playerIdentityKey(p);
      if (!key || usedNames.has(key)) continue;
      usedNames.add(key);
      selected.push(p);
      if (selected.length >= classSize) break;
    }
    if (selected.length >= classSize) break;
  }
  return { year, players: selected };
}
function generateDraftClass(classSize = 64, { targetYear = G.year } = {}) {
  classSize = Math.max(8, Math.min(128, Math.round(classSize || 64)));
  const activeNames = new Set();
  Object.values(LEAGUE.teams).forEach(t => {
    (t.players || []).forEach(p => {
      const key = playerIdentityKey(p);
      if (key) activeNames.add(key);
    });
  });
  const selfKey = playerIdentityKey(G.player);
  if (selfKey) activeNames.add(selfKey);
  const picked = collectRealDraftCandidates(targetYear, classSize, activeNames);
  const classPlayers = picked.players.slice(0, classSize).map((base, idx) => cloneRealRookie(base, idx + 1, picked.year));
  const tier = evaluateDraftTierByRealClass(classPlayers);
  return { tier, year: picked.year, players: classPlayers };
}
function generateDraftClass64() {
  return generateDraftClass(64, { targetYear: G.year });
}
async function injectSeasonRookies() {
  if (!LEAGUE.loaded) return;
  try {
    const board = G.draftBoard;
    const stored = Array.isArray(board?._pickResults) ? board._pickResults : [];

    // Use draft results from simulateDraft if available (first season)
    if (stored.length) {
      const injected = [];
      stored.forEach(r => {
        if (!r.player || r.player.id === 'USER_PROSPECT') return;
        const tid = parseNum(r.teamId, 0);
        const t = LEAGUE.teams[tid];
        if (!t) return;
        t.players.push({ ...r.player, teamId: tid });
        injected.push(r.player);
      });
      if (!LEAGUE.rookiesBySeason) LEAGUE.rookiesBySeason = {};
      LEAGUE.rookiesBySeason[G.year] = injected;
    } else {
      // Fallback for subsequent seasons: generate fresh draft class
      const draftClass = generateDraftClass64();
      if (!LEAGUE.rookiesBySeason) LEAGUE.rookiesBySeason = {};
      LEAGUE.rookiesBySeason[G.year] = draftClass.players;
      const teamIds = Object.keys(LEAGUE.teams).map(Number).filter(id => id >= 1 && id <= 30);
      if (!teamIds.length) return;
      const draftOrder = [...teamIds].sort((a, b) => getTeamStrength(a) - getTeamStrength(b));
      const assign = [];
      draftOrder.forEach(id => assign.push(id));
      while (assign.length < 64) assign.push(teamIds[rng(0, teamIds.length - 1)]);
      draftClass.players.forEach((rk, i) => {
        let targetTeamId = 0;
        if (rk.teamId) targetTeamId = parseNum(rk.teamId, 0);
        else if (rk.draftTeam) {
          const abbr = String(rk.draftTeam).trim().toUpperCase();
          const found = Object.values(LEAGUE.teams).find(t => t.a === abbr || t.n.toUpperCase() === abbr);
          if (found) targetTeamId = found.id;
        }
        if (!targetTeamId || !LEAGUE.teams[targetTeamId]) targetTeamId = assign[i];
        const t = LEAGUE.teams[targetTeamId];
        if (!t) return;
        t.players.push({ ...rk, teamId: targetTeamId });
      });
      const top = draftClass.players[0];
      const tierText = draftClass.tier === 'big' ? '大年' : (draftClass.tier === 'weak' ? '小年' : '正常年');
      addNews(`🎓 ${G.year}届选秀完成（${tierText}）：状元 ${top.name} OVR ${top.rating} POT ${top.potential}`, 'neu');
    }

    Object.values(LEAGUE.teams).forEach(t => {
      t.rotation = toRotation(t.players);
      t.strength = calcTeamStrength(t);
    });
  } catch (e) {
    console.warn('Rookie injection failed', e);
  }
}
function getPos(id) { return POS.find(p => p.id === id) }
function getTemplatesForPos(posId) {
  return TEMPLATES_BY_POS[parseNum(posId, 0)] || [];
}
function getTemplate(id, posId = 0) {
  if (!id) return null;
  const list = posId ? getTemplatesForPos(posId) : ALL_TEMPLATES;
  return list.find(t => t.id === id) || ALL_TEMPLATES.find(t => t.id === id) || null;
}
function getXFactor(id) { return XFACTORS.find(x => x.id === id) }
function getPlayerXFactorEffect(player = G.player) {
  const xf = getXFactor(player?.xfactor);
  return xf ? xf.effect : {};
}
function getCoachEffectsByCoach(coach) {
  if (!coach) {
    return {
      offPct: 0, defPct: 0, tacticsPct: 0, xpPct: 0, xpMult: 1, teamRatingMult: 1,
      coachSkill1: -2, coachSkill2: -2, coachSkill5: 40, coachSkill6: 40,
      insideBias: 0, threeBias: 0, offensiveBias: 0, defensiveBias: 0,
      tacticsMult: 1, devMult: 1, loyaltyMod: 0
    };
  }
  // 原有技能
  const coachSkill1 = getCoachSkillValue(coach, 1); // techDev 培养
  const coachSkill2 = getCoachSkillValue(coach, 2); // techLevel 战术
  const coachSkill5 = getCoachSkillValue(coach, 5); // baseOffensive
  const coachSkill6 = getCoachSkillValue(coach, 6); // baseDefense

  // 新增：从CSV字段直接读取
  const baseShotInt = parseNum(coach.baseShotIntPercent, 40);
  const baseShotTriple = parseNum(coach.baseShotTriplePercent, 40);
  const baseOff = parseNum(coach.baseOffensive, 40);
  const baseDef = parseNum(coach.baseDefense, 40);
  const techLevel = parseNum(coach.techLevel, 0);
  const techDev = parseNum(coach.techDev, 0);
  const loyalty = parseNum(coach.loyalty, 5);

  // 投篮倾向偏差（-0.15 到 +0.15）
  const insideBias = clamp((baseShotInt - 40) / 100, -0.15, 0.15); // 内线倾向
  const threeBias = clamp((baseShotTriple - 40) / 100, -0.15, 0.15); // 三分倾向

  // 攻防体系偏差
  const offensiveBias = clamp((baseOff - 40) / 100, -0.12, 0.12);
  const defensiveBias = clamp((baseDef - 40) / 100, -0.12, 0.12);

  // 战术和培养倍率
  const tacticsMult = clamp(1 + techLevel * 0.04, 0.92, 1.08); // 战术执行
  const devMult = clamp(1 + techDev * 0.08, 0.84, 1.16); // 培养能力

  // 忠诚度影响信任
  const loyaltyMod = clamp((loyalty - 5) * 0.8, -4, 4);

  // 原有计算
  const offPct = clamp((coachSkill5 - 40) / 100, -0.12, 0.12);
  const defPct = clamp((coachSkill6 - 40) / 100, -0.12, 0.12);
  const tacticsPct = clamp(coachSkill2 * 0.015, -0.08, 0.08);
  const xpPct = clamp(coachSkill1 * 0.12 + techDev * 0.06, -0.4, 0.6); // 加入techDev影响
  const teamRatingMult = clamp(1 + tacticsPct + ((offPct + defPct) * 0.5) + techLevel * 0.015, 0.85, 1.15);

  return {
    offPct, defPct, tacticsPct, xpPct, xpMult: 1 + xpPct, teamRatingMult,
    coachSkill1, coachSkill2, coachSkill5, coachSkill6,
    insideBias, threeBias, offensiveBias, defensiveBias,
    tacticsMult, devMult, loyaltyMod,
    baseShotInt, baseShotTriple, baseOff, baseDef, techLevel, techDev, loyalty
  };
}
function getCoachEffects(teamId) {
  return getCoachEffectsByCoach(getTeamCoach(teamId));
}
function getPotentialXpMultiplier(player = G.player) {
  const pot = clamp(parseNum(player?.potential, 50), 0, 99);
  if (pot <= 50) return 1;
  return 1 + (pot - 50) / 100;
}
function addPlayerXP(baseXp) {
  const coachFx = getCoachEffects(G.teamId);
  const xfFx = getPlayerXFactorEffect(G.player);
  const xfactorMult = xfFx.xpMult || 1;
  const potMult = getPotentialXpMultiplier(G.player);
  const extraTrainMult = typeof getTrainingCoachXpMultiplier === 'function'
    ? parseNum(getTrainingCoachXpMultiplier(), 1)
    : 1;
  const gain = Math.max(0, Math.round(baseXp * coachFx.xpMult * xfactorMult * potMult * Math.max(0.75, extraTrainMult)));
  G.player.xp += gain;
  return gain;
}
function createUserRosterSnapshot() {
  const attrs = { ...G.player.attrs };
  const rating = ovr(attrs);
  const avatar = stripUndefinedTokens(G.player.avatar || G.player.photo || '');
  const rawBadges = G.player.badges;
  const badges = Array.isArray(rawBadges)
    ? rawBadges.reduce((acc, id) => {
      if (BADGES.some(b => b.id === id)) acc[id] = 1;
      return acc;
    }, {})
    : ((rawBadges && typeof rawBadges === 'object') ? { ...rawBadges } : {});
  return {
    id: 'USER_SELF',
    name: G.player.name,
    pos: G.player.pos,
    pos2: 0,
    rating,
    potential: G.player.potential,
    att: rating,
    def: rating,
    age: G.player.age,
    yearsLeague: Math.max(0, G.season - 1),
    photo: avatar || getPlayerPhotoPath(0),
    avatar,
    badges,
    xfactor: G.player.xfactor || '',
    attrs,
    tendencies: { ...G.player.tendencies },
    rookie: G.season === 1,
    isSelf: true
  };
}

function showModal(html, opts = {}) {
  const box = $('modalBox');
  box.className = 'modal';
  if (opts && opts.className) box.classList.add(opts.className);
  box.innerHTML = stripUndefinedTokens(html);
  $('modalBg').classList.add('active');
}
function hideModal() {
  const box = $('modalBox');
  box.className = 'modal';
  box.innerHTML = '';
  $('modalBg').classList.remove('active');
}
$('modalBg').addEventListener('click', e => { if (e.target === $('modalBg')) hideModal() });
function posLabel(pos) {
  const p = getPos(parseNum(pos, 0));
  return p ? p.n : (pos || '-');
}
function openPlayerDetailModal(player, teamMeta = null, title = '球员详情') {
  if (!player) return;
  const attrs = player.attrs || {};
  const photo = getPlayerPhotoSrc(player);
  const p1 = posLabel(player.pos);
  const p2 = parseNum(player.pos2, 0) > 0 ? ` / ${posLabel(player.pos2)}` : '';
  const teamText = teamMeta ? `${teamMeta.z || teamMeta.n} (${teamMeta.a || '--'})` : '新秀池';

  const badgelist = getPlayerBadgeList(player);
  const badgeHtml = badgelist.map(({ lv, badge: b }) => {
    const tierName = ["", "铜", "银", "金", "名人堂"][Math.min(4, lv)] || "铜";
    const tierColor = lv === 4 ? '#9c27b0' : lv === 3 ? '#ffc107' : lv === 2 ? '#c0c0c0' : '#cd7f32';
    const icon = getBadgeIconMarkup(b, 16);
    const effectText = getBadgeEffectShortText(b.effect, lv);
    const reqText = getBadgeRequirementText(b);
    const tooltipTitle = [b.d, effectText, `要求: ${reqText}`].filter(Boolean).join(' | ');
    return `<span class="badge" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);margin-right:4px;margin-bottom:4px;cursor:help;display:inline-flex;align-items:center;padding:2px 8px" title="${tooltipTitle}">
      ${icon} <span style="margin:0 4px">${b.n}</span> <span style="font-size:10px;padding:0 4px;border-radius:2px;background:${tierColor};color:#fff">${tierName}</span>
    </span>`;
  }).join('');
  const badgeDetailHtml = badgelist.map(({ lv, badge: b }) => {
    const tierName = ["", "铜", "银", "金", "名人堂"][Math.min(4, lv)] || "铜";
    const icon = getBadgeIconMarkup(b, 18);
    const effectText = getBadgeEffectShortText(b.effect, lv);
    const reqStatus = getBadgeRequirementStatusText(player, b);
    return `<div class="ev neu" style="margin-bottom:6px;padding:8px 10px">
      <div class="fw-b fs-sm">${icon} ${b.n}（${tierName}）</div>
      <div class="t-2 fs-xs mt-12">${b.d || '暂无描述'}</div>
      <div class="t-2 fs-xs mt-12">${reqStatus}</div>
      ${effectText ? `<div class="t-2 fs-xs mt-12">效果：${effectText}</div>` : ''}
    </div>`;
  }).join('');


  showModal(`
    <div class="modal-hd"><h3>${title}</h3><button class="modal-x" onclick="hideModal()">✕</button></div>
    <div class="grid g2">
      <div>
        <div class="player-head mb-16">
          <img class="player-avatar" src="${photo}" onerror="if(!this.dataset.fb){this.dataset.fb='1';this.src='${getPlayerPhotoPath(0)}';}else{this.style.opacity=.2}">
          <div>
            <div class="fw-b fs-lg">${player.name || 'Unknown'}</div>
            ${player.altName ? `<div class="t-2 fs-sm">${player.altName}</div>` : ''}
            <div class="t-2 fs-sm mt-12">${teamText}</div>
            <div class="mt-12"><span class="badge b-pri">${p1}${p2}</span> <span class="badge b-gold">OVR ${player.rating || 0}</span> <span class="badge b-cyan">POT ${player.potential || 0}</span></div>
            ${player.injury?.active ? `<div class="mt-12"><span class="badge b-no">🩹 ${player.injury.type}（缺阵${player.injury.games}场）</span></div>` : ''}
          </div>
        </div>
        ${badgeHtml ? `<div class="mb-16"><div class="fw-b mb-8" style="font-size:13px">徽章</div><div style="display:flex;flex-wrap:wrap">${badgeHtml}</div></div>` : ''}
        ${badgeDetailHtml ? `<div class="mb-16"><div class="fw-b mb-8" style="font-size:13px">徽章作用</div>${badgeDetailHtml}</div>` : ''}
        <div class="grid g2">
          <div class="stat-box"><div class="stat-val">${player.att ?? '-'}</div><div class="stat-lbl">ATT</div></div>
          <div class="stat-box"><div class="stat-val">${player.def ?? '-'}</div><div class="stat-lbl">DEF</div></div>
          <div class="stat-box"><div class="stat-val">${player.age ?? '-'}</div><div class="stat-lbl">年龄</div></div>
          <div class="stat-box"><div class="stat-val">${player.yearsLeague ?? 0}</div><div class="stat-lbl">球龄</div></div>
        </div>
${(() => {
      const t = player.tendencies || {};
      const tIn = parseNum(t.in, 55), tMid = parseNum(t.mid, 55), tEx = parseNum(t.ex, 55);
      return `<div class="mb-16" style="margin-top:12px">
        <div class="fw-b mb-8" style="font-size:13px">倾向值</div>
        <div class="flex fb" style="margin-bottom:6px"><span class="fs-sm" style="width:58px">内线</span>
          <div class="bar" style="flex:1;margin:0 8px"><div class="bar-fill" style="width:${tIn}%;background:#e74c3c"></div></div>
          <span class="fw-b" style="width:30px;text-align:right">${tIn}</span></div>
        <div class="flex fb" style="margin-bottom:6px"><span class="fs-sm" style="width:58px">中投</span>
          <div class="bar" style="flex:1;margin:0 8px"><div class="bar-fill" style="width:${tMid}%;background:#f39c12"></div></div>
          <span class="fw-b" style="width:30px;text-align:right">${tMid}</span></div>
        <div class="flex fb" style="margin-bottom:6px"><span class="fs-sm" style="width:58px">外线</span>
          <div class="bar" style="flex:1;margin:0 8px"><div class="bar-fill" style="width:${tEx}%;background:#3498db"></div></div>
          <span class="fw-b" style="width:30px;text-align:right">${tEx}</span></div>
      </div>`;
    })()}
      </div>
      <div>
        <div class="fw-b mb-16">属性明细</div>
${(() => {
      const effective = typeof getEffectivePlayerAttrs === 'function' ? getEffectivePlayerAttrs(player) : attrs;
      return ATTRS.map(at => {
        const v = parseNum(attrs[at.k], 0);
        const eff = parseNum(effective[at.k], 0);
        const bonus = eff - v;
        return `<div class="flex fb" style="margin-bottom:8px">
              <span class="fs-sm" style="width:58px">${at.n}</span>
              <div class="bar" style="flex:1;margin:0 8px"><div class="bar-fill ${barClass(eff)}" style="width:${clamp(eff, 0, 99)}%"></div></div>
              <div style="width:48px;text-align:right;line-height:1">
                <div class="fw-b">${v}</div>
                ${bonus > 0 ? `<div style="font-size:10px;color:var(--ok)">(+${bonus})</div>` : ''}
              </div>
            </div>`;
      }).join('');
    })()}
      </div>
    </div>
  `);
}
function showMyPlayerModal() {
  openPlayerDetailModal(createUserRosterSnapshot(), G.team, '我的球员');
}
function showTeamPlayerModal(teamId, playerId) {
  const teamObj = LEAGUE.teams?.[teamId];
  if (!teamObj) return;
  const player = (teamObj.players || []).find(p => String(p.id) === String(playerId));
  if (!player) return;
  openPlayerDetailModal(player, teamObj.meta, '球员详情');
}
function showRookieModal(rookieId) {
  const p = getRookieCatalog().find(r => String(r.id) === String(rookieId));
  if (!p) return;
  openPlayerDetailModal(p, null, '新秀详情');
}

function addNews(text, type = 'neu') {
  G.news.unshift({ text, type, season: G.season, game: G.gameNum, ts: Date.now() });
  if (G.news.length > 100) G.news.pop();
}
function addPhone(from, text, type = 'info') {
  G.phone.unshift({ from, text, type, season: G.season, read: false, ts: Date.now() });
  if (G.phone.length > 50) G.phone.pop();
}
