# LLM_README.md

## 1. 项目定位
本项目是一个纯前端（原生 HTML/CSS/JS）NBA 生涯模拟器，核心目标是：
- 保留玩家创建球员与生涯成长体验。
- 在同一套界面内运行联盟赛季模拟（阵容、比赛、奖项、选秀、休赛期）。
- 提供比赛中心：可查看最近比赛、全部比赛以及单场双方盒分数据。
- 对齐 APK 关键逻辑（教练加成、赛季节点、真实新秀池优先等）。

当前版本已从单文件拆分为多模块文件，便于维护与快速读取。

## 1.1 全自动生涯模拟
当前主流程是“全自动生涯模拟”：选秀后玩家不再做加点、赛前策略、努力程度、交易申请、代言签约、签名鞋创建、手机主动发声、回复或教练沟通选择。玩家只点击“模拟下一周”，系统在后台完成比赛、休息日、社交回应、交易处理、续约/自由市场、代言和签名鞋事件。

选秀前夜媒体预测、周报和退役结算只使用真实 LLM：设置页提供 OpenAI 兼容配置 `baseURL/model/apiKey/temperature/maxTokens`，请求目标为 `POST /chat/completions`，并要求返回 JSON。缺少配置、请求失败或 JSON 字段不合格时，选秀前夜不会进入正式选秀；周模拟不会提交，会回滚到周模拟前状态并允许重试。

`baseURL` 必须填写 OpenAI 兼容 API 根地址：OpenAI 官方建议填 `https://api.openai.com/v1`，本地或第三方兼容服务通常是 `http://127.0.0.1:xxxx/v1` 或服务商给出的 `/v1` 地址。不要填写官网、控制台、模型列表网页或需要登录的反代页面；如果页面提示 “LLM 接口返回 HTML 页面” 或旧浏览器错误 `Unexpected token '<'`，通常就是接口返回了网页而不是 JSON。

选秀前夜 `draft_media_prediction` 的 JSON 中，`expertMocks`、`latestBuzz`、`fanTalk`、`strengths`、`weaknesses` 应返回字符串数组；`latestBuzz` 至少提供 2 条可直接展示的试训反馈、球队兴趣、行情变化或消息源动态。前端会兼容项目符号字符串和常见对象数组，但最佳返回仍是 JSON array of strings。

保留本地文本池作为旧代码资源和非主流程工具，但选秀前夜媒体预测、自动生涯周报、退役结算不调用模板兜底。

历史排名使用独立 `historical_top100.json` 档案：v4 档案由本地历史数据库中的真实履历、名单聚合、荣誉计数、累计数据和巅峰评分计算，不再使用固定 Top100 种子表。退役玩家会按同一套 `legacyScore` 函数插入或更新，二周目可以导入同一个 JSON 继续保留之前玩家排名。档案保存 `honors`、`honorSummary`、`honorSeasons` 和 `honorSource`，这些字段从游戏内荣誉页同源数据生成，覆盖总冠军、MVP、FMVP、DPOY、ROY、最佳阵容、最佳防守阵容、全明星、全明星 MVP、数据王和最佳第六人。

历史数据生成脚本为 `tools/data/build_historical_db.mjs`，provider 链按 NBA API、balldontlie、SportsDataIO、本地/GitHub CSV 的顺序记录；没有 API key 或未启用联网刷新时，会使用已缓存 raw 和本地 CSV 离线生成 `assets/data/historical/`。游戏运行时只读取本地 JSON 和 `assets/data/historical/headshots/`，不会联网请求历史数据或头像。

名单球员的真实赛季数据会写入 `assets/data/historical/player_seasons_*.json`，运行时进入名单后由 `hydratePlayerWithHistoricalData()` 挂到球员对象的 `seasonHistory`、`careerHistory` 和 `historicalStatsBySeason`。球员详情页的“赛季数据”表直接读取这些逐赛季 rows；`careerBeforeStart` 只保留为汇总索引，不再作为唯一历史数据来源。

## 2. 快速启动
### 2.1 打开方式
- 推荐：本地 HTTP 服务（避免浏览器 file:// 限制）。
- 兼容：file:// 打开后，在页面内授权本地目录（使用 File System Access API）。

### 2.2 数据目录要求
项目根目录应存在：
- `assets/data/rosters01.csv`
- `assets/data/coaches01.csv`
- `assets/data/rostersRookiesReal.csv`
- `assets/data/names.json`
- `assets/data/images/` 或页面目录授权后可访问的兼容图片资源

