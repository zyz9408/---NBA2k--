# 游戏感与赛后节奏重构落地文档

## 1. 目标

当前版本已经有完整的生涯、比赛、社媒、商业、队友关系和教练关系系统，但玩家体验仍容易变成：

```text
点击模拟 -> 看一堆结果 -> 处理弹窗 -> 继续点击模拟
```

本次重构目标是把游戏主循环改成：

```text
赛前判断 -> 做取舍 -> 比赛关键节点介入 -> 赛后简报沉淀后果 -> 下一场带着后果继续
```

核心判断标准：

- 玩家每场至少有 1 个明确、可理解、会影响比赛的选择。
- 赛后弹窗不再打断每场比赛，普通事件沉淀到简报或手机。
- 每个事件都推进长期线，而不是一次性随机文本。
- UI 从信息堆叠改成作战板式流程，减少管理后台感。

## 1.1 当前落地状态

已落地的 MVP：

- `G.gameplay` 持久化状态：保存赛前计划、赛后事件导演、最近赛后简报和五条生涯线。
- `PreGamePlan`：主页比赛日作战板提供进攻重心、防守任务、节奏选择三类策略，比赛结算会把选择写入个人数据、体能消耗和赛后简报。
- `PostgameEventDirector`：赛后事件统一路由，同场强制弹窗上限为 `POSTGAME_FORCED_MODAL_CAP_PER_GAME = 1`，DNP 和低价值场景不会触发采访。
- `PostgameSummary`：主页显示最近一场赛后简报，普通反馈沉淀到简报或手机，不再连续弹窗。
- `CareerLines`：主页显示教练线、轮换线、更衣室线、媒体线、球星圈线，比赛后根据表现和赛前策略推进。
- `KeyPossession Cards`：已提供 `buildKeyPossessionCandidates()` 契约入口，后续可接入比赛中断式关键回合 UI。

暂未完全落地的后续阶段：

- 关键回合卡还没有做成比赛中的可操作弹窗。
- 生涯线仍是轻量数值推进，后续应接入阶段奖励、负面阈值和专属事件。
- 赛前策略目前影响盒分和总结，后续可接入更细的对手球风、教练体系和关键回合触发率。

## 2. 设计支柱

### 2.1 玩家动词

本游戏要强化的动词不是“模拟”，而是：

- 判断：看对手、赛程、体力、教练信任，决定今天怎么打。
- 取舍：选择得分、组织、防守、保体力、抢热度之间的代价。
- 介入：关键回合用有限选择改变比赛走势。
- 经营：让教练、队友、球星、媒体长期改变对玩家的看法。
- 承担：赛后结果进入长期线，下一场继续兑现或补救。

### 2.2 80/20 范围

前 80% 游戏时间应围绕下面 20% 功能：

- 今日作战板
- 比赛策略
- 关键回合
- 赛后简报
- 长期关系线

商业中心、豪宅、签名鞋、深层社媒可以保留，但要服务篮球主循环，而不是抢主循环。

### 2.3 节奏原则

- 普通比赛给总结，不强制弹窗。
- 高价值节点才弹强制选择。
- 每场最多 1 个强制赛后弹窗。
- 同类赛后事件必须有冷却。
- DNP、低分钟、垃圾时间不触发赛后采访。
- 多事件合并到一个赛后简报或手机待办。

## 3. 当前问题拆解

### 3.1 游戏感弱

表现：

- 玩家主要是在推进日程和模拟比赛。
- 比赛前的选择主要是体力负荷，影响不够有戏剧性。
- 比赛过程没有玩家介入点。
- 赛后结果很多，但玩家很少感觉“这是我赛前选择造成的”。

根因：

- `playGame()` 和 `simGameStats()` 已有很多模拟变量，但玩家可控输入太少。
- 事件、社媒、采访更多是结果解释，不是循环里的策略反馈。
- 长期关系线存在，但没有在 UI 上作为玩家目标持续呈现。

### 3.2 赛后弹窗频繁和重复

表现：

