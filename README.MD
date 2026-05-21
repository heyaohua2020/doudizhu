# 斗地主 🃏 联机部署操作指南

## 环境要求

- **Node.js** ≥ 18（当前用 fnm 管理 v24.15.0）
- **pnpm**（项目包管理器）
- **ngrok**（内网穿透工具，已安装 v3.39.2）

---

## 快速启动（推荐 🚀）

双击项目根目录的 **`start.bat`** 即可一键启动：

```bat
# 项目根目录下
start.bat    # 一键启动
stop.bat     # 一键停止
```

### start.bat 会帮你做：

1. **清理旧进程** — 自动杀掉 3001 端口和 ngrok 的旧进程
2. **启动游戏服务器** — 弹出新窗口运行 `pnpm --filter server dev`
3. **等待服务就绪** — 轮询 `http://localhost:3001` 直到 200
4. **启动 ngrok 隧道** — 弹出新窗口运行 ngrok
5. **显示公网地址** — 自动提取 ngrok URL 并打印
6. **打开浏览器** — 按任意键自动打开本地页面

> **提示：** 启动窗口关闭不影响服务运行，服务端窗口和 ngrok 窗口保持打开即可。
> 关闭时双击 `stop.bat`，或直接关掉服务端 + ngrok 窗口。

---

## 手动启动

如果不用 `.bat` 脚本，也可在命令行分步执行：

### 1️⃣ 启动游戏服务器

```bash
pnpm --filter server dev
```

服务器默认运行在 `http://localhost:3001`，终端会输出：

```
Doudizhu server running on port 3001
```

> **注意：** 这个命令会保持前台运行（tsx watch 模式，代码修改自动重启）。需要让它一直在后台就另开一个终端窗口。

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

## 辅助脚本说明

项目根目录下有三个辅助文件：

| 文件 | 用途 |
|------|------|
| **start.bat** | 一键启动（杀旧 → 启服务 → 启隧道 → 显示地址） |
| **stop.bat** | 一键停止（杀 ngrok + 杀 3001 端口进程） |
| **get_ngrok_url.py** | 从 ngrok API 提取公网地址（被 start.bat 调用） |

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

### 方式一：双击 stop.bat（推荐）

```bat
stop.bat    # 自动杀 ngrok + 杀 3001 端口
```

### 方式二：手动停止

在各自终端窗口按 `Ctrl + C`：

1. **服务器终端** → 按 `Ctrl + C` 关掉 tsx / node 进程
2. **ngrok 终端** → 按 `Ctrl + C` 关掉隧道

### 方式三：强制结束

如果终端已经关了或者进程卡死了：

```bash
# 停 ngrok
ngrok kill

# 停游戏服务器（根据端口）
# Windows:
netstat -ano | findstr :3001
taskkill /PID <进程ID> /F
```

---

## 常见问题

### ngrok 提示 "隧道已存在"

先杀掉旧隧道再开新的：

```bash
ngrok kill
ngrok http 3001
```

### 端口 3001 被占用或 node.exe 越开越多

旧进程没杀干净会导致多个 node.exe 堆积。解决方案：

1. 优先用 `stop.bat` 停止（三重清理：端口杀 + 命令行匹配补杀 + 杀 ngrok）
2. 如果进程已不占端口（孤儿进程），手动查杀：

```bash
# 查看所有本项目相关的 node 进程
tasklist /FI "IMAGENAME eq node.exe" /V

# 或启动前一键强杀所有本项目 node 进程（慎用）
wmic process where "name='node.exe' and commandline like '%doudizhu%'" delete
```

3. 换个端口启动：

```bash
PORT=3002 pnpm --filter server dev
ngrok http 3002
```

### 客户端页面空白或样式不对

重新构建前端：

```bash
pnpm --filter client build
```

### start.bat 弹出新窗口找不到 pnpm

如果使用 fnm 管理 Node 版本，新 `cmd` 窗口可能不自动加载 fnm 环境。编辑 `start.bat`，取消第 30 行的注释（fnm 初始化那行），注释掉第 31 行（原来的 pnpm 启动行）。