## 3. 目录结构（核心）
- `nba-career-simulator.html`：页面骨架（只保留 DOM 容器与资源引用）。
- `assets/css/app.css`：全部样式。
- `assets/js/core.js`：基础数据、状态、工具函数、名单加载、教练/选秀底层逻辑。
- `assets/js/text-pools.js`：本地文本模板主池，替代远程文本生成。
- `assets/js/text-pools-extra.js`：本地文本模板扩展池，追加大量社媒/新闻模板。
- `assets/js/text-pools-long.js`：本地长文本模板扩展池，追加更长的社媒、剧情、战报、球星动态、商业和球探模板。
- `assets/js/sim.js`：生涯创建算法、比赛模拟、赛季推进、休赛期与交易逻辑。
- `assets/js/signature-shoe.js`：签名鞋系统。
- `assets/js/ui.js`：所有页面渲染与交互事件绑定。
- `assets/data/`：CSV/JSON 数据源。
- `gameplay-loop-implementation-plan.md`：游戏感、赛前策略、关键回合和赛后事件导演的落地文档。

## 4. 前端加载顺序（必须保持）
HTML 中脚本顺序：
1. `assets/js/core.js`
2. `assets/js/text-pools.js`
3. `assets/js/text-pools-extra.js`
4. `assets/js/text-pools-long.js`
5. `assets/js/sim.js`
6. `assets/js/signature-shoe.js`
7. `assets/js/ui.js`

原因：项目使用全局函数/全局状态，不是 ES Module。`text-pools-extra.js` 和 `text-pools-long.js` 必须在 `text-pools.js` 之后加载，`sim.js` 和 `ui.js` 依赖模板函数与核心状态。

## 5. 核心状态对象
### 5.1 `G`（玩家与赛季主状态）
在 `assets/js/core.js` 定义，包含：
- 玩家：`G.player`（属性、潜力、XP、合同、伤病、天赋等）
- 生涯：`G.season/G.year/G.careerStats/G.awards` 等
- 联盟赛季缓存：`G.leagueSeason`（`teamRecords/playerStats/teamGameLogs/gameDetails`）
- 游戏化循环：`G.gameplay`（`pregamePlanByGame/postgameDirector/latestPostgame/careerLines`）
- 选秀：`G.draftPick/G.draftBoard`
- 休赛期：`G.offseasonStage/G.offseasonSummary`

### 5.2 `LEAGUE`（联盟数据库镜像）
在 `assets/js/core.js` 定义，包含：
- `LEAGUE.teams`（球队、球员、轮换、强度）
- `LEAGUE.coaches`
- `LEAGUE.rookieCatalog`
- `LEAGUE.availableScriptYears`
- `LEAGUE.rootHandle/loadError`

## 6. 模块职责细分
### 6.1 `assets/js/core.js`
主要内容：
- 常量与静态配置：球队、位置、属性、模板、X-Factor、APK 年份映射。
- 文件读取与路径兼容：`loadLeagueData`、`fetchText`、`readFromRootHandle`。
- 数据标准化：`rowToPlayer`、`parsePlayerAttrs`、`resolveDisplayName`。
- 轮换与球队强度：`toRotation`、`buildDynamicTeamRotation`、`calcTeamStrength`。
- 教练效果与技能修正：`getCoachEffectsByCoach`、`getPlayerSkillCoachAddition`。
- 选秀池底层：`generateDraftClass`、`collectRealDraftCandidates`、`resolveDraftScriptYear`。
- 通用 UI helper：模态框、球员详情、消息/新闻写入。

### 6.2 `assets/js/text-pools.js` / `assets/js/text-pools-extra.js` / `assets/js/text-pools-long.js`
主要内容：
- 本地剧情、战报、社媒、商业、球探、退役总结等模板。
- `text-pools-extra.js` 只追加模板，不覆盖核心函数；必须在 `text-pools.js` 后加载。
- `text-pools-long.js` 只追加更长的本地模板，不覆盖核心函数；浏览器加载后会写入 `window.TEXT_POOL_LONG_EXPANSION_COUNT`，当前固定为 1650，并通过 `window.TEXT_POOL_LONG_EXPANSION_BY_CATEGORY` 暴露分项数量。
- 新增文本优先扩展模板池，避免在模拟过程中引入远程生成依赖。长模板优先覆盖高频可见场景：赛后社媒、日常剧情、比赛战报、球星动态、商业合作和选秀球探。
- 比赛日剧情和战报必须先从 `gameResult.homeRows/awayRows/st` 抽取真实盒分事实，再套故事模板。DNP 球员只能写未出场、替补席观察或训练准备，不得补写得分、罚球、防守回合、正负值或关键球。玩家可见文案应像比赛故事，避免出现“盒分显示、真实数据、日志按事实”这类审计腔。
- 手机页球星动态由 `sim.js` 的关系/比赛事实模板分流生成：按宿敌、朋友、尊重、同位置、对手、休息日、DNP、强势/普通表现切换文案，必须实际提到玩家，不能回退到少数固定句。