- 赛后采访、录像室、恢复安排、关键球追问、问责等都可能频繁打断。
- 事件类型虽然变多，但呈现方式相似，都是模态框加三选一。
- 玩家想继续比赛时被迫处理过多文本。

根因：

- 缺少统一的 `PostgameEventDirector`。
- 事件没有全局优先级、冷却、上限、路由。
- 强制弹窗、手机消息、赛后简报没有明确分工。

## 4. 目标主循环

### 4.1 每场比赛流程

```text
进入比赛日
  -> 今日作战板显示对手、状态、风险、目标
  -> 玩家选择赛前计划
  -> 比赛模拟
  -> 关键回合卡 0-2 次
  -> 生成比赛结果
  -> 赛后简报
  -> 事件导演决定是否弹 0-1 个强制事件
  -> 其余事件进入手机/简报/长期线
  -> 回到主页，长期线状态可见
```

### 4.2 赛后输出层级

所有赛后内容分 4 层：

1. 赛后简报：每场都有，非阻断，快速读完。
2. 强制弹窗：高价值节点才出现，每场最多 1 个。
3. 手机消息：非紧急关系反馈、社媒发酵、队友私信。
4. 长期线推进：教练、队友、媒体、球星、商业在后台变化，并在主页展示。

## 5. 新模块一：PostgameEventDirector

### 5.1 职责

统一决定赛后事件：

- 事件是否候选。
- 事件优先级。
- 是否允许强制弹窗。
- 是否进入手机。
- 是否只写入赛后简报。
- 是否因为冷却或上限被压制。

### 5.2 新状态字段

建议挂在 `G.gameplay`，避免继续把所有字段散在 `G.social` 或临时变量里。

```js
G.gameplay = {
  postgameDirector: {
    lastEventDayByType: {},
    lastEventGameIdByType: {},
    forcedModalGameId: '',
    forcedModalCountByGameId: {},
    suppressedEvents: [],
    pendingInboxEvents: []
  }
};
```

存档兼容：

- 旧存档没有 `G.gameplay` 时由 `ensureGameplayState()` 补齐。
- 不修改已有 `G.phone`、`G.social`、`G.results` 契约。

### 5.3 事件结构

```js
{
  id: 'postgame_clutch_media',
  type: 'media',
  family: 'postgame',
  priority: 78,
  forceEligible: true,
  route: 'modal',
  cooldownGames: 4,
  cooldownDays: 3,
  title: '关键球追问',
  desc: '媒体追问最后两个回合的选择。',
  choices: [],
  summaryLine: '媒体开始讨论你关键球处理。',
  inboxLine: '赛后采访区有记者继续追问关键回合。',
  effectsPreview: ['声望', '信任', '教练好感']
}
```

字段含义：

- `id`：唯一事件 ID。
- `type`：coach、media、teammate、recovery、star、rival、commercial。
- `family`：用于冷却的大类。
- `priority`：越高越可能成为强制弹窗。
- `forceEligible`：是否允许强制弹出。
- `route`：modal、summary、phone、inbox。
- `cooldownGames`：同类事件间隔比赛数。
- `cooldownDays`：同类事件间隔天数。
- `summaryLine`：写进赛后简报。
- `inboxLine`：写进手机消息。

### 5.4 路由规则

```text
候选事件生成
  -> 过滤 DNP/低分钟/垃圾时间不合理事件
  -> 应用冷却
  -> 按 priority 排序
  -> 选择最多 1 个 forced modal
  -> 其余事件按 route 进入 summary 或 phone
```

强制弹窗允许条件：

- `forceEligible === true`
- 当前比赛没有强制弹窗
- 同类型不在冷却
- 事件优先级达到阈值
- 玩家出场分钟符合要求

强制弹窗阈值：

| 场景 | 阈值 |
| --- | --- |
| 生涯首次首发 | 60 |
| 生涯新高 | 65 |
| 关键球成败 | 70 |
| 宿敌关系变化 | 72 |
| 教练信任升降级 | 75 |
| 伤病/交易/合同 | 85 |

