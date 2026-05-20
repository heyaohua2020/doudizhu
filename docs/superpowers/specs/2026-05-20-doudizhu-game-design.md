# 斗地主联机游戏 — 设计文档

## 概述

Web 版联机斗地主游戏，主打"开房跟朋友玩"，无需注册登录，进房间起个昵称就能开打。

## 技术栈

| 层 | 选型 |
|---|---|
| 前端 | Vue 3 + TypeScript + Vite |
| 后端 | Node.js + TypeScript + Express |
| 实时通信 | WebSocket (ws 库) |
| 数据存储 | 纯内存（无数据库） |
| 包管理 | pnpm monorepo |

## 项目结构

```
doudizhu/
├── client/                  # Vue 3 前端
│   ├── src/
│   │   ├── views/               # 页面视图
│   │   │   ├── Home.vue             # 首页（输入昵称 + 创建/加入房间）
│   │   │   ├── GameRoom.vue         # 游戏牌桌
│   │   │   └── ResultModal.vue      # 结算弹窗（内置在 GameRoom）
│   │   ├── components/         # 可复用组件
│   │   │   ├── PokerCard.vue        # 单张扑克牌
│   │   │   ├── PlayerHand.vue       # 玩家手牌
│   │   │   ├── GameBoard.vue        # 牌桌主面板
│   │   │   ├── DizhuBadge.vue       # 地主标识
│   │   │   ├── ChatBox.vue          # 聊天框
│   │   │   ├── EmotePanel.vue       # 表情面板
│   │   │   ├── TimerBar.vue         # 出牌倒计时
│   │   │   └── OpponentPanel.vue    # 对手区域（牌背 + 信息）
│   │   ├── game/               # 游戏逻辑
│   │   │   ├── types.ts            # 前端游戏类型定义
│   │   │   └── constants.ts        # 牌面常量与渲染映射
│   │   └── services/           # 通信层
│   │       └── ws.ts               # WebSocket 客户端封装
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
├── server/                  # Node.js 后端
│   ├── src/
│   │   ├── index.ts              # 入口（Express + WS 启动）
│   │   ├── game/                 # 斗地主核心规则引擎
│   │   │   ├── types.ts              # 游戏类型（牌、牌型、房间状态等）
│   │   │   ├── deck.ts               # 牌组（洗牌、发牌）
│   │   │   ├── card-patterns.ts      # 牌型识别与校验
│   │   │   ├── rules.ts              # 游戏规则（叫地主、出牌、胜负结算）
│   │   │   └── engine.ts             # 游戏引擎（状态机驱动游戏流程）
│   │   ├── ai/                  # AI 出牌逻辑
│   │   │   └── index.ts             # 简单 AI（基于规则）
│   │   ├── room/                # 房间管理（纯内存）
│   │   │   └── index.ts             # 房间 CRUD、玩家管理、游戏生命周期
│   │   └── ws/                  # WebSocket 处理
│   │       ├── handler.ts            # WS 消息分发
│   │       └── types.ts              # WS 消息类型定义
│   ├── tsconfig.json
│   └── package.json
└── shared/                  # 前后端共享类型
    └── types.ts

## 用户流程

1. 打开首页 → 输入昵称 → 选择"创建房间"或"加入房间"
2. 创建房间 → 生成 6 位房间号 → 分享给朋友
3. 朋友输入房间号 → 进入房间
4. 满 3 人 → 房主点击"开始" → 游戏开始
5. 如果不足 3 人，空缺位置由 AI 补齐

## 游戏规则

### 基本流程

3 名玩家，一副 54 张牌（含大小王）。每人 17 张，底牌 3 张。

1. **叫地主阶段**：随机一人先叫，可叫 1 分/2 分/3 分或不叫，下一家可叫更高或不叫。轮流一圈后最高者成为地主。
2. **确定地主**：叫分最高者为地主，获得 3 张底牌
3. **出牌阶段**：地主先出，顺时针轮流出牌，每次必须出大于上家的牌型或选择不要
4. **胜负判定**：某一方出完所有牌即结束，依据地主/农民身份结算

### 牌型定义

支持标准斗地主全部牌型：

- 单张、对子、三张
- 三带一、三带二（对）
- 顺子（5 张起）、连对（3 对起）、飞机（2 个三张起）
- 飞机带单、飞机带对
- 四带二（单）、四带二（对）
- 炸弹（四张同点）、火箭（大小王）

### 结算规则

- 地主胜：农民各扣 1× 底分
- 农民胜：地主扣 2× 底分
- 炸弹翻倍：每出一手炸弹倍率 ×2
- 春天（地主或农民未出过牌）：倍率 ×2
- 最终得分 = 底分 × 倍率（显示在结算面板，纯娱乐不记入任何持久化数据）

## 通信协议

### WebSocket 消息格式

所有消息为 JSON 格式：

```typescript
{
  type: string;       // 消息类型
  payload: object;    // 消息数据
  timestamp: number;  // 时间戳
}
```

### 消息类型

**客户端 → 服务端：**
- `join_room` — 加入房间（{ roomId, nickname }）
- `leave_room` — 离开房间
- `start_game` — 房主开始游戏
- `call_score` — 叫分（0=不叫, 1/2/3）
- `play_cards` — 出牌
- `pass` — 不要
- `chat` — 聊天消息
- `emote` — 发送表情

**服务端 → 客户端：**
- `room_joined` — 加入房间成功
- `room_updated` — 房间内玩家列表变化
- `game_start` — 游戏开始（含手牌）
- `phase_call` — 叫地主阶段
- `call_result` — 叫分结果
- `dizhu_confirmed` — 地主确定（含底牌）
- `your_turn` — 轮到出牌
- `player_played` — 某玩家出了牌
- `player_passed` — 某玩家过牌
- `game_over` — 游戏结束（含结算数据）
- `chat_broadcast` — 聊天广播
- `emote_broadcast` — 表情广播
- `error` — 错误消息

## 游戏引擎状态机

```
WAITING  →  CALLING  →  PLAYING  →  ENDED
                 ↑            │
                 └────────────┘
```

- **WAITING**: 等待玩家加入或房主点击开始
- **CALLING**: 叫地主阶段，按顺序叫分
- **PLAYING**: 出牌阶段，轮流出牌
- **ENDED**: 游戏结束，展示结果，可选择再来一局

## 错误处理

- 所有 WebSocket 消息错误通过 `error` 类型消息返回
- 服务端对每条客户端消息做校验，非法操作返回具体错误原因
- 玩家断线保留 30 秒重连窗口，超时由 AI 接管
- 房主离开房间时转移房主给下一个玩家

## 测试策略

- 游戏规则引擎单元测试（牌型识别、胜负判定、结算逻辑）
- AI 出牌逻辑测试
- WebSocket 消息处理集成测试

## 非功能需求

- 出牌操作响应 < 200ms（不含网络延迟）
- 出牌超时 30 秒，超时自动过牌
- WebSocket 断线重连
