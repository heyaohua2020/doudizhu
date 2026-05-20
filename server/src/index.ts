import http from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import { createRoom, getRoom, deleteRoom, Room } from './game/room-manager'
import type { Card } from '@doudizhu/shared'

const PORT = parseInt(process.env.PORT ?? '3001', 10)

const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('Doudizhu Server')
})

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
