# 斗地主 — 房间管理 + AI 玩家设计

## 概述

房间从「自动开局」改为「手动开局」模式。

- 房主可在等待界面手动添加 AI 玩家
- 真人玩家通过房间号联机加入
- 房主点击「开始游戏」自动用 AI 补齐空位后发牌
- AI 具备中等智能（手牌评估叫分、基本出牌策略）

---

## 架构

### 数据流

```
Client                          Server
  │                               │
  │── add_ai ──────────────────►  │  添加 AI 到空位
  │                               │── broadcast room_state
  │                               │
  │── start_game ──────────────►  │  补齐空位 → 发牌
  │                               │── broadcast game_start/deal/etc
  │                               │
  │  (游戏中 AI 决策全在服务端)    │
  │                               │── AI 自动 call_score
  │                               │── AI 自动 play_cards
```

### AI 集成方式

AI 不占用 WebSocket 连接，由服务端 `Room` 内部调度：

- `CreatedPlayer.aiControlled = true`
- 服务端在需要 AI 行动时（`next_caller` / `next_turn`），直接调用 AI 逻辑模块，模拟发消息
- 对客户端透明：客户端收到的消息和真人玩家完全一致

---

## 服务端改动

### 1. Room 类变化

**删除自动开局逻辑：**
- `join_room` 中不再检查 `playerCount === 3` 自动调 `startGame`

**新增消息处理：**

#### `add_ai`
- 仅房主可调用
- 找第一个空位（`players.length < 3`）
- 创建 `CreatedPlayer`，`aiControlled = true`
- `broadcastRoomState()`

#### `start_game`
- 仅房主可调用
- 检查 `players.length >= 1`（至少 1 个真人）
- 自动创建 AI 补齐到 3 人
- 调用原有的 `startGame()` 发牌逻辑

### 2. AI 模块 (`server/src/game/ai-player.ts`)

独立模块，由 Room 在需要时调用：

```typescript
export function aiCall(hand: Card[], callScores: Record<string, number>): 0 | 1 | 2 | 3
export function aiPlay(hand: Card[], lastPlay: { playerId: string; cards: Card[] } | null): Card[]
```

#### AI 叫分策略

1. 统计手牌中炸弹数量，每炸弹 +1 分
2. 统计 2 的数量，每张 2 +0.5 分
3. 统计 A 的数量，每张 A +0.3 分
4. 总分 >= 2 → 叫 3 分；>= 1 → 叫 2 分；>= 0.5 → 叫 1 分；否则不叫
5. 额外规则：如果自己是最后一家且没人叫过 → 强叫 1 分

#### AI 出牌策略

优先级：
1. 如果能一次性出完 → 直接出完
2. 如果必须管上家的牌 → 找出最小的能管上的牌型出
3. 如果自由出牌（无人需要管）→ 按优先级出：
   - 先出单张（从小到大）
   - 再出对子
   - 再出三带
   - 再出顺子
   - 保留炸弹到最后
4. 如果管不上 → 出空数组（过牌）
5. 特殊规则：只剩 1 张时拆任何牌型出单张

### 3. Room 集成 AI

在 `handleCallScore` / `handlePlayCards` 推进到下一个玩家后，检查该玩家是否是 AI。
若是 AI，则不启动 15s 超时，而是延迟约 1 秒后自动执行 AI 决策；若是真人，正常启动超时。

**修改 `startCallTimer`：**
进入计时前先判断当前玩家是否为 AI，若是则改调 `scheduleAiAction` 而非启动倒计时。

```typescript
private scheduleNextAction() {
  if (!this.game) return
  const idx = this.game.phase === 'calling' ? this.game.currentCallIndex : this.game.currentPlayerIndex
  const player = this.players[idx]
  if (player?.aiControlled) {
    // AI 玩家：延迟 0.8~1.4 秒模仿人类操作
    setTimeout(() => this.runAiAction(), 800 + Math.random() * 600)
  } else {
    // 真人玩家：启动超时倒计时
    this.startCallTimer()
  }
}

private runAiAction() {
  if (!this.game) return
  if (this.game.phase === 'calling') {
    const player = this.players[this.game.currentCallIndex]
    if (!player?.aiControlled) return
    const score = aiCall(player.cards, this.game.callScores)
    this.handleCallScore(player.id, score)
  } else if (this.game.phase === 'playing') {
    const player = this.players[this.game.currentPlayerIndex]
    if (!player?.aiControlled) return
    const cards = aiPlay(player.cards, this.game.lastPlay)
    this.handlePlayCards(player.id, cards)
  }
}
```

**改动点：**
- `startGame()` 末尾调 `scheduleNextAction()` 代替 `startCallTimer()`
- `handleCallScore` 中推进到下家后调 `scheduleNextAction()` 代替 `startCallTimer()`
- `handlePlayCards` + `advanceTurn` 中推进到下家后调 `scheduleNextAction()`（playing 阶段只需检查 AI，超时后续可加）
- `setLandlord` 中清理所有定时器

### 4. 真人超时

已实现的 15 秒超时自动不叫保留，仅真人玩家触发。AI 玩家不启动超时。

---

## 客户端改动

### 1. 等待房间 UI

在 `GameRoom.vue` 中增加「等待房间」视图，在 `phase === 'waiting'` 时显示：

```
┌─────────────────────────────┐
│      房间号: ABC123          │
│                             │
│  [P1 你]  [空位 +AI]  [空位 +AI] │
│                             │
│        [开始游戏]             │
└─────────────────────────────┘
```

- **座位显示**：3 个座位横向排列
  - 已占座位显示玩家头像/昵称，标注「AI」或「你」
  - 空位显示灰色占位框
  - 空位的「+AI」按钮仅房主可见
- **开始游戏按钮**：仅房主可见，至少 1 个真人时可用
- **房间号**：顶部显示，方便分享

### 2. 游戏中 AI 显示

- AI 玩家的 UI 和真人玩家一致
- 昵称标注 `[AI]` 后缀
- 出牌、叫分等行为和真人完全一致（消息格式相同）

### 3. 消息处理新增

```typescript
case 'room_state':
  room.state = payload
  // 新增：更新本地 players 数据，用于 UI 显示
  break
// 无需新增其他消息类型，AI 操作通过已有消息通道展示
```

---

## 消息新增

| 消息 | 方向 | 说明 |
|------|------|------|
| `add_ai` | Client → Server | 房主添加 AI，payload: `{}` |
| `start_game` | Client → Server | 房主手动开始，payload: `{}` |

---

## 边界情况

1. **房主离开**：转移房主给下一个真人玩家，若无真人则解散房间
2. **真人中途断开**：保留座位 30 秒，超时后踢出（后续可做 AI 代打）
3. **游戏中加 AI**：不允许，加 AI 只能在 waiting 阶段
4. **AI 替换真人**：暂不支持，真人断开只保留等待重连

---

## 测试

1. `ai-player.test.ts`：覆盖 AI 叫分和出牌策略
   - 手牌含炸弹 → 叫 3 分
   - 手牌差 → 不叫
   - 自由出牌 → 从小出起
   - 需要管牌 → 出最小能管的
2. 集成测试：模拟房主加 AI → 开始游戏 → AI 完成叫分出牌全流程
