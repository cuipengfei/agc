# microsoft/vscode 源码：serve-web 的用户设置与远程设置

> Source: https://github.com/microsoft/vscode/tree/12cd33793ea356f0fa099410b2948274eee74865
> Collected: 2026-10-21
> Published: 2026-10-21

固定提交：`12cd33793ea356f0fa099410b2948274eee74865`，提交时间 `2026-10-21T14:13:44Z`。以下为相关源码摘录，保留原始缩进。

## Web 客户端把用户设置放进 IndexedDB

`src/vs/workbench/browser/web.main.ts`（约 521-553 行）：

```ts
		let indexedDB: IndexedDB | undefined;
		const userDataStore = 'vscode-userdata-store';
		const logsStore = 'vscode-logs-store';
		const handlesStore = 'vscode-filehandles-store';
		try {
			indexedDB = await IndexedDB.create('vscode-web-db', 3, [userDataStore, logsStore, handlesStore]);
```

```ts
		// User data
		let userDataProvider;
		if (indexedDB) {
			userDataProvider = new IndexedDBFileSystemProvider(Schemas.vscodeUserData, indexedDB, userDataStore, true);
			this.indexedDBFileSystemProviders.push(userDataProvider);
			this.registerDeveloperActions(userDataProvider);
		} else {
			logService.info('Using in-memory user data provider');
			userDataProvider = new InMemoryFileSystemProvider();
		}
		fileService.registerProvider(Schemas.vscodeUserData, userDataProvider);
```

同一文件约 637 行，工作台服务接收 `remoteAuthority`：

```ts
		const workspaceService = new WorkspaceService({ remoteAuthority: this.configuration.remoteAuthority, configurationCache }, environmentService, userDataProfileService, userDataProfilesService, fileService, remoteAgentService, uriIdentityService, logService, policyService);
```

## serve-web 把请求 Host 作为 remoteAuthority

`src/vs/server/node/webClientServer.ts`（约 348-359 行）：

```ts
		let remoteAuthority = (
			useTestResolver
				? 'test+test'
				: (getFirstHeader('x-original-host') || getFirstHeader('x-forwarded-host') || req.headers.host)
		);
		if (!remoteAuthority) {
			return serveError(req, res, 400, `Bad request.`);
		}
		const forwardedPort = getFirstHeader('x-forwarded-port');
		if (forwardedPort) {
			remoteAuthority = replacePort(remoteAuthority, forwardedPort);
		}
```

同一文件约 416-418 行：

```ts
		const workbenchWebConfiguration = {
			remoteAuthority,
			serverBasePath: basePath,
```

## Remote 用户配置在存在 remoteAuthority 时创建

`src/vs/workbench/services/configuration/browser/configurationService.ts`（约 139-146 行）：

```ts
		if (remoteAuthority) {
			const remoteUserConfiguration = this.remoteUserConfiguration = this._register(new RemoteUserConfiguration(remoteAuthority, configurationCache, fileService, uriIdentityService, remoteAgentService, logService));
			this._register(remoteUserConfiguration.onDidInitialize(remoteUserConfigurationModel => {
				this._register(remoteUserConfiguration.onDidChangeConfiguration(remoteUserConfigurationModel => this.onRemoteUserConfigurationChanged(remoteUserConfigurationModel)));
				this.onRemoteUserConfigurationChanged(remoteUserConfigurationModel);
				this.initRemoteUserConfigurationBarrier.open();
			}));
		} else {
```

同一文件约 621 行，本地用户配置与远程用户配置分别初始化：

```ts
			const result = await Promise.all([this.localUserConfiguration.initialize(), this.remoteUserConfiguration ? this.remoteUserConfiguration.initialize() : Promise.resolve(ConfigurationModel.createEmptyModel(this.logService))]);
```

同一文件约 706 行，构造配置时传入两个模型：

```ts
		this._configuration = new Configuration(this.defaultConfiguration.configurationModel, this.policyConfiguration.configurationModel, applicationConfigurationModel, userConfigurationModel, remoteUserConfigurationModel, workspaceConfiguration, folderConfigurationModels, ConfigurationModel.createEmptyModel(this.logService), new ResourceMap<ConfigurationModel>(), this.workspace, this.logService);
```

## RemoteUserConfiguration 读取服务端 settingsPath

`src/vs/workbench/services/configuration/browser/configuration.ts`（约 399-401 行）：