### 6.3 `assets/js/sim.js`
主要内容：
- 玩家创建算法：抽属性、潜力、选秀评分。
- 比赛模拟：个人数据、球队分数、联盟轮次模拟、伤病处理。
- 比赛日志：记录全联盟单场比分与双方盒分（用于比赛中心详情弹窗）。
- 赛季管理：赛程生成、战绩、排名、季后赛推进。
- 成长系统：XP 加点、球员年度成长、潜力影响。
- 比赛评分契约：`calcGrade()` 返回 `S+/S/A/B/C/D/F`，数字分保存在 `gradeScore`。
- 赛前计划契约：`getPregamePlanOptions()` 暴露三类策略，`applyPregamePlanToGameStats()` 在结算时把计划影响写入个人盒分、体能消耗和赛后简报。
- 赛后事件导演：`routePostgameEvents()` 统一处理赛后候选事件、冷却和强制弹窗上限；每场最多一个强制弹窗，普通反馈进入简报或手机。
- 生涯线视图：`buildCareerLinesView()` 输出教练线、轮换线、更衣室线、媒体线、球星圈线供主页展示。
- 社媒关系与手机动态：`buildStarTweetPayload()` 使用本地上下文模板，输入依赖 `dayResult.gameResult`、球星关系状态和发帖主题；改动后要确认 DNP 不被写成个人数据，高频球星帖不重复。
- 交易/合同/休赛期：
  - 续约
  - 选秀两轮
  - 选秀收尾
  - 自由市场
- 联盟奖项与赛季结束逻辑。

### 6.4 `assets/js/ui.js`
主要内容：
- 创建页、主页、比赛页、比赛中心页、数据页、阵容页、加点页、交易页、荣誉页、手机页、存档页渲染。
- **手机页随机事件系统**：事件触发后自动切换到手机页面，强制玩家选择。
- **社媒发声选项化**：玩家发推和回复推文使用固定口径选项，不再提供自由文本输入框。
- **回复选项分流**：回复球星、黑子、数据号、媒体号、粉丝号时使用不同按钮标题和文案，不再所有帖子共用“尊重回应/正面约战/职业降温/强调队友”。
- **赛后事件选项化**：赛后采访、录像复盘、恢复安排、关键球追问、输球后更衣室收口都通过选项结算。
- **赛前策略作战板**：比赛日主页显示进攻、防守、节奏三类策略选项，玩家选择会影响下一场结算和赛后简报。
- **赛后简报与生涯线**：主页显示最近赛后简报和五条长期线，减少赛后连续弹窗。
- **效果文本中文翻译**：`translateEffectKey()`/`formatEffectText()` 将 fame→声望、trust→信任 等翻译为中文。
- 页面导航与按钮事件。
- 启动入口：`bootstrap()`。

## 7. 关键业务流程（读代码优先级）
### 7.1 启动
`bootstrap()` -> `loadLeagueData()` -> `renderCreate()`。

### 7.2 创建球员到入队
`renderCreate` -> `createStep1` -> `selectBody` -> `selectTemplate` -> `gotoDraft` -> `assignToDraft` -> `startCareer`。

### 7.3 单场推进
`doPlayGame` -> `doSimulateDay` -> `simulateDay` -> `playGame` -> `routePostgameEvents`。其中 `playGame` 会应用当前 `PreGamePlan`，更新 `G.seasonStats`/新闻/伤病，并写入 `G.leagueSeason.gameDetails`；`routePostgameEvents` 负责赛后简报、手机反馈和最多一个强制赛后选择。

### 7.4 赛季结束到新赛季
`endSeason` -> `runApkOffseasonPipeline`（227/228/229/230/231）-> `startNewSeason`。

## 8. 选秀系统（当前实现要点）
- 目标：对齐 APK 无尽模式思路，优先使用真实新秀池。
- 开局年份：创建入口只显示 `2025、2009、2003、1996、1983` 五个时代。
- 选秀年份映射：历史库有精确年份时直接读取 `draft_classes.json`，不再把 2004、2006 等年份压到少数脚本年份。
- 历史头像：历史新秀和开档名单球员优先使用本地 `assets/data/historical/headshots/{canonicalId}.png` 缓存，缺失源图会在 `validation_report.json` 标记为 placeholder，运行时不回退到 `IMG0000.png`。
- 选秀评分：`OVR 70% + POT 30%`（见 `scoutScoreProspect`）。
- 展示：创建选秀结果页会显示完整选秀名单（非仅 Top10）。

## 9. 数据文件格式说明
### 9.1 球员名单 CSV
关键字段：
- `name/nameBirth`
- `positionFirst/positionSecond`
- `skillPass` 等技能字段
- `ATT/DEF`
- `age/teamID/draft/image/potential`

### 9.2 教练名单 CSV
关键字段：
- `techLevel/techDev`
- `baseOffensive/baseDefense`
- `baseShotIntPercent/baseShotTriplePercent`

