# TUIOS Web 运行关系、图形与字体

> Source: 当前会话用户消息及 ps/pstree、list-clients、list-windows 输出摘录；Gaurav-Gosain/tuios v0.12.1 cmd/tuios-web/main.go、go.mod；Gaurav-Gosain/sip v0.10.0 static/terminal.js
> Collected: 2026-11-01
> Published: Unknown

## 用户问题（原文）

> check the procs relationship, that is what i meant

> but tuios is opened by me, in a zsh, in ttyd, in browser

> no, not ttyd anymore, i am using tuios web now, not ttyd anymore, check running procs relationship again

> when would omp use kitty to show what to user? tell me, and show me

> for tuios web mode, how do i specify which font to use? for ttyd i am using maple nf cn

## 两次进程关系检查（已观察结果归纳，非原始 argv）

早期客户端链：systemd(1) → ttyd(196) → login(275030) → zsh(275058) → tuios(277761)。OMP 窗格链：systemd(1) → tuios daemon(224146) → zsh(277777) → omp(280078)。

后来 Web 客户端检查：tuios-web PID 310412，list-clients 返回该 PID 连接 main；OMP 变为 PID 310973，父 shell 仍为 277777。ttyd 仍是启动该 Web 服务的 shell 的祖先。服务启动祖先关系不表示当前浏览器连接 ttyd，浏览器客户端记录对应 tuios-web。

检查只保留 PID、PPID 和进程名，不保存完整 argv 或鉴权参数。PID 是当次观测，不是固定配置。

## Web 渲染与图形（已读源码归纳）

TUIOS v0.12.1 go.mod 使用 sip v0.10.0。服务器生成窗格/侧栏/状态栏终端输出，sip 传输给浏览器，WebTerm 绘制文字和图像。Web 侧使用 Kitty 图形层；TUIOS Web 配置 SIXEL → Kitty 转换。OMP 输出图片、截图与生成图表时使用选定的终端图像协议；普通文字不需要 Kitty。

## 图片演示记录

生成 /tmp/omp-tuios-web-image-demo.png，640 × 200，内容为 OMP IMAGE DEMO / TUIOS WEB 和蓝红渐变。用 read 和 eval 图片输出发送。工具显示 [image]；未取得浏览器截图或用户确认，记录为图片已生成并输出，不记录为 Kitty 已在页面显示成功。

## 字体（源码入口与未执行示例）

该版本 tuios-web --help 没有 --font-family。sip v0.10.0 static/terminal.js 提供 WebTerm setOptions 的 fontFamily 调整；当前页面示例：

```javascript
sipTerm.webterm.setOptions({
  fontFamily: "'Maple Mono NF CN', monospace"
});
```

此示例未在用户浏览器执行。字体应安装在运行浏览器的系统，WSL 安装本身不让 Windows 浏览器取得字体。页面修改不是持久服务端设置；刷新后恢复。持久方式需要页面启动时应用或使用 sip 的字体配置能力，当前 TUIOS Web 未开放对应 CLI 参数。

## 前端字体源码行（非连续原文摘录）

```javascript
                case 'fontFamily': out.fontFamily = checkFontFamily(v); break;
        if (pagePatch.fontFamily !== undefined) opts.fontFamily = pagePatch.fontFamily;
        if (Object.keys(opts).length) sipClient.webterm.setOptions(opts);
            this.fontFamily = sipConfig.fontFamily || FONT_FAMILY;
                fontFamily: this.fontFamily,
```
