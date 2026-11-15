# Alma Relay 远程访问：官方摘录

> Source: https://github.com/yetone/alma-relay/blob/main/README.md
> Collected: 2026-11-15
> Published: Unknown

> Your own relay for **Alma Remote Access**: control the Alma on your desktop from the Alma app on your phone, from anywhere, with no port forwarding, no VPN, and no third party in between.

> The desktop dials **out** to the relay and keeps the connection open. The phone sends its requests to the relay, which passes them through that connection to the desktop: HTTP, streaming (SSE) and WebSockets. With end-to-end encryption on (the Alma default), the relay only ever sees ciphertext. It stores nothing on disk and never sees your connect code.

> Alma ships with a hosted relay (`relay.alma.now`). Run your own if you want the traffic on infrastructure you control, a region closer to you, or no dependency on anyone else's server.

> **A self-hosted relay therefore can't notify the official Alma iOS app.** Everything else works.

> Android phones are notified through Firebase Cloud Messaging instead.
