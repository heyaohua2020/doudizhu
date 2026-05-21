# 斗地主 🃏 联机部署操作指南

## 环境要求

- **Node.js** ≥ 18（当前用 fnm 管理 v24.15.0）
- **pnpm**（项目包管理器）
- **ngrok**（内网穿透工具，推荐方案，已验证可用）
- ~~cloudflared~~（国内网络连不上 Cloudflare API，慎用）

---

## 一键启动（完整命令）

在 **项目根目录** `H:\doudizhu` 下执行以下步骤。

### 0️⃣ 首次准备工作

装依赖 + 构建前端：

```bash
pnpm install
pnpm --filter client build
```

> 以后如果改了前端代码，记得重新 `pnpm --filter client build`。

### 1️⃣ 启动游戏服务器

```bash
pnpm --filter server dev
```

服务器默认运行在 **`http://localhost:3001`**，终端输出：

```
Doudizhu server running on port 3001
```

> ⚠️ 这个命令会保持前台运行，不要关。需要同时做其他操作就新开一个终端窗口。

### 2️⃣ 启动 ngrok 隧道（新开一个终端）

```bash
ngrok http 3001
```

输出中会看到：

```
url=https://xxxx-xxxx-xxx.ngrok-free.dev
```

那个 **`https://...ngrok-free.dev`** 地址就是你的公网联机入口，发给朋友就行了。

---

## 调试面板

| 工具 | 地址 | 用途 |
|------|------|------|
| 本地服务 | `http://localhost:3001` | 本地直接访问 |
| ngrok 公网 | `https://xxxx.ngrok-free.dev` | 发给朋友联机用 |
| ngrok 检查台 | `http://127.0.0.1:4040` | 查看所有 HTTP/WebSocket 请求详情 |

---

## 停止服务

### 方式一：手动停止（推荐）

在各自终端窗口按 `Ctrl + C`：

1. **服务器终端** → 按 `Ctrl + C` 关掉 tsx / node 进程
2. **ngrok 终端** → 按 `Ctrl + C` 关掉隧道

### 方式二：强制结束

如果终端已经关了或者进程卡死了：

```bash
# 停 ngrok
ngrok kill

# 停游戏服务器
netstat -ano | findstr :3001
taskkill /PID <进程ID> /F
```

---

## 注意事项

1. **ngrok 免费版**每次重启会分配**不同的公网地址**，需要重新分享给联机小伙伴
2. WebSocket 连接会自动适配 `wss://`（通过 ngrok 的 HTTPS 转发），客户端不需要改代码
3. 服务器是用 `tsx watch` 运行的，改了 `server/src/` 下的代码会自动重启
4. 端口冲突时设环境变量 `PORT=3002` 换端口，ngrok 也要跟着改

---

## 备选：Cloudflare Tunnel

之前试过用 `cloudflared` 的 TryCloudflare 免费隧道，但由于中国大陆网络环境限制，`api.cloudflare.com` 返回 403，隧道建立失败。如果后续网络条件允许，可以尝试：

```bash
# 安装 cloudflared
# 已下载到 C:\Users\西城望月\AppData\Local\cloudflared\cloudflared.exe

# 启动临时隧道
cloudflared tunnel --url http://localhost:3001
```

成功的话会输出 `https://xxxx.trycloudflare.com` 格式的地址。