### 5.5 DNP 和低分钟规则

```text
mins <= 0:
  禁止赛后采访
  禁止关键球追问
  禁止个人高光媒体
  允许替补席观察、教练训练提醒、手机舆论

0 < mins < 8:
  禁止核心采访
  禁止关键球追问，除非比赛日志明确有关键回合
  允许轮换争取、教练简短提醒

垃圾时间:
  禁止把表现写成拯救比赛
  允许训练/轮换/替补阵容反馈
```

### 5.6 推荐函数

新增到 `assets/js/sim.js`：

```js
function ensureGameplayState() {}
function buildPostgameEventCandidates(result) {}
function scorePostgameEvent(event, result) {}
function canRoutePostgameEvent(event, result) {}
function routePostgameEvents(result, candidates) {}
function recordPostgameEventRoute(routeResult) {}
function buildPostgameSummary(result, routedEvents) {}
function getPendingPostgameModal(result) {}
```

整合点：

- `playGame()` 结束后只生成结果，不直接决定所有弹窗。
- `doPlayGame()` 调用 `routePostgameEvents()`。
- `ui.js` 根据路由结果展示赛后简报和最多一个强制事件。
- 手机页读取 `G.gameplay.postgameDirector.pendingInboxEvents` 或直接复用 `G.phone`。

## 6. 新模块二：PreGamePlan

### 6.1 职责

让玩家在比赛前做真正影响比赛的策略选择。

每场比赛最多选择 3 个维度：

- 进攻计划
- 防守计划
- 心态策略

### 6.2 状态结构

```js
G.gameplay.pregamePlanByGame = {
  [gameKey]: {
    offense: 'rim_pressure',
    defense: 'star_focus',
    mindset: 'team_first',
    locked: true,
    createdDay: G.dayNum
  }
};
```

`gameKey` 建议使用：

```js
`${G.season}_${G.gameNum}_${oppTeamId}`
```

### 6.3 进攻计划

| ID | 标题 | 直接效果 | 风险 |
| --- | --- | --- | --- |
| `rim_pressure` | 冲击篮筐 | 罚球率上升，近框出手上升 | 体力消耗、失误、被盖风险上升 |
| `pullup_shooting` | 外线开火 | 三分出手上升，爆分概率上升 | 手感差时评分下降更明显 |
| `playmaking` | 带动队友 | 助攻和队友效率上升 | 个人得分和声望爆点下降 |
| `safe_usage` | 降低风险 | 失误下降，评分更稳 | 高光概率下降 |

建议数值：

```js
rim_pressure: {
  usageDelta: 0.02,
  ftaRateDelta: 0.12,
  rimShareDelta: 0.08,
  tovDelta: 0.25,
  staminaLossDelta: 2
}
```

### 6.4 防守计划

| ID | 标题 | 直接效果 | 风险 |
| --- | --- | --- | --- |
| `star_focus` | 盯防核心 | 对手核心效率下降，抢断/犯规上升 | 体力下降，犯规风险 |
| `help_defense` | 协防保护 | 团队防守上升，盖帽/篮板机会增加 | 漏底角三分风险 |
| `rebound_crash` | 冲抢篮板 | 篮板上升，转换机会变化 | 回防风险 |
| `conserve_energy` | 保留体力 | 体力保留，伤病风险下降 | 防守评价下降 |

### 6.5 心态策略

| ID | 标题 | 直接效果 | 风险 |
| --- | --- | --- | --- |
| `prove_myself` | 刷存在感 | 使用率、声望、爆发概率上升 | 教练信任和队友关系风险 |
| `team_first` | 团队优先 | 助攻、队友关系、教练信任上升 | 个人高光下降 |
| `steady_game` | 稳定发挥 | 波动下降，失误下降 | 爆分概率下降 |
| `rival_hunt` | 对位回应 | 宿敌/球星话题上升 | 体力、犯规、火药味风险 |

### 6.6 推荐函数

新增到 `assets/js/sim.js`：

