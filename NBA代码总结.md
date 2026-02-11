# APK 下 NBA 相关代码总结

## 1. 范围与结论
- 主要业务代码位于 `APK/sources/com/blank/bm17`，共约 99 个 Java 文件。
- 核心联赛逻辑集中在 `APK/sources/com/blank/bm17/model/core`，共 19 个核心类（创建、赛程、模拟、选秀、成长、交易等）。
- 数据资源位于 `APK/resources/res/raw`，包含球员、教练、历史/现实新秀与姓名池。
- 这是一个完整的“赛季循环”模拟架构，不是只模拟单场比赛。

## 2. 数据资源（raw）
目录：`APK/resources/res/raw`

- 球员名单：`rosters01.csv` ~ `rosters25.csv`
- 教练名单：`coaches01.csv` ~ `coaches25.csv`
- 新秀池：`rostersRookie01.csv` ~ `rostersRookie05.csv`、`rostersRookiesReal.csv`、`rostersRookiesSpecial.csv`
- 姓名池：`names.json`

关键字段抽样：
- `rosters25.csv`：`positionFirst/positionSecond`、`potential`、`skillPass` 等 8 项能力、`tendencyIn/Ex/Fr`、`ATT/DEF`、`age`、`team/teamID`、`draft`、`image`、`info`
- `coaches25.csv`：`techLevel`、`techDev`、`baseOffensive`、`baseDefense`、`baseShotIntPercent`、`baseShotTriplePercent`、`loyalty`

说明：部分文件有中文编码痕迹（显示乱码），导出/再处理时建议统一 UTF-8。

## 3. 核心模块总览

### 3.1 创建与初始化
- `APK/sources/com/blank/bm17/model/core/AsyncTaskCreateBasic.java:33`
- `APK/sources/com/blank/bm17/model/core/ManagerCreate.java:1172`
- `APK/sources/com/blank/bm17/model/core/ManagerCreate.java:1605`

职责：
- 创建 `Game`
- 建队、导入球员、设置队名/图标
- 生成选秀池与选秀权
- 生成教练
- 进入选队流程

关键点：
- 教练读取优先尝试 URL，再回退到 raw（`ManagerCreate.coachs`）
- 球队图标按 `team.id + iconBaseRes` 方式设置，不是按缩写字符串映射

### 3.2 赛程与赛季推进
- `APK/sources/com/blank/bm17/model/core/ManagerCalendar.java:1454`
- `APK/sources/com/blank/bm17/model/core/AsyncTaskPlay.java:56`

职责：
- 生成常规赛 + 季后赛赛程并落库
- 按比赛日推进赛季状态

关键比赛日节点（`AsyncTaskPlay`）：
- `167`：创建季后赛
- `182/197/212`：推进后续季后赛轮次
- `226`：赛季结束处理
- `227`：续约
- `228/229`：选秀两轮
- `230`：选秀结束/自由市场阶段
- `231`：自由球员与新赛季收尾

### 3.3 比赛模拟
- `APK/sources/com/blank/bm17/model/core/ManagerSimulate.java:613`
- `APK/sources/com/blank/bm17/model/core/ManagerSimulate.java:1086`
- `APK/sources/com/blank/bm17/model/core/ManagerSimulate.java:671`
- `APK/sources/com/blank/bm17/model/core/ManagerSimulate.java:792`
- `APK/sources/com/blank/bm17/model/core/ManagerSimulate.java:809`
- `APK/sources/com/blank/bm17/model/core/ManagerSimulate.java:826`
- `APK/sources/com/blank/bm17/model/core/ManagerSimulate.java:843`

职责：
- 按比赛日逐场模拟
- 自动检查/修复双方轮换
- 计算攻防加成、命中、篮板、助攻、犯规、新闻、成长

命中率边界（硬限制）：
- 两分：32% ~ 60%
- 三分：22% ~ 48%
- 罚球：40% ~ 95%
- 内线：40% ~ 80%

比分修正机制：
- `recalculatePoints` 会把球队得分向区间收敛（下限约 60~70，上限约 125~145）

