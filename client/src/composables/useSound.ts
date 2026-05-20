/**
 * 欢乐斗地主风格音效 — 使用 Web Audio API 合成
 * 所有声音都在浏览器中实时合成，无需外部音频文件
 */

// 中国五声音阶（宫商角徵羽）频率表
const PENTATONIC = {
  C4: [261.63, 293.66, 329.63, 392.00, 440.00], // 宫商角徵羽
  C5: [523.25, 587.33, 659.25, 783.99, 880.00],
  C6: [1046.50, 1174.66, 1318.51, 1567.98, 1760.00],
}

let audioCtx: AudioContext | null = null
let masterGain: GainNode | null = null
let bgmInterval: ReturnType<typeof setInterval> | null = null
let isBgmPlaying = false
let bgmGain: GainNode | null = null

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext()
    masterGain = audioCtx.createGain()
    masterGain.gain.value = 0.5
    masterGain.connect(audioCtx.destination)
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx
}

function getMaster(): GainNode {
  getCtx()
  return masterGain!
}

/** 创建包络线 */
function createEnvelope(
  ctx: AudioContext,
  startTime: number,
  attack: number,
  decay: number,
  sustain: number,
  release: number,
  sustainLevel = 0.6,
): GainNode {
  const env = ctx.createGain()
  env.gain.setValueAtTime(0, startTime)
  env.gain.linearRampToValueAtTime(1, startTime + attack)
  env.gain.linearRampToValueAtTime(sustainLevel, startTime + attack + decay)
  env.gain.setValueAtTime(sustainLevel, startTime + attack + decay + sustain)
  env.gain.linearRampToValueAtTime(0, startTime + attack + decay + sustain + release)
  return env
}

/** 播放一个乐音 */
function playNote(
  freq: number,
  duration: number,
  type: OscillatorType = 'triangle',
  delay = 0,
  gainValue = 0.15,
) {
  const ctx = getCtx()
  const master = getMaster()
  const now = ctx.currentTime + delay

  const osc = ctx.createOscillator()
  osc.type = type
  osc.frequency.value = freq

  const noteGain = ctx.createGain()
  noteGain.gain.setValueAtTime(0, now)
  noteGain.gain.linearRampToValueAtTime(gainValue, now + 0.02)
  noteGain.gain.linearRampToValueAtTime(gainValue * 0.7, now + 0.08)
  noteGain.gain.linearRampToValueAtTime(0, now + duration)

  osc.connect(noteGain)
  noteGain.connect(master)
  osc.start(now)
  osc.stop(now + duration + 0.05)
}

/** 背景音乐 — 欢乐中国风旋律 */
const BGM_NOTES = [
  // 第一小节
  [PENTATONIC.C5[4], 0.3], // 羽
  [PENTATONIC.C5[2], 0.3], // 角
  [PENTATONIC.C5[3], 0.3], // 徵
  [PENTATONIC.C5[4], 0.3], // 羽
  [PENTATONIC.C5[3], 0.3], // 徵
  [PENTATONIC.C5[2], 0.3], // 角
  [PENTATONIC.C5[1], 0.3], // 商
  [PENTATONIC.C5[0], 0.3], // 宫
  // 第二小节
  [PENTATONIC.C5[0], 0.4], // 宫
  [PENTATONIC.C5[1], 0.2], // 商
  [PENTATONIC.C5[2], 0.4], // 角
  [PENTATONIC.C5[1], 0.2], // 商
  [PENTATONIC.C5[3], 0.6], // 徵
  [PENTATONIC.C5[2], 0.4], // 角
  // 第三小节
  [PENTATONIC.C5[4], 0.3], // 羽
  [PENTATONIC.C5[4], 0.2], // 羽
  [PENTATONIC.C5[3], 0.3], // 徵
  [PENTATONIC.C5[2], 0.2], // 角
  [PENTATONIC.C5[3], 0.4], // 徵
  [PENTATONIC.C5[4], 0.4], // 羽
  [PENTATONIC.C5[3], 0.4], // 徵
  [PENTATONIC.C5[2], 0.4], // 角
  // 第四小节
  [PENTATONIC.C5[1], 0.4], // 商
  [PENTATONIC.C5[2], 0.3], // 角
  [PENTATONIC.C5[3], 0.5], // 徵
  [PENTATONIC.C5[4], 0.6], // 羽（延长）
]