```js
function getCurrentGameKey() {}
function getPregamePlanOptions(gameContext) {}
function setPregamePlan(gameKey, plan) {}
function getPregamePlan(gameKey) {}
function buildPregamePlanModifiers(plan, gameContext) {}
function applyPregamePlanToSimContext(simContext, modifiers) {}
function consumePregamePlanForResult(result, plan) {}
```

整合点：

- `renderHome()` 的比赛日卡片显示三个策略槽。
- `playGame()` 读取当前比赛策略。
- `simGameStats()` 接收策略修正参数。
- `analyzeGamePerformance()` 增加“赛前计划兑现/失败”的解释。

### 6.7 UI 要求

今日作战板不要做成大段说明，使用 3 个紧凑分组：

```text
今日策略
进攻：冲击篮筐 / 外线开火 / 带动队友 / 降低风险
防守：盯防核心 / 协防保护 / 冲抢篮板 / 保留体力
心态：刷存在感 / 团队优先 / 稳定发挥 / 对位回应
```

每个选项显示：

- 一句短标题。
- 两个正向效果。
- 一个风险标签。

移动端：

- 默认只显示已选策略。
- 点击“调整策略”展开。
- 比赛按钮永远在策略区域下方，不和文本重叠。

## 7. 新模块三：KeyPossession Cards

### 7.1 职责

给比赛过程加入少量玩家介入点，而不是完整实时操作。

MVP 规则：

- 每场 0-2 张关键回合卡。
- 只有出场玩家才触发。
- DNP 不触发。
- 垃圾时间默认不触发。
- 触发后只给 3 个选择。
- 每张卡都有成功、普通、失败三档结果。

### 7.2 触发条件

| 类型 | 条件 |
| --- | --- |
| `early_run` | 第一节或第二节对手打出 8-0 以上攻势 |
| `foul_trouble` | 玩家犯规较多但还在轮换 |
| `cold_start` | 玩家前半场低效 |
| `hot_hand` | 玩家手感好，球队需要扩大优势 |
| `clutch_time` | 末节分差 6 分以内 |
| `rival_duel` | 宿敌或同位置球星同场 |
| `coach_test` | 教练信任临界值附近 |

### 7.3 卡片结构

```js
{
  id: 'clutch_down_5',
  type: 'clutch_time',
  quarter: 4,
  clock: '02:18',
  title: '最后两分钟落后 5 分',
  desc: '对手开始换防，你有一次决定进攻方向的机会。',
  choices: [
    {
      id: 'attack_rim',
      title: '强攻造犯规',
      detail: '高风险冲击篮下。',
      success: ['罚球', '声望', '士气'],
      risk: ['被盖', '失误', '体力']
    }
  ]
}
```

### 7.4 结算结构

```js
{
  momentId: 'clutch_down_5',
  choiceId: 'attack_rim',
  outcome: 'success',
  text: '你顶着协防杀进篮下造成犯规。',
  statDelta: { pts: 2, fta: 2, ftm: 2 },
  scoreDelta: 2,
  moodDelta: 2,
  fameDelta: 1,
  trustDelta: 1,
  staminaDelta: -3
}
```

### 7.5 推荐函数

```js
function buildKeyPossessionCandidates(resultPreview, simContext) {}
function selectKeyPossessionCards(candidates, resultPreview) {}
function resolveKeyPossessionChoice(card, choiceId, context) {}
function applyKeyPossessionOutcome(result, outcome) {}
function appendKeyPossessionToGameLog(result, card, outcome) {}
```

### 7.6 实现阶段建议

第一版不需要改成真正暂停比赛模拟。可以先做“赛中节点回放式介入”：

1. `playGame()` 生成基础结果和比赛流。
2. 如果满足条件，生成 1 张关键回合卡。
3. UI 弹出“比赛关键回合”。
4. 玩家选择后，应用小幅数据和关系修正。
5. 再展示最终赛后简报。

第二版再改成真正的分段模拟：

```text
simulate first 3 quarters -> key card -> simulate final stretch with modifier -> final result
```

