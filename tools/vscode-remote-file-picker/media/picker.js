(() => {
  'use strict';

  const vscode = acquireVsCodeApi();
  const config = window.remoteFilePickerConfig;
  const $ = window.jQuery;
  const address = document.getElementById('picker-address');
  const form = document.getElementById('picker-address-form');
  const error = document.getElementById('picker-error');
  const cancelButton = document.getElementById('picker-cancel');
  const content = document.getElementById('picker-content');
  const pending = new Map();
  const prefix = `${config.storageKey}:`;
  const storage = new Map(Object.entries(config.storage || {}).filter(([key, value]) =>
    key.startsWith(prefix) && typeof value === 'string'));
  const readCommands = new Set(['open', 'tree', 'parents', 'subdirs', 'info', 'ls', 'abort']);
  let nextId = 1;
  let closed = false;
  let finder;
  let selecting;
  let navigation;

  function showError(message, invalidAddress = false) {
    error.textContent = message;
    error.hidden = !message;
    address.setAttribute('aria-invalid', String(invalidAddress));
  }

  function rpc(type, payload) {
    const id = nextId++;
    const deferred = $.Deferred();
    deferred.status = 0;
    deferred.abort = () => {
      if (pending.delete(id)) {
        deferred.status = 0;
        deferred.reject(deferred, 'abort', 'Request canceled.');
      }
      return deferred;
    };
    if (closed) {
      queueMicrotask(() => deferred.reject(deferred, 'abort', 'Picker is closed.'));
      return deferred;
    }
    pending.set(id, { type, payload, deferred });
    try {
      vscode.postMessage({ id, type, ...payload });
    } catch (cause) {
      pending.delete(id);
      queueMicrotask(() => {
        const message = cause instanceof Error ? cause.message : String(cause);
        deferred.status = 500;
        deferred.responseText = JSON.stringify({ error: message });
        deferred.reject(deferred, 'error', message);
      });
    }
    return deferred;
  }

  window.addEventListener('message', event => {
    const message = event.data;
    if (!message || !Number.isSafeInteger(message.id) || message.id <= 0) return;
    const entry = pending.get(message.id);
    if (!entry) return;
    pending.delete(message.id);
    const { deferred, type } = entry;
    let failure = message.error;
    if (failure === undefined) {
      const result = message.result;
      const valid = type === 'select' || type === 'storage'
        ? result === true
        : result !== null && typeof result === 'object' && !Array.isArray(result) &&
          (type !== 'navigate' || (typeof result.target === 'string' && result.target &&
            typeof result.path === 'string' && result.path.startsWith('/')));
      if (!valid) failure = 'Invalid response from the remote file picker.';
    }
    if (failure !== undefined) {
      const text = typeof failure === 'string' && failure ? failure : 'Remote file picker request failed.';
      deferred.status = 500;
      deferred.responseText = JSON.stringify({ error: text });
      deferred.reject(deferred, 'error', text);
    } else {
      deferred.status = 200;
      deferred.resolve(message.result, 'success', deferred);
    }
  });

  function flushStorage() {
    return $.when(...Array.from(pending.values())
      .filter(entry => entry.type === 'storage').map(entry => entry.deferred));
  }

  function nativeStorage(key, value) {
    if (key === undefined) {
      for (const storedKey of Array.from(storage.keys())) {
        nativeStorage(storedKey.slice(prefix.length), null);
      }
      return true;
    }
    const fullKey = prefix + key;
    if (value !== undefined) {
      const serialized = value === null ? null : typeof value === 'string' || typeof value === 'number'
        ? String(value) : JSON.stringify(value);
      if (serialized === null) storage.delete(fullKey);
      else storage.set(fullKey, serialized);
      rpc('storage', { key: fullKey, value: serialized }).fail((_xhr, status, message) => {
        if (status !== 'abort') showError(`Could not save picker preferences. ${message}`);
      });
    }
    const stored = storage.get(fullKey);
    if (stored === undefined) return null;
    if (stored.startsWith('{') || stored.startsWith('[')) {
      try { return JSON.parse(stored); } catch (_) { return stored; }
    }
    return stored;
  }

  function cancel() {
    if (closed) return;
    closed = true;
    cancelButton.disabled = true;
    for (const entry of Array.from(pending.values())) {
      if (entry.type !== 'storage') {
        entry.deferred.quiet = true;
        entry.deferred.abort();
      }
    }
    flushStorage().always(() => vscode.postMessage({ type: 'cancel' }));
  }

  cancelButton.addEventListener('click', cancel);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      cancel();
    } else if (event.altKey && !event.ctrlKey && !event.metaKey && event.key.toLowerCase() === 'l') {
      event.preventDefault();
      address.focus();
      address.select();
    }
  }, true);

  function updateButtons() {
    const toolbar = finder.getUI('toolbar');
    toolbar.find('.elfinder-button').each(function() {
      const button = $(this);
      button.attr({ role: 'button', tabindex: '0', 'aria-disabled': String(button.hasClass('ui-state-disabled')) });
      button.attr('aria-label', button.attr('title') || button.text().trim());
    });
  }

  try {
    $('#remote-file-picker').elfinder({
      url: 'remote-file-picker:connector',
      lang: 'en',
      startPathHash: config.startHash,
      rememberLastDir: false,
      useBrowserHistory: false,
      cssAutoLoad: false,
      themes: {},
      dragUploadAllow: false,
      sync: 0,
      defaultView: 'list',
      width: '100%',
      height: '100%',
      heightBase: content,
      noResizeBySelf: true,
      resizable: false,
      commands: ['getfile', 'open', 'back', 'forward', 'home', 'up', 'reload', 'view', 'sort', 'places'],
      ui: ['toolbar', 'places', 'tree', 'path', 'stat'],
      uiOptions: {
        toolbar: [['back', 'forward', 'up', 'home', 'reload'], ['getfile', 'open', 'places'], ['view', 'sort']],
        toolbarExtra: { displayTextLabel: true, labelExcludeUA: [], autoHideUA: [], defaultHides: [], preferenceInContextmenu: false },
        navbar: { autoHideUA: [] },
        cwd: { metakeyDragout: false, listView: { columns: ['date', 'size', 'kind'] } },
        tree: { openRootOnLoad: true, openCwdOnOpen: true, syncTree: true, durations: { slideUpDown: 0, autoScroll: 0 } }
      },
      contextmenu: {
        navbar: ['open', 'places'],
        cwd: ['reload', 'back', 'up'],
        files: ['getfile', 'open', 'places']
      },
      commandsOptions: {
        getfile: { onlyURL: false, multiple: false, folders: false, getPath: false, getImgSize: false, oncomplete: '', onerror: '' },
        open: { selectAction: 'getfile' }
      },
      transport: {
        init(instance) {
          finder = instance;
          instance.storage = nativeStorage;
          // A selector has no browser file URLs, including the URL getfile normally computes.
          instance.url = (_hash, options) => options && (options.async || options.onetime)
            ? $.Deferred().reject('File URLs are disabled in this picker.') : '';
          instance.one('init', () => {
            const open = instance.getCommand('open');
            const openDirectory = open.exec;
            // Native multi-file open bypasses selectAction and launches browser URLs.
            open.exec = function(hashes, options) {
              const files = this.files(hashes);
              if ((options && options.thash) || (files.length === 1 && files[0].mime === 'directory')) {
                return openDirectory.call(this, hashes, options);
              }
              if (files.length !== 1) {
                instance.error('Select one readable file.');
                return $.Deferred().reject();
              }
              return instance.exec('getfile', hashes);
            };
            instance.getUI('toolbar').on('keydown', '.elfinder-button', function(event) {
              if (event.key !== 'Enter' && event.key !== ' ') return;
              event.preventDefault();
              event.stopPropagation();
              if (!$(this).hasClass('ui-state-disabled')) $(this).trigger('click');
            });
            updateButtons();
            instance.bind('load open select enable disable', updateButtons);
          });
          instance.bind('open', event => {
            const path = event.data.options && event.data.options.path;
            if (typeof path === 'string') address.value = path;
            showError('');
          });
        },
        send(options) {
          if (!options.data || !readCommands.has(options.data.cmd)) {
            const denied = $.Deferred();
            denied.abort = () => denied;
            queueMicrotask(() => denied.resolve({ error: 'This command is disabled in the read-only picker.' }));
            return denied;
          }
          if (options.data.cmd === 'open') {
            for (const entry of Array.from(pending.values())) {
              if (entry.type === 'navigate' || (entry.type === 'request' && entry.payload.data.cmd === 'open')) {
                entry.deferred.quiet = true;
                entry.deferred.abort();
              }
            }
          }
          return rpc('request', { data: options.data });
        },
        upload() {
          const denied = $.Deferred();
          queueMicrotask(() => denied.reject('Uploads are disabled in the read-only picker.'));
          return denied;
        }
      },
      getFileCallback(entity) {
        if (!entity || typeof entity.hash !== 'string' || entity.mime === 'directory' || !entity.read) {
          throw new Error('Select one readable file.');
        }
        if (selecting) return selecting;
        selecting = $.Deferred();
        const selected = selecting;
        selected.always(() => { selecting = undefined; });
        flushStorage().done(() => {
          rpc('select', { hash: entity.hash })
            .done(() => selected.resolve())
            .fail((_xhr, status, message) => selected.reject(status === 'abort' ? '' : message));
        }).fail((_xhr, _status, message) => selected.reject(message));
        return selected;
      }
    });
  } catch (cause) {
    showError(`Could not load the file picker. ${cause instanceof Error ? cause.message : String(cause)}`);
    document.getElementById('picker-go').disabled = true;
    return;
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (closed) return;
    if (!address.value.startsWith('/')) {
      showError('Enter an absolute folder path beginning with /.', true);
      address.focus();
      return;
    }
    if (navigation) { navigation.quiet = true; navigation.abort(); }
    showError('');
    form.setAttribute('aria-busy', 'true');
    const request = rpc('navigate', { path: address.value });
    navigation = request;
    request.done(result => {
      finder.request({ data: { cmd: 'open', target: result.target }, notify: { type: 'open', cnt: 1, hideCnt: true } })
        .done(() => finder.getUI().trigger('focus'));
    }).fail((_xhr, status, message) => {
      if (status !== 'abort') showError(message, true);
    }).always(() => {
      if (navigation === request) {
        navigation = undefined;
        form.setAttribute('aria-busy', 'false');
      }
    });
  });

  const observer = new ResizeObserver(() => finder.resize(content.clientWidth, content.clientHeight));
  observer.observe(content);
  window.addEventListener('pagehide', () => {
    closed = true;
    observer.disconnect();
    for (const entry of Array.from(pending.values())) {
      entry.deferred.quiet = true;
      entry.deferred.abort();
    }
  });
})();
