# 斗地主 🃏 联机部署操作指南

## 环境要求

- **Node.js** ≥ 18（当前用 fnm 管理 v24.15.0）
- **pnpm**（项目包管理器）
- **ngrok**（内网穿透工具，已安装 v3.39.2）

## 一键启动（完整命令）

在 **项目根目录** `H:\doudizhu` 下执行以下两条命令（**先开服务，再开隧道**）：

### 1️⃣ 启动游戏服务器

```bash
pnpm --filter server dev
```

服务器默认运行在 `http://localhost:3001`，终端会输出：

```
Doudizhu server running on port 3001
```

> **注意：** 这个命令会保持前台运行（tsx watch 模式，代码修改自动重启）。需要让它一直在后台就另开一个终端窗口，或使用 `nohup` / 后台运行。

### 2️⃣ 启动 ngrok 隧道（新开一个终端）

```bash
ngrok http 3001
```

输出中会看到：

```
url=https://xxxx-xxxx-xxx.ngrok-free.dev
```

那个 `https://...ngrok-free.dev` 地址就是你的公网联机入口。

---

## 分步说明

### 如果依赖还没装

```bash
pnpm install
```

### 如果客户端代码有改动，需要重新构建

```bash
pnpm --filter client build
```

> 服务器直接静态托管 `client/dist/` 目录，所以改了前端一定要 build 一次。

### 如果 ngrok 提示需要 authtoken

```bash
ngrok config add-authtoken 你的token
```

当前 token 已配置在 `C:\Users\西城望月\AppData\Local\ngrok\ngrok.yml`，一般不需要重复执行。

---

## 调试

| 工具 | 地址 | 用途 |
|------|------|------|
| 本地服务 | `http://localhost:3001` | 本地直接访问 |
| ngrok 公网 | `https://xxxx.ngrok-free.dev` | 发给朋友联机用 |
| ngrok 检查台 | `http://127.0.0.1:4040` | 查看所有 HTTP/WebSocket 请求详情 |

---

## 注意事项

1. **ngrok 免费版**每次重启会分配**不同的公网地址**，需要重新分享给联机小伙伴
2. WebSocket 连接会自动适配 `wss://`（通过 ngrok 的 HTTPS 转发），兼容性好
3. 服务器是用 `tsx watch` 运行的，如果改 `server/src/` 下的代码，会自动重启生效
4. 如果遇到端口冲突，可以设置环境变量 `PORT=xxxx` 指定其他端口

---

## 停止服务

### 方式一：手动停止（推荐）

在各自终端窗口按 `Ctrl + C`：

1. **服务器终端** → 按 `Ctrl + C` 关掉 tsx / node 进程
2. **ngrok 终端** → 按 `Ctrl + C` 关掉隧道

### 方式二：强制结束所有

如果终端已经关了或者进程卡死了：

```bash
# 停 ngrok（根据 PID）
ngrok kill

# 停游戏服务器（根据端口）
# Windows:
netstat -ano | findstr :3001
taskkill /PID <进程ID> /F

# 或用一行命令杀端口
# Windows PowerShell:
# Stop-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess -Force
```

### 方式三：一键重启（先停旧的再开新的）

```bash
ngrok kill
# 再重新 ngrok http 3001
```

---

## 常见问题

### ngrok 提示 "隧道已存在"

先杀掉旧隧道再开新的：

```bash
ngrok kill
ngrok http 3001
```

### 端口 3001 被占用

换个端口启动：

```bash
PORT=3002 pnpm --filter server dev
# ngrok 也要跟着改
ngrok http 3002
```

### 客户端页面空白或样式不对

重新构建前端：

```bash
pnpm --filter client build
```