### 3.4 阵容与轮换
- `APK/sources/com/blank/bm17/model/core/ManagerLineup.java:108`
- `APK/sources/com/blank/bm17/model/core/ManagerLineup.java:323`
- `APK/sources/com/blank/bm17/model/core/ManagerLineup.java:347`
- `APK/sources/com/blank/bm17/model/core/ManagerSimulate.java:1088`

职责：
- 自动排出首发 + 替补（PG/SG/SF/PF/C 各 1）
- 保证可用 10 人轮换结构
- 计算每个位置首发分钟

分钟分配公式：
- 由首发/替补评分差换算，区间限制在 16~41 分钟
- 每场模拟前会检查阵容有效性，不合法则自动重排

### 3.5 选秀与新秀
- `APK/sources/com/blank/bm17/model/core/ManagerCreate.java:1696`
- `APK/sources/com/blank/bm17/model/core/ManagerDraft.java:132`
- `APK/sources/com/blank/bm17/model/core/ManagerDraft.java:156`
- `APK/sources/com/blank/bm17/model/core/ManagerDraft.java:226`

职责：
- 生成随机新秀 + 特殊新秀池
- 两轮选秀自动进行
- 按顺位赋予新秀合同与薪资

排序逻辑：
- 电脑选秀基于 `DraftPlayerComparator(19, -1)` 的排序结果（再叠加位置需求）

### 3.6 球员成长、体能、伤病
- `APK/sources/com/blank/bm17/model/core/ManagerDevelopment.java:210`
- `APK/sources/com/blank/bm17/model/core/ManagerDevelopment.java:251`

职责：
- 每场后处理球员伤病、体能、成长与新闻

备注：
- `develop` 与 `developSkills` 在当前反编译源码中未完整还原（方法体被反编译器折叠为异常），但调用链是存在的。

## 4. 对象模型（你改 Web 模拟时可直接对齐）

### 4.1 Player
- 文件：`APK/sources/com/blank/bm17/model/objects/crud/Player.java:28`
- 关键字段：`potential`、8 项能力、3 项倾向、`age`、`image`
- 关键方法：`getAverageSkillAll()`、`getValueLineup()`、`setLineupPosition()`

### 4.2 Team
- 文件：`APK/sources/com/blank/bm17/model/objects/crud/Team.java:22`
- 关键字段：首发/替补 10 个槽位、5 个位置首发分钟、`autoLineup`
- 关键方法：`getStarters()`、`getSubstitutes()`、`getNumOfPlayersForPositions()`

### 4.3 Match / MatchResult
- 文件：`APK/sources/com/blank/bm17/model/objects/crud/Match.java:12`
- 文件：`APK/sources/com/blank/bm17/model/objects/crud/MatchResult.java:12`
- 能记录完整单场明细：分钟、投篮分区命中/出手、篮板、助攻、抢断、盖帽、犯规、PER

## 5. UI 与“查看其他球员数据”入口
- 排行/统计页：`APK/sources/com/blank/bm17/activities/fragments/FragmentTopStatistics.java:37`
- 阵容页：`APK/sources/com/blank/bm17/activities/fragments/FragmentTeamLineup.java:44`
- 球员详情弹窗：`APK/sources/com/blank/bm17/activities/fragments/fragmentsUtils/PlayerPopupDescription.java:40`

要点：
- 统计页支持排序、筛选、点击球员打开详情弹窗
- 弹窗可显示头像、基础信息、分项能力、历史统计

## 6. 与你当前 HTML 版本最相关的可复用规则
- 每场前先做 `autoLineup` 与合法性校验。
- 轮换固定为 5 首发 + 5 替补，位置完整。
- 比赛后做助攻/篮板/得分二次校正，防止极端数据。
- 命中率和得分区间应设置硬边界。
- 赛季推进建议用“比赛日状态机”，不要只按“打一场就+1天”的松散流程。
- 选秀流程拆成：更新签位 -> 第一轮 -> 第二轮 -> 选秀后处理。
- 统计榜单基于 `MatchResult` 聚合，不要直接取球员基础能力。

## 7. 当前代码库的限制与风险
- 部分源码来自反编译，存在变量名失真、注释异常和个别方法未完整恢复。
- 资源编码不统一，中文和符号可能出现乱码。
- 团队图标逻辑依赖资源顺序索引，不是现代 NBA 缩写硬映射，迁移时要重做映射层。