```ts
		remoteAgentService.getEnvironment().then(async environment => {
			if (environment) {
				const userConfiguration = this._register(new FileServiceBasedRemoteUserConfiguration(environment.settingsPath, { scopes: REMOTE_MACHINE_SCOPES }, this._fileService, uriIdentityService, logService));
```

## 服务端返回的 settingsPath 指向 Machine/settings.json

`src/vs/server/node/remoteAgentEnvironmentImpl.ts`：

```ts
			settingsPath: this._environmentService.machineSettingsResource,
```

`src/vs/server/node/serverEnvironmentService.ts`：

```ts
	get machineSettingsResource(): URI { return joinPath(URI.file(join(this.userDataPath, 'Machine')), 'settings.json'); }
```

同一文件中的 `mcpResource`：

```ts
	get mcpResource(): URI { return joinPath(URI.file(join(this.userDataPath, 'User')), 'mcp.json'); }
```

## 本地用户配置与远程用户配置的合并

`src/vs/platform/configuration/common/configurationModels.ts`（约 1005-1015 行）：

```ts
	get userConfiguration(): ConfigurationModel {
		if (!this._userConfiguration) {
			if (this._remoteUserConfiguration.isEmpty()) {
				this._userConfiguration = this._localUserConfiguration;
			} else {
				const merged = this._localUserConfiguration.merge(this._remoteUserConfiguration);
				this._userConfiguration = new ConfigurationModel(merged.contents, merged.keys, merged.overrides, undefined, this.logService);
			}
		}
		return this._userConfiguration;
	}
```

同一文件约 1067 行，工作区合并顺序：

```ts
			this._workspaceConsolidatedConfiguration = this._defaultConfiguration.merge(this.applicationConfiguration, this.userConfiguration, this._workspaceConfiguration, this._memoryConfiguration);
```

同一文件约 1038-1043 行，Policy 最后按键覆盖：

```ts
		if (!this._policyConfiguration.isEmpty() && this._policyConfiguration.getValue(section) !== undefined) {
			// clone by merging
			configurationModel = configurationModel.merge();
			for (const key of this._policyConfiguration.keys) {
				configurationModel.setValue(key, this._policyConfiguration.getValue(key));
			}
```

## 各层允许的 scope 集合

`src/vs/workbench/services/configuration/common/configuration.ts`：

```ts
export const REMOTE_MACHINE_SCOPES = [ConfigurationScope.MACHINE, ConfigurationScope.APPLICATION_MACHINE, ConfigurationScope.WINDOW, ConfigurationScope.RESOURCE, ConfigurationScope.LANGUAGE_OVERRIDABLE, ConfigurationScope.MACHINE_OVERRIDABLE];
export const WORKSPACE_SCOPES = [ConfigurationScope.WINDOW, ConfigurationScope.RESOURCE, ConfigurationScope.LANGUAGE_OVERRIDABLE, ConfigurationScope.MACHINE_OVERRIDABLE];
export const FOLDER_SCOPES = [ConfigurationScope.RESOURCE, ConfigurationScope.LANGUAGE_OVERRIDABLE, ConfigurationScope.MACHINE_OVERRIDABLE];
```

## 未声明 scope 的设置默认使用 WINDOW

`src/vs/platform/configuration/common/configurationRegistry.ts`（约 845-872 行）：

```ts
	private validateAndRegisterProperties(configuration: IConfigurationNode, validate: boolean = true, extensionInfo: IExtensionInfo | undefined, restrictedProperties: string[] | undefined, scope: ConfigurationScope = ConfigurationScope.WINDOW, bucket: Set<string>): void {
		scope = types.isUndefinedOrNull(configuration.scope) ? scope : configuration.scope;
```

```ts
					property.scope = types.isUndefinedOrNull(property.scope) ? scope : property.scope;
```

## window.title 的注册不带 scope

`src/vs/workbench/browser/workbench.contribution.ts`（约 903-911 行）：

```ts
	registry.registerConfiguration({
		...windowConfigurationNodeBase,
		'properties': {
			'window.title': {
				'type': 'string',
				'default': defaultWindowTitle,
				'markdownDescription': windowTitleDescription,
				agentsWindow: { default: '${appName}', readOnly: true },
			},
```

`windowConfigurationNodeBase` 本身也不带 scope。`src/vs/workbench/common/configuration.ts`（约 50-55 行）：

```ts
export const windowConfigurationNodeBase = Object.freeze<IConfigurationNode>({
	'id': 'window',
	'order': 8,
	'title': localize('windowConfigurationTitle', "Window"),
	'type': 'object',
});
```
