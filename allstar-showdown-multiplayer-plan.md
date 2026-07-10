# 全明星选牌联网玩法实施计划

## 目标

把现有单机“全明星争夺战”扩展为联网房间玩法。前端继续放在 GitHub Pages，服务器运行一个 Node WebSocket 服务，负责房间、状态同步、回合裁决、AI 托管和赛季模拟。

## 已确定方案

- 架构: client-server，服务端权威。客户端只渲染状态并提交动作，不直接决定卡牌归属、金币消耗或模拟结果。
- 人数: 每局 2 到 5 个经理席位；真人玩家至少 2 人。AI 不自动补位，是否添加 AI、添加几个 AI，都由房主手动决定。
- 进入方式: 房间码 + 昵称，不做账号系统。
- 掉线策略: 座位保留，倒计时继续；超时由 AI 自动托管，玩家重连后可接回座位。
- 部署: 前端仍用 `gh-pages`；后端部署在当前宝塔服务器，Node 服务监听 `127.0.0.1:3001`，nginx 反向代理 `/allstar/`。
- 上线限制: GitHub Pages 是 HTTPS，正式联机必须使用带 SSL 的域名提供 `wss://域名/allstar/ws`；IP HTTP 仅用于服务器联通验证。

## 当前实现状态

- 已实现: `server/allstar-realtime/server.js` 0.3.7，包含房间大厅、房主手动添加/移除 AI、2-5 席位限制、至少 2 真人开局校验。
- 已实现: 服务端权威选牌状态机，覆盖 PG/SG/SF/PF/C、固定 5 张牌、蛇形顺位、数据/荣誉/球队三轮揭示、认领、锁定、保持、截胡、锁卡挑战、顺序暗标、丢卡方重选、AI 决策、最终阵容评分结算。
- 已实现: 服务端权威动画 transition；位置过场、发牌、AI 思考、行动结果、轮次揭示、翻牌前奏和双方揭价严格串行，客户端从收到快照起完整播放并缓存后续状态。
- 已实现: 比价严格按“挑战者暗价 → 守方总承诺 → 双方揭价 → 服务端结算”执行；非当前出价者只能等待，不能看到输入框或对方暗价。
- 已实现: 前端主菜单新增“联网争夺战”入口，新增 `assets/js/allstar-online.js` 作为 WebSocket 客户端，复用现有全明星争夺战视觉体系。
- 已验证: 本地 2 真人 + 房主手动 1 AI 可完整走到结算；本地 2 真人可触发锁卡挑战、暗标、重选并完整走到结算。
- 尚未实现: 联网版 82 场赛季模拟。当前联网版完成五个位置后按阵容评分、剩余金币生成结算。

## 实现拆分

### 1. 服务端底座

- 新增 `server/allstar-realtime/server.js`。
- 提供 `GET /health` 用于宝塔/nginx/进程健康检查。
- 提供 `WS /ws` 用于后续房间协议。
- systemd 服务名: `allstar-showdown.service`。
- 默认环境:
  - `HOST=127.0.0.1`
  - `PORT=3001`
  - `NODE_ENV=production`

### 2. 房间与大厅

- 房间状态包含:
  - `roomCode`
  - `status`: `lobby | draft | era | sim | results`
  - `hostPlayerId`
  - `seats`: 2-5 个席位，真人或 AI
  - `createdAt` / `updatedAt`
- 客户端动作:
  - `create_room`
  - `join_room`
  - `leave_room`
  - `add_ai`
  - `remove_ai`
  - `start_game`
  - `reconnect`
- 服务端广播:
  - `room_state`
  - `player_joined`
  - `player_left`
  - `error`

### 3. 选牌状态机迁移

从 `assets/js/allstar-showdown.js` 拆出纯规则模块，服务端复用同一套逻辑:

- 卡池加载和按位置发牌。
- 每个位置始终发 5 张卡；2-5 名经理都围绕同一组 5 张卡进行选择。
- 蛇形顺位。
- 三轮信息揭示: 数据轮、荣誉轮、球队轮。
- 认领、锁定、保持、换无主卡、截胡未锁卡。
- 身价制金币比价:
  - 挑战者必须出价大于当前身价。
  - 守方只补差价。
  - 丢卡退回押金。
  - 位置揭晓后才正式计入花费。
