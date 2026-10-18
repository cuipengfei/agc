# CodeNomad — OpenCode 架构依赖源码摘录

> Source: https://github.com/NeuralNomadsAI/CodeNomad/tree/a8e3e14e499bbf4cdb00a34f13fcd274554c6df1 (official source)
> Collected: 2026-10-18
> Published: 2026-10-18 (source commit date not separately verified)

## packages/server/src/permissions/opencode-replier.ts

```ts
import type { WorkspaceManager } from "../workspaces/manager"
import { createInstanceClient } from "../workspaces/instance-client"
import type { AutoAcceptReply, PermissionReplier } from "./auto-accept-manager"
import type { PermissionReceipts } from "./receipts"

interface OpencodeReplierDeps {
  workspaceManager: WorkspaceManager
  permissionReceipts?: PermissionReceipts
}

/**
 * Default {@link PermissionReplier} that calls the OpenCode instance via the
 * native Promise client, using the same `"once"` reply the UI previously sent.
 */
export function createOpencodePermissionReplier(deps: OpencodeReplierDeps): PermissionReplier {
  return async (reply: AutoAcceptReply) => {
    const connection = deps.permissionReceipts ? await deps.workspaceManager.getSharedServiceConnection(reply.instanceId) : undefined
    const client = connection?.client ?? await createInstanceClient(deps.workspaceManager, reply.instanceId)
    if (!client) {
      throw new Error(`Yolo: instance ${reply.instanceId} is not ready`)
    }

    const session = await client.session.get({ sessionID: reply.sessionId })
    if (!(await deps.workspaceManager.ownsLocation(reply.instanceId, session.location))) {
      throw new Error(`Yolo: session ${reply.sessionId} does not belong to workspace ${reply.instanceId}`)
    }
```

## packages/server/src/index.ts

```ts
import { createOpencodePermissionReplier } from "./permissions/opencode-replier"
import { createOpencodeYoloPersistence } from "./permissions/opencode-yolo-metadata"

const sessionMetadataPersistence = createOpencodeYoloPersistence(workspaceManager, settings)
const permissionReceipts = new PermissionReceipts(
  new PermissionReceiptStore(path.join(configLocation.baseDir, "permission-receipts")), workspaceManager, eventBus, yoloLogger,
)

const yoloManager = new AutoAcceptManager({
  eventBus,
  logger: yoloLogger,
  replier: createOpencodePermissionReplier({ workspaceManager, permissionReceipts }),
  persistence: sessionMetadataPersistence,
})
```

## packages/server/src/missions/native-catalog.ts

```ts
export async function readMissionCatalog(client: MissionCatalogClient, directory: string) {
  const [agents, models] = await Promise.all([
    client.agent.list({ location: { directory } }), client.model.list({ location: { directory } }),
  ])
```

## 检索边界

在本地稀疏源码快照中对 `oh.my.pi`、`oh-my-pi`、OMP、Pi、ACP、custom agent、provider registry 与 agent launch 相关模式检索，未定位到 OMP/Pi/ACP 后端注册或启动路径。此句记录检索边界，不证明不存在其他适配方式。