这样风险更低。

## 8. 新模块四：CareerLines

### 8.1 职责

把零散事件变成可见长期目标。

建议先做 5 条线：

- 教练信任线
- 轮换地位线
- 更衣室线
- 媒体人设线
- 球星关系线

### 8.2 状态结构

```js
G.gameplay.careerLines = {
  coach: { score: 43, stage: 'rotation_fight', lastDelta: 0 },
  rotation: { score: 35, stage: 'bench', lastDelta: 0 },
  lockerRoom: { score: 50, stage: 'neutral', lastDelta: 0 },
  media: { score: 20, identity: 'rookie', heat: 0, lastDelta: 0 },
  starCircle: { score: 8, stage: 'unknown', lastDelta: 0 }
};
```

### 8.3 阶段阈值

教练信任线：

| 分数 | 阶段 | 游戏效果 |
| --- | --- | --- |
| 0-24 | 信任危机 | 分钟不稳定，关键时刻更少 |
| 25-49 | 轮换观察 | 普通替补或边缘首发 |
| 50-69 | 稳定轮换 | 分钟更稳定 |
| 70-84 | 战术信任 | 关键球和球权提升 |
| 85-100 | 核心待遇 | 首发和战术优先级提高 |

媒体人设线：

| 身份 | 触发倾向 | 风险 |
| --- | --- | --- |
| 低调新人 | 团队发言、稳定表现 | 热度低 |
| 火药味球员 | 对位回应、宿敌互动 | 信任风险 |
| 团队核心 | 助攻、防守、队友支持 | 个人高光少 |
| 商业明星 | 声望、代言、社媒热度 | 表现下滑时反噬 |

### 8.4 UI 呈现

主页增加“生涯线索”区域，不要做成大卡片墙。

建议用一条横向或纵向紧凑条：

```text
生涯线索
教练：稳定轮换  58/100  本场 +2
更衣室：中性     51/100  本场 +1
媒体：低调新人   热度 22  本场 -1
球星圈：被注意   12/100  本场 +3
```

点击进入详情才展开历史事件。

## 9. 赛后简报设计

### 9.1 简报内容

每场比赛固定显示：

- 比分和胜负。
- 玩家数据和评分。
- 赛前计划兑现情况。
- 1-3 条关键回合。
- 本场长期线变化。
- 待处理事件数量。

### 9.2 简报示例

```text
赛后简报
骑士 106:101 湖人

你：18 分 4 篮板 6 助攻，评分 A

赛前计划
外线开火：三分出手增加，但第四节被针对换防
团队优先：助攻 +2，队友信任 +1

关键回合
第四节 02:18，你选择强攻造犯规，命中两罚。

长期变化
教练信任 +2
媒体热度 +1
体力 -7

待处理
1 条媒体追问已放入手机
```

### 9.3 弹窗策略

赛后简报可以是轻模态，但必须允许：

- 一键继续。
- 查看详情。
- 打开手机处理。

强制弹窗只在简报之后出现，并且每场最多 1 个。

## 10. UI 重构方案

### 10.1 主页优先级

主页首屏应该变成：

1. 今日作战板
2. 玩家状态
3. 赛前策略
4. 近期目标和生涯线索

降低优先级：

- 商业详情
- 社媒长文本
- 深层统计入口

### 10.2 比赛日卡片

比赛日卡片结构：

```text
GAME NIGHT
对手：湖人
风险：客场背靠背，体力 74%
目标：稳定轮换，减少失误

今日策略
[进攻] 外线开火
[防守] 盯防核心
[心态] 团队优先

按钮：调整策略 / 开始比赛
```

### 10.3 手机页定位

手机页负责：

- 舆情流
- 回复选项
- 消息盒
- 球星关系

手机页不负责：

- 每场主循环决策
- 所有赛后事件
- 教练核心反馈

### 10.4 移动端要求

- 首屏只显示今日作战板和开始比赛。
- 策略选择用分段控件或底部抽屉。
- 赛后简报在移动端使用单列布局。
- 长文本折叠，默认显示一句结论。
- 按钮高度至少 40px。