- AI 估值和行动策略。
- 每个动作由服务端验证当前回合、玩家身份、金币余额和卡牌状态。

### 4. 前端联网入口

- 在主菜单新增“联网争夺战”入口，不替换现有单机入口。
- 联网页面包含:
  - 创建房间
  - 输入房间码加入
  - 昵称输入
  - 房主添加/移除 AI / 开始游戏；不会自动补 AI
  - 连接状态和重连提示
- 复用现有全明星卡牌 UI，把本地 `S` 状态改为从服务端 snapshot 渲染。
- 所有按钮改为发送 WebSocket 动作，例如 `claim_card`、`choose_lock`、`challenge_card`、`submit_bid`。

### 5. 赛季模拟

- 选完 5 个位置后由服务端执行年代转盘和 82 场模拟。
- 第一版复用现有 `core.js` / `sim.js` 逻辑，在 Node 里加载数据文件并运行模拟包装函数。
- 服务端按轮广播 `sim_progress`，房主可触发 `skip_sim` 跳过动画等待。
- 最终广播 `final_result`，所有客户端看到同一份排名、战绩、球员数据和金币账本。

## 协议草案

客户端消息:

```json
{ "type": "create_room", "name": "玩家A" }
{ "type": "join_room", "roomCode": "AB12CD", "name": "玩家B" }
{ "type": "add_ai", "roomCode": "AB12CD" }
{ "type": "start_game", "roomCode": "AB12CD" }
{ "type": "claim_card", "roomCode": "AB12CD", "cardIdx": 2 }
{ "type": "choose_lock", "roomCode": "AB12CD", "lock": true }
{ "type": "submit_bid", "roomCode": "AB12CD", "bid": 4 }
```

服务端消息:

```json
{ "type": "hello", "connectionId": "..." }
{ "type": "room_state", "room": { "code": "AB12CD", "status": "lobby", "seats": [] } }
{ "type": "game_state", "state": { "phase": "draft", "pos": "PG", "stage": 1 } }
{ "type": "bid_request", "minBid": 3, "maxBid": 12 }
{ "type": "error", "code": "not_your_turn", "message": "当前不是你的回合" }
```

## 测试计划

- 服务端:
  - `/health` 返回 `200` 和 JSON。
  - WebSocket `/ws` 可以握手、收到 `hello`、回复 `ping/pong`。
  - 房间码创建、加入、房主手动添加/移除 AI、满员限制、断线重连。
  - 非当前玩家动作会被拒绝。
  - 金币守恒: 每个经理 `coinsLeft + coinsSpent = 15`。
- 前端:
  - 单机入口不受影响。
  - 2 真人无 AI 能完整跑到结算。
  - 2 真人 + 房主手动添加 1-3 个 AI 能完整跑到结算。
  - 5 真人无 AI 能完整跑到结算。
  - 断线后 AI 托管，重连后接回座位。
- 部署:
  - `curl http://127.0.0.1:3001/health` 在服务器成功。
  - `curl http://143.20.149.27/allstar/health` 通过 nginx 成功。
  - 正式域名 SSL 配好后，浏览器可连 `wss://域名/allstar/ws`。

## 服务器当前配置

- 服务器: `143.20.149.27`
- SSH: `codexdeploy@143.20.149.27 -p 59227`
- Node: 宝塔自带 `/www/server/nodejs/v22.19.0/bin/node`
- 服务目录: `/opt/allstar-showdown-server`（当前服务版本 `0.3.7`）
- systemd: `allstar-showdown.service`
- 本地监听: `127.0.0.1:3001`
- nginx 代理路径: `/allstar/`
- HTTPS/WSS: 系统 nginx 读取 `/etc/nginx/conf.d/mofi1994-allstar.conf`，监听 80/443 并使用宝塔证书目录。
- 注意: 宝塔 nginx 当前未运行；`node_SillyTavern.conf` 的入口和后端都占用 8000，直接启动会端口冲突。全明星代理独立配置在系统 nginx，未改动 SillyTavern 进程。

## 后续上线前必须确认

- 绑定一个域名到服务器。
- 在宝塔为域名申请 SSL。
- 把 nginx 的 `/allstar/` 代理挂到该 SSL 站点。
- 前端配置 WebSocket 地址为 `wss://域名/allstar/ws`。