### 9.3 新秀名单 CSV
关键字段：
- `yearsLeague`（用于届别筛选）
- `name/nameBirth`
- `position/skill/image`

## 10. 模型改动建议（给各类大模型）
### 10.1 首次理解顺序
1. 读 `nba-career-simulator.html`（确认加载顺序）
2. 读 `assets/js/core.js` 的状态对象与 `loadLeagueData`
3. 读 `assets/js/text-pools.js`、`assets/js/text-pools-extra.js` 与 `assets/js/text-pools-long.js` 的本地模板契约
4. 读 `assets/js/sim.js` 的 `playGame/endSeason/runApkOffseasonPipeline`
5. 读 `assets/js/ui.js` 的 `renderCreate/renderGame/renderStats`

### 10.2 常见改动入口
- 改模拟强度/统计分布：`assets/js/sim.js`（`simulateAIPlayerLine`、得分归一函数）。
- 改比赛中心/单场盒分展示：`assets/js/ui.js`（`renderMatchCenter`、`showLeagueGameDetailModal`）。
- 改短剧情、短战报、短社媒、短球探文案：优先追加 `assets/js/text-pools-extra.js` 模板。
- 改更长的剧情、战报、社媒、球星、商业或球探文案：优先追加 `assets/js/text-pools-long.js` 模板，并保持模板只追加、不覆盖核心函数。
- 改游戏主循环、赛前策略、关键回合或赛后弹窗频率：先读 `gameplay-loop-implementation-plan.md`，按 `PostgameEventDirector`、`PreGamePlan`、`KeyPossession Cards`、`CareerLines` 的阶段顺序落地。
- 改开局年份/选秀届别：`assets/js/core.js`（年份映射与 `generateDraftClass`）。
- 改 UI 样式：`assets/css/app.css`。
- 改页面结构：`assets/js/ui.js` 对应 `render*` 函数。

### 10.3 不要轻易改动
- 脚本加载顺序（会导致全局函数未定义）。
- `G` 与 `LEAGUE` 的字段名（很多函数直接依赖）。
- `loadLeagueData` 的路径兼容逻辑（影响 file:// 与目录授权）。

## 11. 验证建议
修改后至少做：
- 语法检查：对 `assets/js/*.js` 执行 `node --check`。
- 契约检查：执行 `node tests/contract-smoke.test.js`。
- 社媒/赛后交互检查：确认 `ui.js` 不再出现 `<textarea>`、玩家发声输入框、赛后自由打字框或旧 LLM 命名函数。
- DNP 文案检查：契约测试会构造 DNP 盒分，确认剧情、战报和社媒不会把个人高光写到未出场玩家身上，也不会把事实校验语直接展示给玩家。
- 浏览器流程冒烟：执行 `node tests/browser-cdp-career-smoke.js`，会通过本地 HTTP + Chrome CDP 跑创建生涯、开始赛季、模拟比赛和主页布局检查。
- 移动端主页布局冒烟：执行 `node tests/browser-cdp-career-smoke.js --viewport-width 390 --viewport-height 844 --mobile`，会额外检查比赛日动作按钮不能被挤出控件容器。
- 启动验证：能进入创建页、完成选秀、进入赛季。
- 数据验证：能加载 `assets/data` 数据并显示球队/球员/教练。
- 赛季验证：至少模拟到赛季结束，走完整休赛期节点。

## 12. X-Factor 天赋系统
`XFACTORS` 数组定义了球员天赋，共 25 个天赋分为 5 类：

### 天赋分类
| 类别 | 数量 | 特点 |
|-----|------|-----|
| 进攻型 | 7 | 提升得分、命中率、助攻 |
| 防守型 | 5 | 提升盖帽、抢断、篮板 |
| 身体型 | 5 | 影响伤病、体力、属性 |
| 精神型 | 5 | 影响团队、表现波动 |
| 成长型 | 3 | 影响经验、成长速度 |

### 效果应用位置
- `getEffectiveAttr()` - 属性计算（attrBonus, attrBoost, attrPct, clutchBoost 等）
- `simGameStats()` - 比赛统计（astFlat, rebFlat, stlFlat, blkFlat, tpPctBonus 等）
- `checkInjury()` - 伤病检查（injuryMult）
- `addPlayerXP()` - 经验获取（xpMult）
- `playGame()` - 团队胜率（teamBoost, toxicAura）
- `evolvePlayerOneYear()` - 年度成长（growthBoost, declineResist）

## 13. 迁移与扩展建议
- 下一步可继续拆分为更细粒度模块（如 `draft/`, `league/`, `ui/pages/`）。
- 若要长期维护，建议引入打包器（Vite/Rollup）与类型系统（TypeScript）。
- 在不引入框架前，保持“按功能块注释 + 全局状态单源”是当前最低风险方案。
