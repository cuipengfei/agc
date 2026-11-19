# gcloud SSH 隧道机制：本机源码摘录与命令输出

> Source: 本机安装的 Google Cloud SDK 594.0.0（/usr/lib/google-cloud-sdk）与会话中的本机命令输出
> Collected: 2026-11-20
> Published: Unknown

## 本机命令输出

`gcloud --version` 输出：

```
Google Cloud SDK 594.0.0
alpha 2026.11.13
beta 2026.11.13
bq 2.1.42
bundled-python3-unix 3.14.9
```

`which ssh` 与 `where ssh` 输出：

```
/usr/bin/ssh
/bin/ssh
```

`ssh -V` 输出：

```
OpenSSH_10.2p1 Ubuntu-2ubuntu3.8, OpenSSL 3.5.5 27 Jan 2026
```

`readlink -f /bin` 输出：

```
/usr/bin
```

## /usr/lib/google-cloud-sdk/lib/surface/compute/ssh.py

```
303:  def Run(self, args):
304:    """See ssh_utils.BaseSSHCLICommand.Run."""
305:
306:    on_prem = args.IsKnownAndSpecified('network') and args.IsKnownAndSpecified(
307:        'region'
308:    )
309:    if on_prem:
310:      args.plain = True
311:
312:    # These two lines are needed to ensure reauth is performed as needed, even
313:    # for on-prem, which doesn't use the resulting variables.
314:    holder = base_classes.ComputeApiHolder(self.ReleaseTrack())
315:    client = holder.client
316:
317:    ssh_helper = ssh_utils.BaseSSHCLIHelper()
318:    ssh_helper.Run(args)
```

## /usr/lib/google-cloud-sdk/lib/googlecloudsdk/command_lib/compute/ssh_utils.py

```
1187:    cmd = ssh.SSHCommand(
1188:        remote,
1189:        identity_file=identity_file,
1190:        options=options,
1191:        remote_command=remote_command,
1192:    )
1193:    # Open the platform-specific null device for stdin and stdout
1194:    # for the subprocess.
1195:    null_in = FileReader(os.devnull)
1196:    null_out = FileWriter(os.devnull)
1197:    null_err = FileWriter(os.devnull)
1198:    return_code = cmd.Run(
1199:        self.env,
1200:        putty_force_connect=putty_force_connect,
1201:        explicit_output_file=null_out,
1202:        explicit_error_file=null_err,
1203:        explicit_input_file=null_in,
1204:    )
```

## /usr/lib/google-cloud-sdk/lib/googlecloudsdk/command_lib/util/ssh/ssh.py

```
138:          'ssh': 'ssh',
139:          'ssh_term': 'ssh',
```

```
260:  DEFAULT_KEY_FILE = os.path.join('~', '.ssh', 'google_compute_engine')
```

IAP 模式的 ProxyCommand 构造：

```
1875:  elif iap_tunnel_args.instance:
1876:    gcloud_command.extend([
1877:        'compute',
1878:        'start-iap-tunnel',
1879:        _EscapeProxyCommandArg(iap_tunnel_args.instance, env),
1880:        port_token,
1881:        '--listen-on-stdin',
1882:        _EscapeProxyCommandArg('--project=' + iap_tunnel_args.project, env),
1883:    ])
1884:    if iap_tunnel_args.zone:
1885:      gcloud_command.append(
1886:        _EscapeProxyCommandArg('--zone=' + iap_tunnel_args.zone, env)
1887:      )
```

## /usr/lib/google-cloud-sdk/lib/googlecloudsdk/command_lib/compute/iap_tunnel.py

```
846:class IapTunnelProxyServerHelper():
847:  """Proxy server helper listens on a port for new local connections."""
```

```
987:class IapTunnelStdinHelper():
988:  """Facilitates a connection that gets local data from stdin."""
```

```
1000:  def Run(self):
1001:    """Executes the tunneling of data."""
1002:    local_conn = _StdinSocket(
1003:        ignore_windows_broken_pipe=self._ignore_windows_broken_pipe
1004:    )
```

## /usr/lib/google-cloud-sdk/lib/googlecloudsdk/api_lib/compute/iap_tunnel_websocket_utils.py

```
35:URL_SCHEME = 'wss'
36:URL_HOST = 'tunnel.cloudproxy.app'
37:MTLS_URL_HOST = 'mtls.tunnel.cloudproxy.app'
38:URL_PATH_ROOT = '/v4'
39:CONNECT_ENDPOINT = 'connect'
40:RECONNECT_ENDPOINT = 'reconnect'
41:
42:SUBPROTOCOL_NAME = 'relay.tunnel.cloudproxy.app'
```

## /usr/lib/google-cloud-sdk/lib/googlecloudsdk/api_lib/compute/iap_tunnel_websocket.py

```
146:class IapTunnelWebSocket(object):
147:"""Cloud IAP WebSocket class for tunnelling connections.
```

## /usr/lib/google-cloud-sdk/lib/surface/workstations/ssh.py

```
82:    t = threading.Thread(target=client.StartTcpTunnel, args=(args, True))
83:    t.daemon = True
84:    t.start()
85:
86:    client.threading_event.wait()
87:    if client.tcp_tunnel_open:
88:      client.Ssh(args)
```

## /usr/lib/google-cloud-sdk/lib/googlecloudsdk/api_lib/workstations/workstations.py

`StartTcpTunnel` 进程内绑定并监听本地端口：

```
303:    # Bind on the local TCP port
304:    host, port = self._GetLocalHostPort(args)
305:    self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
306:    self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
307:    self.socket.bind((host, port))
308:    self.socket.listen(1)
```

```
321:    if threaded:
322:      # Notifies threads that the TCP tunnel was started
323:      self.tcp_tunnel_open = True
324:      self.threading_event.set()
325:      while self.tcp_tunnel_open:
326:        conn, addr = self.socket.accept()
327:        self._AcceptConnection(conn, addr)
```

`Ssh` 把 ssh 指到本地端口：

```
339:  def Ssh(self, args):
340:    """SSH's to a workstation."""
341:    self.env = ssh.Environment.Current()
342:    self.env.RequireSSH()
343:
344:    keys = ssh.Keys.FromFilename()
345:    keys.EnsureKeysExist(overwrite=False)
346:
347:    host, port = self._GetLocalHostPort(args)
```

`Ssh` 在 ssh 退出后返回：

```
373:    cmd = ssh.SSHCommand(
374:        remote=remote,
375:        port=port,
376:        options=options,
377:        extra_flags=extra_flags,
378:        tty=tty,
379:        remainder=remainder,
380:        remote_command=remote_command,
381:    )
382:
383:    return cmd.Run(self.env)
```

访问令牌来源：

```
395:  def _FetchAccessToken(self, workstation, threaded=False):
396:    try:
397:      self.access_token = self.client.projects_locations_workstationClusters_workstationConfigs_workstations.GenerateAccessToken(
398:          self.messages.WorkstationsProjectsLocationsWorkstationClustersWorkstationConfigsWorkstationsGenerateAccessTokenRequest(
399:              workstation=workstation
400:          )
401:      ).accessToken
```

WebSocket 端点与鉴权头：

```
439:    server = websocket.WebSocketApp(
440:        'wss://%s/_workstation/tcp/%d' % (self.host, self.port),
441:        header={'Authorization': 'Bearer %s' % self.access_token},
442:        on_open=lambda ws: self._ForwardClientToServer(client, ws),
443:        on_data=lambda ws, data, op, finished: client.send(data),
```

`grep -rn -i 'iap' /usr/lib/google-cloud-sdk/lib/googlecloudsdk/api_lib/workstations/` 无输出。
