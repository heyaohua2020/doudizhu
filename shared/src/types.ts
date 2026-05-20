// ===== 牌相关 =====

/** 牌面点数，2 最大，3 最小 */
export const RANK_VALUES = {
  '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14, '2': 15,
  'SMALL_JOKER': 16, 'BIG_JOKER': 17
} as const

export type Rank = keyof typeof RANK_VALUES
export type Suit = 'spade' | 'heart' | 'club' | 'diamond'
export type JokerType = 'small' | 'big'

export interface Card {
  suit?: Suit
  rank: Rank
  jokerType?: JokerType
}

export type CardList = Card[]

// ===== 牌型 =====

export type PatternType =
  | 'single'          // 单张
  | 'pair'            // 对子
  | 'triple'          // 三张
  | 'triple_one'      // 三带一
  | 'triple_pair'     // 三带二
  | 'straight'        // 顺子 >=5张
  | 'double_straight' // 连对 >=3对
  | 'airplane'        // 飞机(不带)
  | 'airplane_single' // 飞机带单
  | 'airplane_pair'   // 飞机带对
  | 'four_two_single' // 四带二单
  | 'four_two_pair'   // 四带二对
  | 'bomb'            // 炸弹
  | 'rocket'          // 火箭

export interface PatternResult {
  type: PatternType
  rank: number        // 主牌点数（用于比较大小）
  length: number      // 主牌长度（用于校验顺子/连对/飞机长度）
}

// ===== 游戏流程 =====

export type GamePhase = 'waiting' | 'calling' | 'playing' | 'ended'

export interface Player {
  id: string
  nickname: string
  cards: CardList
  isLandlord: boolean
  isReady: boolean
}

export interface RoomState {
  id: string
  players: Player[]
  owner: string       // 房主 player id
  phase: GamePhase
  settings: {
    maxPlayers: number
    baseScore: number
  }
}

// ===== WebSocket 消息 =====

export interface WSMessage {
  type: string
  payload: Record<string, unknown>
  timestamp: number
}

export interface JoinRoomPayload {
  roomId: string
  nickname: string
}

export interface CallScorePayload {
  score: 0 | 1 | 2 | 3
}

export interface PlayCardsPayload {
  cards: CardList
}