function playBgmPhrase(startTime: number, speed = 1) {
  const ctx = getCtx()
  let t = startTime
  for (const [freq, dur] of BGM_NOTES) {
    const noteDur = (dur as number) * speed
    // 主旋律：方波
    if (!audioCtx) return
    const osc = ctx.createOscillator()
    osc.type = 'square'
    osc.frequency.value = freq as number

    const noteGain = ctx.createGain()
    noteGain.gain.setValueAtTime(0, t)
    noteGain.gain.linearRampToValueAtTime(0.06, t + 0.02)
    noteGain.gain.linearRampToValueAtTime(0.03, t + 0.06)
    noteGain.gain.setValueAtTime(0.03, t + noteDur - 0.04)
    noteGain.gain.linearRampToValueAtTime(0, t + noteDur)

    osc.connect(noteGain)
    noteGain.connect(getMaster())
    osc.start(t)
    osc.stop(t + noteDur + 0.02)

    // 伴奏：五度叠加（三角波，低八度）
    const bassOsc = ctx.createOscillator()
    bassOsc.type = 'triangle'
    bassOsc.frequency.value = (freq as number) / 2

    const bassGain = ctx.createGain()
    bassGain.gain.setValueAtTime(0, t)
    bassGain.gain.linearRampToValueAtTime(0.04, t + 0.03)
    bassGain.gain.linearRampToValueAtTime(0.02, t + 0.08)
    bassGain.gain.setValueAtTime(0.02, t + noteDur - 0.05)
    bassGain.gain.linearRampToValueAtTime(0, t + noteDur)

    bassOsc.connect(bassGain)
    bassGain.connect(getMaster())
    bassOsc.start(t)
    bassOsc.stop(t + noteDur + 0.02)

    // 打击乐：每拍一个短促噪音
    if (Math.random() < 0.3) {
      const noise = ctx.createOscillator()
      noise.type = 'sawtooth'
      noise.frequency.value = 80 + Math.random() * 40
      const noiseGain = ctx.createGain()
      noiseGain.gain.setValueAtTime(0.02, t)
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06)
      noise.connect(noiseGain)
      noiseGain.connect(getMaster())
      noise.start(t)
      noise.stop(t + 0.08)
    }

    t += noteDur
  }
}

/** 启动背景音乐 */
export function startBgm() {
  if (isBgmPlaying) return
  isBgmPlaying = true
  const ctx = getCtx()

  const playLoop = () => {
    if (!isBgmPlaying) return
    const now = ctx.currentTime
    playBgmPhrase(now + 0.1, 0.9)
    // 间隔约2.1秒后播下一段
    bgmInterval = setTimeout(playLoop, 4200)
  }

  playLoop()
}

/** 停止背景音乐 */
export function stopBgm() {
  isBgmPlaying = false
  if (bgmInterval) {
    clearTimeout(bgmInterval)
    bgmInterval = null
  }
}

// ===== 音效 =====

/** 出牌音效 — 短促的"唰"声 */
export function playCardSound() {
  const ctx = getCtx()
  const master = getMaster()
  const now = ctx.currentTime

  // 噪音爆破
  const bufferSize = ctx.sampleRate * 0.08
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize)
  }
  const noise = ctx.createBufferSource()
  noise.buffer = buffer

  const noiseGain = ctx.createGain()
  noiseGain.gain.setValueAtTime(0.08, now)
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06)

  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 3000
  filter.Q.value = 0.5

  noise.connect(filter)
  filter.connect(noiseGain)
  noiseGain.connect(master)
  noise.start(now)
  noise.stop(now + 0.08)

  // 同时弹一个高音
  const ping = ctx.createOscillator()
  ping.type = 'triangle'
  ping.frequency.value = 1800
  const pingGain = ctx.createGain()
  pingGain.gain.setValueAtTime(0.04, now)
  pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04)
  ping.connect(pingGain)
  pingGain.connect(master)
  ping.start(now)
  ping.stop(now + 0.05)
}

/** 选牌音效 — 轻快的"叮" */
export function playSelectSound() {
  const ctx = getCtx()
  const master = getMaster()
  const now = ctx.currentTime

  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.value = 1200

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.04, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06)

  osc.connect(gain)
  gain.connect(master)
  osc.start(now)
  osc.stop(now + 0.08)
}

/** 过牌音效 — 短促低音 */
export function playPassSound() {
  const ctx = getCtx()
  const master = getMaster()
  const now = ctx.currentTime

  const osc = ctx.createOscillator()
  osc.type = 'sawtooth'
  osc.frequency.value = 200

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.03, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)

  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 400

  osc.connect(filter)
  filter.connect(gain)
  gain.connect(master)
  osc.start(now)
  osc.stop(now + 0.2)
}