## 11. 文件落点

### 11.1 `assets/js/sim.js`

新增或修改：

- `ensureGameplayState`
- `PostgameEventDirector` 相关函数
- `PreGamePlan` 相关函数
- `KeyPossession` 相关函数
- `CareerLines` 相关函数
- `playGame()` 读取赛前计划和关键回合结果
- `buildCoachDailyPrompt()` 改由导演调用，不直接决定频率

### 11.2 `assets/js/ui.js`

新增或修改：

- `renderHome()` 增加今日作战板和生涯线索。
- `renderPregamePlanPicker()`。
- `showPostgameSummary()`。
- `showKeyPossessionModal()`。
- `showPostgameForcedEvent()`。
- 手机页增加待处理事件入口。

### 11.3 `assets/css/app.css`

新增样式：

- `.gameplan-board`
- `.strategy-segment`
- `.postgame-summary`
- `.career-line-strip`
- `.key-possession-modal`

要求：

- 不能出现黑字配深色底。
- 移动端策略选项必须单列或横向可滚动。
- 强制事件卡不使用嵌套卡片。

### 11.4 `tests/contract-smoke.test.js`

新增契约：

- 存在 `ensureGameplayState`。
- 存在 `routePostgameEvents`。
- 存在每场最多 1 个强制赛后事件的契约文本或常量。
- DNP 不触发赛后采访。
- 存在 `getPregamePlanOptions`。
- 存在 `buildKeyPossessionCandidates`。

### 11.5 `tests/browser-cdp-career-smoke.js`

新增浏览器冒烟：

- 比赛日前能看到策略选择。
- 策略选择后开始比赛。
- 赛后简报出现。
- 强制赛后弹窗每场最多 1 个。
- 手机消息能看到被路由的非强制事件。
- 移动端策略按钮不重叠。

## 12. 分阶段开发计划

### Phase 1：赛后事件导演

目标：

- 立刻解决弹窗频繁和重复。

任务：

1. 新增 `ensureGameplayState()`。
2. 新增 `routePostgameEvents()`。
3. 给现有 `buildCoachDailyPrompt()` 的事件加 `priority`、`cooldownGames`、`forceEligible`。
4. `doPlayGame()` 改成展示赛后简报，再由导演决定是否弹 0-1 个强制事件。
5. 低优先级事件进手机消息。
6. 加契约测试和浏览器冒烟。

验收：

- 连续打 5 场普通比赛，不会每场都强制弹采访。
- 每场最多 1 个强制赛后弹窗。
- DNP 不触发采访。
- 手机仍能看到被压制的事件反馈。

### Phase 2：赛前策略

目标：

- 让比赛前有明确玩家决策。

任务：

1. 新增赛前策略状态。
2. 主页比赛日卡片加入三类策略。
3. `simGameStats()` 接入策略修正。
4. 赛后简报显示策略兑现情况。
5. 添加测试确保不同策略会改变统计倾向。

验收：

- 选择“外线开火”后，三分出手倾向上升。
- 选择“团队优先”后，助攻/队友关系更容易上升。
- 选择“保留体力”后，体力消耗下降但防守评价可能下降。

### Phase 3：关键回合卡

目标：

- 加入赛中介入点。

任务：

1. 新增关键回合候选生成。
2. 支持每场 0-2 张卡。
3. UI 支持关键回合选择。
4. 选择结果进入比赛日志和赛后简报。
5. 添加浏览器测试。

验收：

- 胶着比赛更容易出现关键回合。
- DNP 和垃圾时间不出现关键回合。
- 关键回合选择会改变小幅数据、情绪、信任或声望。

### Phase 4：长期线

目标：

- 把零散结果变成持续目标。

任务：

1. 新增 `G.gameplay.careerLines`。
2. 把教练、队友、媒体、球星变化同步到长期线。
3. 主页显示生涯线索。
4. 赛后简报显示本场长期线变化。
5. 加存档兼容和契约测试。

验收：

