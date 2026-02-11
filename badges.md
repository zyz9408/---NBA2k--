# 徽章系统文档

## 徽章等级机制

徽章分4个等级：铜(Bronze)、银(Silver)、金(Gold)、名人堂(HOF)。
- 满足基础要求 → 铜级(1级)
- 每超过基础要求5点 → 升1级
- 效果按等级线性缩放：`效果值 × 等级`
- 乘法类效果(如tovMult)按偏差缩放：`1 + (原值-1) × 等级`

---

## 徽章列表

### 1. GOAT — 全能传奇
- **分类**: 传奇
- **解锁条件**: 荣誉积分 ≥ 500
- **描述**: 全能传奇，全面提升比赛统治力

| 效果字段 | 基础值(铜) | 说明 | 生效状态 |
|---------|-----------|------|---------|
| fgPctBonus | +0.8% | 内线/中距离命中率提升 | ✅ simGameStats + AI |
| tpPctBonus | +0.8% | 三分命中率提升 | ✅ simGameStats + AI |
| ftPctBonus | +0.8% | 罚球命中率提升 | ✅ simGameStats + AI |
| astFlat | +0.3 | 助攻数提升 | ✅ simGameStats + AI |
| rebFlat | +0.3 | 篮板数提升 | ✅ simGameStats + AI |
| stlFlat | +0.12 | 抢断数提升 | ✅ simGameStats + AI |
| blkFlat | +0.12 | 盖帽数提升 | ✅ simGameStats + AI |
| attrBoost | 传球/内线/外线/体素/篮板/抢断/盖帽 各+1 | 属性直接加成 | ✅ simGameStats + AI + UI |
| injuryMult | ×0.98 | 受伤概率降低2% | ✅ checkInjury |

---

### 2. 运投高手 (middy_magician)
- **分类**: 投射
- **解锁条件**: 身体素质 ≥ 85 且 外线投射 ≥ 85
- **描述**: 持球节奏与中距离终结更稳定

| 效果字段 | 基础值(铜) | 说明 | 生效状态 |
|---------|-----------|------|---------|
| fgPctBonus | +0.8% | 内线/中距离命中率提升 | ✅ |
| insidePctBonus | +0.5% | 内线额外命中率提升 | ✅ |
| attrBoost | 外线+1, 体素+0.5 | 属性加成 | ✅ |
| clutchShot | +0.5% | 关键时刻命中率(赛季末/季后赛) | ✅ 已修复 |

---

### 3. 高位炮台 (cannon)
- **分类**: 投射
- **解锁条件**: 外线倾向 ≥ 80 且 外线投射 ≥ 85 且 PF/C
- **描述**: 大个子外线炮台，拉开空间

| 效果字段 | 基础值(铜) | 说明 | 生效状态 |
|---------|-----------|------|---------|
| tpPctBonus | +1.2% | 三分命中率提升 | ✅ |
| fgPctBonus | +0.3% | 内线/中距离命中率提升 | ✅ |
| attrBoost | 外线+1, 传球+0.5 | 属性加成 | ✅ |

---

### 4. 百步穿杨 (marksman)
- **分类**: 投射
- **解锁条件**: 外线投射 ≥ 90
- **描述**: 纯射手徽章，三分稳定性显著提升

| 效果字段 | 基础值(铜) | 说明 | 生效状态 |
|---------|-----------|------|---------|
| tpPctBonus | +1.5% | 三分命中率提升 | ✅ |
| attrBoost | 外线+1 | 属性加成 | ✅ |
| clutchShot | +0.5% | 关键时刻命中率(赛季末/季后赛) | ✅ 已修复 |

---

### 5. 篮板好手 (rebounder)
- **分类**: 篮板
- **解锁条件**: 篮板争抢 ≥ 90
- **描述**: 卡位和拼抢能力明显提升

| 效果字段 | 基础值(铜) | 说明 | 生效状态 |
|---------|-----------|------|---------|
| rebFlat | +0.7 | 篮板数提升 | ✅ |
| attrBoost | 篮板+1, 力量+1 | 属性加成 | ✅ |