/** 叫分音效 — 短号声 */
export function playCallSound(score: number) {
  const ctx = getCtx()
  const master = getMaster()
  const now = ctx.currentTime
  const baseFreq = 400 + score * 150

  for (let i = 0; i < 2; i++) {
    const osc = ctx.createOscillator()
    osc.type = 'square'
    osc.frequency.value = baseFreq + i * 50

    const gain = ctx.createGain()
    const t = now + i * 0.08
    gain.gain.setValueAtTime(0.03, t)
    gain.gain.linearRampToValueAtTime(0.05, t + 0.04)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2)

    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = baseFreq + i * 50
    filter.Q.value = 5

    osc.connect(filter)
    filter.connect(gain)
    gain.connect(master)
    osc.start(t)
    osc.stop(t + 0.25)
  }
}

/** 地主确定音效 — 胜利号角 */
export function playLandlordSound() {
  const ctx = getCtx()
  const master = getMaster()
  const now = ctx.currentTime

  const notes = [523, 659, 784, 1047]
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    osc.type = 'triangle'
    osc.frequency.value = freq

    const gain = ctx.createGain()
    const t = now + i * 0.12
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.08, t + 0.05)
    gain.gain.linearRampToValueAtTime(0.05, t + 0.1)
    gain.gain.linearRampToValueAtTime(0, t + 0.4)

    osc.connect(gain)
    gain.connect(master)
    osc.start(t)
    osc.stop(t + 0.45)
  })
}

/** 胜利音效 — 欢快上行 */
export function playWinSound() {
  const ctx = getCtx()
  const master = getMaster()
  const now = ctx.currentTime

  const melody = [
    [PENTATONIC.C5[0], 0.12],
    [PENTATONIC.C5[1], 0.12],
    [PENTATONIC.C5[2], 0.12],
    [PENTATONIC.C5[3], 0.12],
    [PENTATONIC.C5[4], 0.15],
    [PENTATONIC.C6[0], 0.15],
    [PENTATONIC.C6[1], 0.20],
    [PENTATONIC.C6[2], 0.35],
  ]

  let t = now
  for (const [freq, dur] of melody) {
    const osc = ctx.createOscillator()
    osc.type = 'triangle'

    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.08, t + 0.02)
    g.gain.setValueAtTime(0.06, t + (dur as number) - 0.04)
    g.gain.linearRampToValueAtTime(0, t + (dur as number))

    // 叠加第二声部（三度）
    const osc2 = ctx.createOscillator()
    osc2.type = 'sine'
    osc2.frequency.value = (freq as number) * 1.25

    const g2 = ctx.createGain()
    g2.gain.setValueAtTime(0, t)
    g2.gain.linearRampToValueAtTime(0.04, t + 0.02)
    g2.gain.setValueAtTime(0.03, t + (dur as number) - 0.04)
    g2.gain.linearRampToValueAtTime(0, t + (dur as number))

    osc.frequency.value = freq as number
    osc.connect(g)
    g.connect(master)
    osc.start(t)
    osc.stop(t + (dur as number) + 0.02)

    osc2.connect(g2)
    g2.connect(master)
    osc2.start(t)
    osc2.stop(t + (dur as number) + 0.02)

    t += dur as number
  }
}

/** 失败音效 — 下行叹息 */
export function playLoseSound() {
  const ctx = getCtx()
  const master = getMaster()
  const now = ctx.currentTime

  const melody = [
    [PENTATONIC.C5[3], 0.2],
    [PENTATONIC.C5[1], 0.2],
    [PENTATONIC.C4[4], 0.2],
    [PENTATONIC.C4[2], 0.3],
    [PENTATONIC.C4[0], 0.5],
  ]

  let t = now
  for (const [freq, dur] of melody) {
    const osc = ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.value = freq as number

    const g = ctx.createGain()
    g.gain.setValueAtTime(0.04, t)
    g.gain.linearRampToValueAtTime(0, t + (dur as number))

    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 600

    osc.connect(filter)
    filter.connect(g)
    g.connect(master)
    osc.start(t)
    osc.stop(t + (dur as number) + 0.02)

    t += dur as number
  }
}

/** 发牌音效 — 快速卡牌声 */
export function playDealSound() {
  const ctx = getCtx()
  const master = getMaster()
  const now = ctx.currentTime

  for (let i = 0; i < 3; i++) {
    const osc = ctx.createOscillator()
    osc.type = 'square'
    osc.frequency.value = 600 + Math.random() * 400

    const g = ctx.createGain()
    const t = now + i * 0.06
    g.gain.setValueAtTime(0.02, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.04)

    osc.connect(g)
    g.connect(master)
    osc.start(t)
    osc.stop(t + 0.05)
  }
}

/** 初始化音频上下文（需要在用户交互后调用） */
export function initAudio() {
  getCtx()
}

/** 设置主音量 (0-1) */
export function setVolume(v: number) {
  if (masterGain) {
    masterGain.gain.value = Math.max(0, Math.min(1, v))
  }
}