- 玩家能看到自己从轮换边缘进入稳定轮换。
- 媒体人设会因选择变化。
- 球星关系推进不只出现在手机帖里，也会进入长期线。

## 13. 平衡参数建议

### 13.1 事件冷却

| 事件族 | 冷却 |
| --- | --- |
| 赛后采访 | 4 场 |
| 录像室 | 3 场 |
| 恢复安排 | 3 场 |
| 关键球追问 | 5 场 |
| 输球问责 | 4 场 |
| 队友事件 | 3 场 |
| 球星互动 | 2 场 |
| 商业事件 | 7 天 |

### 13.2 强制弹窗上限

```js
const POSTGAME_FORCED_MODAL_CAP_PER_GAME = 1;
const POSTGAME_FORCED_MODAL_MIN_PRIORITY = 70;
```

例外：

- 伤病
- 交易
- 赛季结束
- 合同节点

这些属于生涯关键节点，可以覆盖普通上限，但不能和普通采访叠加。

### 13.3 关键回合频率

| 玩家阶段 | 频率 |
| --- | --- |
| DNP | 0 |
| 边缘轮换 | 0-1，低概率 |
| 稳定轮换 | 0-1 |
| 首发 | 1 |
| 核心 | 1-2 |

## 14. 测试计划

### 14.1 单元/契约测试

- `routePostgameEvents()` 对 10 个候选事件只选 1 个强制弹窗。
- 冷却中的事件不进入强制弹窗。
- DNP 比赛不会生成采访和关键回合。
- 低分钟比赛不会生成核心媒体追问。
- 赛前计划能生成稳定 modifiers。
- 关键回合选择能返回合法 outcome。
- 旧存档缺少 `G.gameplay` 时能自动补齐。

### 14.2 浏览器冒烟

桌面：

- 创建球员。
- 进入比赛日。
- 选择赛前策略。
- 开始比赛。
- 查看赛后简报。
- 确认强制赛后弹窗不超过 1 个。
- 打开手机，确认非强制事件进入消息。

移动端：

- 策略选择不重叠。
- 比赛按钮保持可点击。
- 赛后简报单列可读。
- 弹窗按钮无黑字深底问题。

### 14.3 人工验收

连续打 10 场：

- 普通场次能快速继续。
- 关键场次有明显事件。
- 不再每场都被采访打断。
- 玩家能解释“我这场为什么打成这样”。
- 玩家能看到长期线变化。

## 15. 风险和处理

### 15.1 风险：策略影响太强

处理：

- 初版只给小幅 modifier。
- 先影响倾向，不直接保证结果。
- 用 `gradeScore` 和结果解释告诉玩家原因。

### 15.2 风险：关键回合让模拟变复杂

处理：

- 第一版用“回放式介入”，不重写整场模拟。
- 第二版再做分段模拟。

### 15.3 风险：UI 更复杂

处理：

- 默认折叠详情。
- 首页只保留今日作战板和生涯线索。
- 手机承担异步消息，不承担主循环。

### 15.4 风险：旧系统字段过多

处理：

- 新状态统一放进 `G.gameplay`。
- 旧字段只读不删。
- 存档加载时自动迁移。

## 16. 最小可交付版本

如果只做一版，必须包含：

1. `PostgameEventDirector`。
2. 每场最多 1 个强制赛后弹窗。
3. 普通赛后简报。
4. 赛前三类策略选择。
5. 策略结果写入赛后简报。
6. DNP/低分钟/垃圾时间过滤。
7. 桌面和移动端浏览器冒烟。

做到这里，游戏感会明显从“连续模拟器”转向“球员生涯决策游戏”。

## 17. 不做事项

本轮不建议做：

- 实时 2D/3D 篮球操作。
- 复杂战术编辑器。
- 新商业系统。
- 新社媒大改。
- 大规模 UI 换皮。

原因：

- 当前最大收益来自主循环决策和弹窗节奏，而不是继续堆系统。
- 先让每场比赛有选择、有反馈、有长期后果，再扩展表现层。
