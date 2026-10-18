# Toad — README 关键段落摘录

> Source: https://github.com/batrachianai/toad (official README)
> Collected: 2026-10-18
> Published: Unknown

## GitHub API 指标快照（2026-10-18）

```json
{"archived":false,"desc":"A unified interface for AI in your terminal.","pushed":"2026-05-26T08:43:50Z","stars":3483,"url":"https://github.com/batrachianai/toad"}
```

## README 关键段落（按 ADE 判断关键词筛选，保留原文，完整段落边界）

<table>
  <tbody>
    <tr>
      <td>
        <h3>AI "App store"</h3>
        <p>
        Find, install, and run dozens of agents directly from the Toad UI.
        <p>
        There is a large and growing list of AI agents that work with Toad.
        Discover agents from big tech and smaller Open Source projects.
        <p>
        Developers can add support for their own agents, via the <a href="https://agentclientprotocol.com/overview/introduction">Agent Client Protocol</a>.
      </td>
      <td>
        <img alt="Screenshot 2026-01-27 at 12 48 30" src="https://github.com/user-attachments/assets/f7bd3776-6405-47e5-9d1f-11a12a4ce3b2" />
      </td>
    </tr>
    <tr>
      <td>
      <h3>Toad Shell</h3>
      <p>
      While most terminal agent interfaces can run commands (with the <kbd>!</kbd> syntax), they aren't running a shell.
      If you change directory or set environment variables, they won't persist from one command to the next.
      <p>
      Output that contains more than simple text will typically be garbled, and anything interactive will fail or even break the TUI entirely.
      <p>
      Toad integrates a fully working shell with full-color output, interactive commands, and tab completion.
      Allowing you to interleave prompts for the agent with terminal workflows.
      <p>
      At time of writing Toad is the only terminal UI which does this.
      </td>
      <td><img src="https://github.com/user-attachments/assets/ac9247bb-3daa-4bb7-b3fd-e0bbd22475fa"/></td>
    </tr>
    <tr>
      <td>
        <h3>Prompt Editor</h3>
        <p>
        Toad has a nice Markdown prompt editor, with syntax highlighting for code fences.
        Full mouse support, cut and paste, many keybindings and shortcuts.
      </td>
      <td>
        <img src="https://github.com/user-attachments/assets/3d619b94-ec53-4e7a-b905-5aef6f4fa8a6"/>
      </td>
    </tr>
    <tr>
      <td>
        <h3>File Picker</h3>
        <p>
        Add a file to your prompt with <kbd>@</kbd>, and toad will show a fuzzy file picker.
        <p>
        Type a few characters from the filename or folder and Toad will refine the search as you type.
        Hit <kbd>enter</kbd> to add the file to the prompt.
        <p>
        The fuzzy picker is great when you know the file you want to mention.
        If you want to explore your files, you can press <kbd>tab</kbd> to switch to an interactive tree control.
      </td>
      <td>
        <img src="https://github.com/user-attachments/assets/ab25c389-1d2f-4006-a1d8-159edbd3ed00"/>
      </td>
    </tr>
    <tr>
      <td>
        <h3>Beautiful Diffs</h3>
        <p>
        Side-by-side or unified diffs, with syntax highlighting for most languages.
      </td>
      <td>
        <img alt="Screenshot 2026-01-27 at 12 44 22" src="https://github.com/user-attachments/assets/b3d6c29c-d6ec-4253-a9dc-2df0ff21e293" />
      </td>
    </tr>
    <tr>
      <td>
        <h3>Elegant Markdown</h3>
        <p>
        Markdown is the language of LLMs (AI).
        Toad's streaming Markdown support can display syntax highlighted code fences, elegant tables, quotes, lists, and more.
      </td>
      <td>
        <img src="https://github.com/user-attachments/assets/b650b407-f4ab-4cb9-8920-55c15073598e"/>
      </td>
    </tr>
    <tr>
      <td>
        <h3>Simple Settings</h3>
        <p>
        An intuitive settings system (no need to manually edit JSON files).
        <p>
        Tune Toad to your liking.
        Almost everything in Toad may be tweaked.
        If you want to create an ultra-minimal UI with nothing more than a prompt—you can!
      </td>
      <td>
        <img src="https://github.com/user-attachments/assets/2ff0de12-c2e1-455b-954a-21e66c070dd8"/>
      </td>
    </tr>
    <tr>
      <td>
        <h3>Concurrent sessions</h3>
        <p>
        Launch and run multiple agents from potentially different providers.
        <p>
        Hit <kbd>ctrl+s</kbd> to show the current state of all your agents in one screen.
        </p>
      </td>
      <td>
        <img  alt="Screenshot 2026-02-16 at 17 33 40-fs8" src="https://github.com/user-attachments/assets/cd3128eb-b348-4f40-b5c0-4816d07dcbe9" />
      </td>
    </tr>
    <tr>
      <td>
        <h3>Session Resume</h3>
        <p>
        Resume previous sessions with your agent.
        <p>
        Hit <kbd>ctrl+r</kbd> to pick a previous session to resume.
      </td>
      <td>
        <img alt="Screenshot 2026-02-01 at 16 57 46" src="https://github.com/user-attachments/assets/7c1ad59e-027c-4542-a216-9a32ef573936" />
      </td>
    </tr>
  </tbody>
</table>

When running Toad, the current working directory is assumed to be your project directory.
To use another project directory, add the path to the command.
For example:

### Web server

You can run Toad as a web application.

```bash
toad serve
```

![textual-serve](https://github.com/user-attachments/assets/1d861d48-d30b-44cd-972d-5986a01360bf)

To discuss Toad, see the Discussions tab, or join the #toad channel on the [Textualize discord server](https://discord.gg/Enf6Z3qhVr).

- [ ] UI for MCP servers
- [ ] Expose model selection (waiting on ACP update)
- [x] Sessions (resume)
- [x] Multiple agents
- [ ] Windows native support
- [ ] Builtin editor
- [ ] Sidebar (widgets)
  - [ ] Git pending changes

By allowing the discussions to happen in the Discussion tabs, issues can be reserved for actionable tasks with a clear description and goal.
