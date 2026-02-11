# LLM_README.md

## 1. 项目定位
本项目是一个纯前端（原生 HTML/CSS/JS）NBA 生涯模拟器，核心目标是：
- 保留玩家创建球员与生涯成长体验。
- 在同一套界面内运行联盟赛季模拟（阵容、比赛、奖项、选秀、休赛期）。
- 提供比赛中心：可查看最近比赛、全部比赛以及单场双方盒分数据。
- 对齐 APK 关键逻辑（教练加成、赛季节点、真实新秀池优先等）。

当前版本已从单文件拆分为多模块文件，便于维护与模型快速读取。

## 2. 快速启动
### 2.1 打开方式
- 推荐：本地 HTTP 服务（避免浏览器 file:// 限制）。
- 兼容：file:// 打开后，在页面内授权本地目录（使用 File System Access API）。

### 2.2 数据目录要求
项目根目录应存在：
- `raw/01_rosters/rosters01.csv`
- `raw/02_coaches/coaches01.csv`
- `raw/03_rookies/rostersRookiesReal.csv`
- `raw/names.json`
- `drawable-v11/IMGxxxx.png`
- `drawable-v21/*.png`

## 3. 目录结构（核心）
- `nba-career-simulator.html`：页面骨架（只保留 DOM 容器与资源引用）。
- `assets/css/app.css`：全部样式。
- `assets/js/core.js`：基础数据、状态、工具函数、名单加载、教练/选秀底层逻辑。
- `assets/js/sim.js`：生涯创建算法、比赛模拟、赛季推进、休赛期与交易逻辑。
- `assets/js/ui.js`：所有页面渲染与交互事件绑定。
- `APK/`：APK 反编译资源与逻辑参考。
- `raw/`：CSV/JSON 数据源。

## 4. 前端加载顺序（必须保持）
HTML 中脚本顺序：
1. `assets/js/core.js`
2. `assets/js/sim.js`
3. `assets/js/ui.js`

原因：项目使用全局函数/全局状态，不是 ES Module。后加载模块依赖前面模块中的全局定义。

## 5. 核心状态对象
### 5.1 `G`（玩家与赛季主状态）
在 `assets/js/core.js` 定义，包含：
- 玩家：`G.player`（属性、潜力、XP、合同、伤病、天赋等）
- 生涯：`G.season/G.year/G.careerStats/G.awards` 等
- 联盟赛季缓存：`G.leagueSeason`（`teamRecords/playerStats/teamGameLogs/gameDetails`）
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

### 6.2 `assets/js/sim.js`
主要内容：
- 玩家创建算法：抽属性、潜力、选秀评分。
- 比赛模拟：个人数据、球队分数、联盟轮次模拟、伤病处理。
- 比赛日志：记录全联盟单场比分与双方盒分（用于比赛中心详情弹窗）。
- 赛季管理：赛程生成、战绩、排名、季后赛推进。
- 成长系统：XP 加点、球员年度成长、潜力影响。
- 交易/合同/休赛期：
  - 续约
  - 选秀两轮
  - 选秀收尾
  - 自由市场
- 联盟奖项与赛季结束逻辑。

### 6.3 `assets/js/ui.js`
主要内容：
- 创建页、主页、比赛页、比赛中心页、数据页、阵容页、加点页、交易页、荣誉页、手机页、存档页渲染。
- **手机页随机事件系统**：事件触发后自动切换到手机页面，强制玩家选择。
- **效果文本中文翻译**：`translateEffectKey()`/`formatEffectText()` 将 fame→声望、trust→信任 等翻译为中文。
- 页面导航与按钮事件。
- 启动入口：`bootstrap()`。

## 7. 关键业务流程（读代码优先级）
### 7.1 启动
`bootstrap()` -> `loadLeagueData()` -> `renderCreate()`。

### 7.2 创建球员到入队
`renderCreate` -> `createStep1` -> `selectBody` -> `selectTemplate` -> `gotoDraft` -> `assignToDraft` -> `startCareer`。

### 7.3 单场推进
`doPlayGame` -> `playGame` -> `simGameStats` + 联盟轮次模拟 -> 更新 `G.seasonStats`/新闻/伤病，并写入 `G.leagueSeason.gameDetails`。

### 7.4 赛季结束到新赛季
`endSeason` -> `runApkOffseasonPipeline`（227/228/229/230/231）-> `startNewSeason`。

## 8. 选秀系统（当前实现要点）
- 目标：对齐 APK 无尽模式思路，优先使用真实新秀池。
- 开局年份：使用 APK 固定年份集合（如 2025、2024、…、1946）。
- 选秀年份映射：1946 会映射到 1947 新秀池。
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
3. 读 `assets/js/sim.js` 的 `playGame/endSeason/runApkOffseasonPipeline`
4. 读 `assets/js/ui.js` 的 `renderCreate/renderGame/renderStats`

### 10.2 常见改动入口
- 改模拟强度/统计分布：`assets/js/sim.js`（`simulateAIPlayerLine`、得分归一函数）。
- 改比赛中心/单场盒分展示：`assets/js/ui.js`（`renderMatchCenter`、`showLeagueGameDetailModal`）。
- 改开局年份/选秀届别：`assets/js/core.js`（年份映射与 `generateDraftClass`）。
- 改 UI 样式：`assets/css/app.css`。
- 改页面结构：`assets/js/ui.js` 对应 `render*` 函数。

### 10.3 不要轻易改动
- 脚本加载顺序（会导致全局函数未定义）。
- `G` 与 `LEAGUE` 的字段名（很多函数直接依赖）。
- `loadLeagueData` 的路径兼容逻辑（影响 file:// 与目录授权）。

## 11. 验证建议
修改后至少做：
- 语法检查：拼接 `core.js + sim.js + ui.js` 后执行 Node 语法验证。
- 启动验证：能进入创建页、完成选秀、进入赛季。
- 数据验证：能加载 `raw` 数据并显示球队/球员/教练。
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
