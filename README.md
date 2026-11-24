# cWeb 探针（部署前验证用）

先部署这个探针，确认 cWeb 能用，再上 Xray。不要直接部署 Xray。

## 探针做什么

- `GET /`：返回启动时间、运行时间、出口 IP 及归属地（国家/州/城市、ISP、ASN）。
- `GET /ray`：WebSocket 回显端点，服务端每 30 秒发 ping。
- `GET /health`：返回 ok。

## 部署方法（cWeb 控制台，没有 API/CLI）

1. 注册并登录 https://portal.cweb.app（邮箱验证，不绑卡）。
2. Web Applications → New Website → 选 Node.js 栈。
3. 上传本目录的 ZIP（`package.json` + `package-lock.json` + `server.js`），或连 GitHub 仓库。
4. 等构建完成，拿到平台给的 HTTPS 地址。

## 验证项（全部通过才上 Xray）

1. 打开 `https://<你的地址>/`，看出口 IP 是否在美国（查 ip-api.com / ipinfo.io 核对国家、州、城市、ASN、机房属性）。
2. `wss://<你的地址>/ray` 能握手、能回显，30 分钟不断。
3. **静置 6–12 小时后再打开 `/`，看容器是否还活着、有无冷启动延迟**（免费后端闲置休眠是最大未知数）。

## 通过之后

用 Node 包装器在构建期下载 Xray 二进制并 spawn，监听 `$PORT`，走 VLESS + WebSocket + TLS（cWeb 同样只有 Web 入口，跑不了原生 Shadowsocks，与 Quave 相同）。

## 已知

- 免费档：1 个后端应用、每应用 2 GB 存储、每月 100 次部署，不绑卡；Pro 可免卡试用 3 个月。
- WebSocket：官方文档确认支持（代理转发 WebSocket 升级）。
- 地区：文档未写明网站应用可选地区；Studio/数据库文档称唯一位置是 US - Arizona，出口 IP 必须实测。
- 条款：未发现明文禁止代理/VPN；“实质损害服务地消耗资源”表述较宽，属灰色地带。红线：若平台明确禁止或封禁，立即停用，不换号规避。
- 本地测试：2026-11-24 在本机跑通过，`/` 和 `/health` 正常（本机出口 IP 查询受拦截，显示 pending，属本机环境问题，cWeb 上会正常返回）。
