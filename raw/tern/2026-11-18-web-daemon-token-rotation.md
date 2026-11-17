# Tern web 与 daemon 的架构关系及 token 轮换排障

> Source: 本机 Tern 0.9.26 运行中服务、`~/.config/tern/web-token`、`systemctl --user show` 输出、curl 认证比对、Playwright 页面级验证
> Collected: 2026-11-18
> Published: Unknown

## 架构关系

- `tern web serve` 只提供 HTTP 页面给浏览器，**不直接连 daemon**。
- 浏览器页面里的 WASM 通过 WebSocket 连 `daemon.sock`。
- web 与 daemon 之间没有持久 unix socket 连接是正常架构，不是故障。

## Token 轮换排障

用户报告 `Tern could not start: the session daemon closed the connection`。

### 排查步骤

1. 比对新旧 token：
   - 旧 token `9d6c7334…`：HTTP 401
   - 新 token（`~/.config/tern/web-token`）：HTTP 200
2. 重启 daemon（pid `2645661`）与 web（pid `2657116`）。
3. Playwright 页面级验证：
   - 旧 token：页面显示 `Tern could not start: the session daemon closed the connection`
   - 新 token：页面加载，终端 prompt 显示，无错误

### 结论

用户浏览器持有旧 token，token 轮换后旧 token 失效，页面用旧 token 连 daemon 被拒绝，报 `session daemon closed the connection`。新 token 页面正常。

### 轮换步骤

```bash
# 生成新 token
new_token=$(openssl rand -hex 32)
printf '%s' "$new_token" > ~/.config/tern/web-token.new
chmod 600 ~/.config/tern/web-token.new

# 核对新旧 SHA-256 不同
old_sha=$(sha256sum ~/.config/tern/web-token | cut -d' ' -f1)
new_sha=$(sha256sum ~/.config/tern/web-token.new | cut -d' ' -f1)
test "$old_sha" != "$new_sha"

# 原子替换并重启
mv -f ~/.config/tern/web-token.new ~/.config/tern/web-token
systemctl --user restart tern-web.service

# 验证
curl -sS -o /dev/null -w '%{http_code}\n' "http://127.0.0.1:8378/?token=$new_token"
```

轮换后旧入口失效，需用新 token 重开页面。
