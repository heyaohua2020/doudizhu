import http from 'http'
import fs from 'fs'
import path from 'path'
import { WebSocketServer, WebSocket } from 'ws'
import { createRoom, getRoom, deleteRoom, Room } from './game/room-manager'
import type { Card } from '@doudizhu/shared'

const PORT = parseInt(process.env.PORT ?? '3001', 10)
const CLIENT_DIR = path.resolve(import.meta.dirname ?? __dirname, '../../client/dist')

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

const server = http.createServer((req, res) => {
  // WebSocket 升级由 ws 库处理，这里只处理 HTTP
  if (req.url === '/') {
    serveFile('/index.html', res)
    return
  }
  serveFile(req.url ?? '/index.html', res)
})

function serveFile(urlPath: string, res: http.ServerResponse) {
  // 安全处理：防止路径遍历
  const safePath = path.normalize(urlPath).replace(/^[/\\]+/, '')
  const filePath = path.join(CLIENT_DIR, safePath)

  if (!filePath.startsWith(CLIENT_DIR)) {
    res.writeHead(403)
    res.end('Forbidden')
    return
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // SPA fallback: 返回 index.html
      fs.readFile(path.join(CLIENT_DIR, 'index.html'), (err2, indexData) => {
        if (err2) {
          res.writeHead(500)
          res.end('Internal Server Error')
          return
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end(indexData)
      })
      return
    }
    const ext = path.extname(filePath).toLowerCase()
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] ?? 'application/octet-stream' })
    res.end(data)
  })
}

const wss = new WebSocketServer({ server })

wss.on('connection', (ws: WebSocket) => {
  let currentRoom: Room | null = null
  let playerId: string | null = null

  ws.on('message', (raw) => {
    let msg: any
    try {
      msg = JSON.parse(raw.toString())
    } catch {
      return
    }

    const { type, payload = {} } = msg

    switch (type) {
      case 'create_room': {
        if (currentRoom) return
        const room = createRoom()
        const player = room.addPlayer(payload.nickname ?? 'Player', {
          send: (d) => ws.send(d),
        })
        currentRoom = room
        playerId = player.id
        ws.send(JSON.stringify({
          type: 'room_created',
          payload: { roomId: room.id, playerId: player.id },
        }))
        break
      }

      case 'join_room': {
        if (currentRoom) return
        const room = getRoom(payload.roomId)
        if (!room) {
          ws.send(JSON.stringify({ type: 'error', payload: { message: '房间不存在' } }))
          return
        }
        if (room.playerCount >= 3) {
          ws.send(JSON.stringify({ type: 'error', payload: { message: '房间已满' } }))
          return
        }
        if (room.game && room.game.phase !== 'waiting') {
          ws.send(JSON.stringify({ type: 'error', payload: { message: '游戏已开始' } }))
          return
        }
        const player = room.addPlayer(payload.nickname ?? 'Player', {
          send: (d) => ws.send(d),
        })
        currentRoom = room
        playerId = player.id
        ws.send(JSON.stringify({
          type: 'room_joined',
          payload: { roomId: room.id, playerId: player.id },
        }))
        room.broadcastRoomState()
        break
      }

      case 'add_ai': {
        if (!currentRoom || !playerId) return
        const ok = currentRoom.handleAddAi(playerId)
        if (!ok) {
          ws.send(JSON.stringify({ type: 'error', payload: { message: '无法添加AI' } }))
        }
        break
      }

      case 'single_player_start': {
        if (currentRoom) return
        const room = createRoom()
        const result = room.handleSinglePlayerStart(payload.nickname ?? '玩家')
        // 先设置真实 session，再开始游戏，确保 deal_cards 能送达
        room.setPlayerSession(result.playerId, {
          send: (d) => ws.send(d),
        })
        currentRoom = room
        playerId = result.playerId
        ws.send(JSON.stringify({
          type: 'room_created',
          payload: { roomId: room.id, playerId: result.playerId },
        }))
        // 现在开始游戏
        room.startGame()
        break
      }

      case 'start_game': {
        if (!currentRoom || !playerId) return
        const ok = currentRoom.handleStartGame(playerId)
        if (!ok) {
          ws.send(JSON.stringify({ type: 'error', payload: { message: '无法开始游戏' } }))
        }
        break
      }

      case 'call_score': {
        if (!currentRoom || !playerId) return
        currentRoom.handleCallScore(playerId, payload.score)
        break
      }

      case 'play_cards': {
        if (!currentRoom || !playerId) return
        currentRoom.handlePlayCards(playerId, payload.cards as Card[])
        break
      }

      case 'leave_room': {
        if (!currentRoom || !playerId) return
        currentRoom.removePlayer(playerId)
        currentRoom.broadcastRoomState()
        if (currentRoom.playerCount === 0) {
          deleteRoom(currentRoom.id)
        }
        currentRoom = null
        playerId = null
        break
      }
    }
  })

  ws.on('close', () => {
    if (currentRoom && playerId) {
      currentRoom.removePlayer(playerId)
      currentRoom.broadcastRoomState()
      if (currentRoom.playerCount === 0) {
        deleteRoom(currentRoom.id)
      }
    }
  })
})

server.listen(PORT, () => {
  console.log(`Doudizhu server running on port ${PORT}`)
})