---

### 6. 内线主宰 (interior_ruler)
- **分类**: 终结
- **解锁条件**: 内线倾向 ≥ 80 且 内线终结 ≥ 85 且 PF/C
- **描述**: 禁区终结与护筐压制力更强

| 效果字段 | 基础值(铜) | 说明 | 生效状态 |
|---------|-----------|------|---------|
| insidePctBonus | +1.2% | 内线命中率提升 | ✅ |
| blkFlat | +0.3 | 盖帽数提升 | ✅ |
| rebFlat | +0.3 | 篮板数提升 | ✅ |
| attrBoost | 内线+1, 盖帽+1, 篮板+0.5 | 属性加成 | ✅ |

---

### 7. 中投靓仔 (midrange_shooter)
- **分类**: 投射
- **解锁条件**: 中投倾向 ≥ 80 且 中投技巧 ≥ 80
- **描述**: 中距离效率和关键终结能力更优

| 效果字段 | 基础值(铜) | 说明 | 生效状态 |
|---------|-----------|------|---------|
| fgPctBonus | +1.0% | 内线/中距离命中率提升 | ✅ |
| insidePctBonus | +0.4% | 内线额外命中率提升 | ✅ |
| attrBoost | 内线+0.5, 外线+1 | 属性加成 | ✅ |

---

### 8. 节奏大师 (rhythm_master)
- **分类**: 组织
- **解锁条件**: 组织进攻 ≥ 85
- **描述**: 组织梳理与控失误能力提升

| 效果字段 | 基础值(铜) | 说明 | 生效状态 |
|---------|-----------|------|---------|
| astFlat | +0.6 | 助攻数提升 | ✅ |
| tovMult | ×0.95 | 失误率降低5% | ✅ |
| attrBoost | 传球+1 | 属性加成 | ✅ |

---

## 效果消费链路

```
BADGES定义(core.js) → getBadgeEffects(sim.js) → mergeEffects合并
                                                      ↓
                              ┌─────────────────────────┼──────────────────────┐
                              ↓                         ↓                      ↓
                     simGameStats(玩家)        simulateAIPlayerLine(AI)    getEffectiveAttr(UI)
                              ↓                         ↓                      ↓
                     fgPctBonus → 内线/中距命中    fgPctBonus → 同左        attrBoost → 属性显示
                     tpPctBonus → 三分命中        tpPctBonus → 同左        clutchBoost → 关键属性
                     ftPctBonus → 罚球命中        ftPctBonus → 同左
                     insidePctBonus → 内线命中    insidePctBonus → 同左
                     clutchBoost → 关键时刻命中   clutchBoost → 季后赛命中
                     contestResist → 抗干扰命中
                     astFlat → 助攻              astFlat → 同左
                     rebFlat → 篮板              rebFlat → 同左
                     stlFlat → 抢断              stlFlat → 同左
                     blkFlat → 盖帽              blkFlat → 同左
                     tovMult → 失误倍率          tovMult → 同左
                     attrBoost → 属性加成        attrBoost → 同左
                     usageBoost → 使用率
                     staminaCostMult → 体力消耗
                     injuryMult → 受伤概率                                checkInjury
                     highlightBoost → 高光得分
                     varianceRange → 表现波动
                     rookieBoost → 新秀加成
                     staminaRegen → 体力恢复
                     xpMult → 经验倍率                                    XP计算
```

## 本次修复

| 问题 | 影响徽章 | 修复内容 |
|------|---------|---------|
| clutchShot/clutchBoost 未在比赛模拟中消费 | 运投高手、百步穿杨 | 已添加到 simGameStats 和 simulateAIPlayerLine 的命中率计算 |

## 未使用的效果字段

| 字段 | 状态 | 说明 |
|------|------|------|
| heatUpRate | ⚠️ 死字段 | 在fx初始化和mergeEffects中定义，但无任何游戏逻辑消费。目前也无徽章使用此字段 |
