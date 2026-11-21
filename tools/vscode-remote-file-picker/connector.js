const path = require('node:path').posix;

const disabled = [
  'upload', 'mkdir', 'mkfile', 'rename', 'rm', 'duplicate', 'paste', 'cut', 'copy',
  'edit', 'resize', 'chmod', 'archive', 'extract', 'netmount', 'netunmount',
  'download', 'zipdl', 'quicklook', 'file', 'get', 'put', 'tmb', 'url', 'dim',
  'search', 'size', 'help', 'info', 'preference', 'opennew',
];

function validatePath(value) {
  if (typeof value !== 'string' || !path.isAbsolute(value) || value.includes('\0')
      || path.normalize(value) !== value || (value !== '/' && value.endsWith('/'))
      || Buffer.from(value).toString('utf8') !== value) {
    throw new TypeError('Expected a canonical absolute POSIX path.');
  }
  return value;
}

function directoryPath(value) {
  const normalized = path.normalize(value);
  return validatePath(normalized.length > 1 && normalized.endsWith('/') ? normalized.slice(0, -1) : normalized);
}

function hashFor(value) {
  return `rp_${Buffer.from(value, 'utf8').toString('base64url')}`;
}

function pathFor(hash) {
  if (typeof hash !== 'string' || !/^rp_[A-Za-z0-9_-]+$/.test(hash)) {
    throw new TypeError('Invalid file hash.');
  }
  const value = validatePath(Buffer.from(hash.slice(3), 'base64url').toString('utf8'));
  if (hashFor(value) !== hash) throw new TypeError('Invalid file hash.');
  return value;
}

function createConnector({ fs, baseUri, initialPath }) {
  initialPath = directoryPath(initialPath);
  const startHash = hashFor(initialPath);
  const uriFor = value => baseUri.with({ path: value, query: '', fragment: '' });

  function view() {
    const nodes = new Map();
    const directories = new Map();

    function inspect(value) {
      if (!nodes.has(value)) nodes.set(value, inspectNode(value));
      return nodes.get(value);
    }

    async function inspectNode(value) {
      const stat = await fs.stat(uriFor(value));
      const directory = Boolean(stat.type & 2);
      const regular = Boolean(stat.type & 1);
      // read permits an open attempt; directory access is checked when listing.
      const file = {
        name: value === '/' ? '/' : path.basename(value),
        hash: hashFor(value),
        mime: directory ? 'directory' : 'application/octet-stream',
        ts: Math.floor(stat.mtime / 1000),
        size: stat.size,
        read: Number(directory || regular),
        write: 0,
        locked: 1,
        path: value,
      };
      if (value !== '/') file.phash = hashFor(path.dirname(value));
      else file.volumeid = 'rp_';
      if (directory) file.dirs = -1; // Native elFinder asks subdirs for deferred hints.
      return { file };
    }

    function directory(value) {
      if (!directories.has(value)) directories.set(value, inspectDirectory(value));
      return directories.get(value);
    }

    async function inspectDirectory(value) {
      const node = await inspect(value);
      if (node.file.mime !== 'directory') {
        throw Object.assign(new Error(`Not a directory: ${value}`), { code: 'FileNotADirectory' });
      }
      try {
        node.entries = await fs.readDirectory(uriFor(value));
      } catch (error) {
        if (error.code !== 'NoPermissions') throw error;
        node.file.read = 0;
        delete node.file.dirs;
        node.readError = error;
      }
      return node;
    }

    async function subdirectories(value) {
      const node = await directory(value);
      if (node.readError || node.file.dirs !== -1) return node;
      node.file.dirs = 0;
      for (const [name, type] of node.entries) {
        if (type & 2) {
          node.file.dirs = 1;
          break;
        }
        if (!(type & 1)) {
          let child;
          try {
            child = await inspect(path.join(value, name));
          } catch (error) {
            if (error.code === 'ENOENT' || error.code === 'FileNotFound') continue;
            throw error;
          }
          if (child.file.mime === 'directory') {
            node.file.dirs = 1;
            break;
          }
        }
      }
      return node;
    }

    async function children(value, onlyDirectories = false) {
      const node = await directory(value);
      if (node.readError) throw node.readError;
      const files = [];
      for (let offset = 0; offset < node.entries.length; offset += 16) {
        const batch = await Promise.all(node.entries.slice(offset, offset + 16).map(async ([name, type]) => {
          if (onlyDirectories && (type & 1) && !(type & 2)) return;
          const child = (await inspect(path.join(value, name))).file;
          if (!onlyDirectories || child.mime === 'directory') return child;
        }));
        for (const file of batch) if (file) files.push(file);
      }
      node.file.dirs = Number(files.some(file => file.mime === 'directory'));
      return files;
    }

    async function parents(value, until) {
      const ancestors = [];
      for (let current = value; ; current = path.dirname(current)) {
        ancestors.unshift(current);
        if (current === '/' || current === until) break;
      }
      const files = new Map();
      for (const current of ancestors) {
        const node = await directory(current);
        files.set(node.file.hash, node.file);
        if (current !== value && !node.readError) {
          for (const file of await children(current, true)) files.set(file.hash, file);
        }
      }
      return [...files.values()];
    }

    return { inspect, directory, subdirectories, children, parents };
  }

  async function request(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new TypeError('Expected an elFinder request object.');
    }
    const state = view();
    switch (data.cmd) {
      case 'abort':
        return {};
      case 'open': {
        const value = data.target === undefined || data.target === '' ? initialPath : pathFor(data.target);
        const node = await state.directory(value);
        const files = new Map([[node.file.hash, node.file]]);
        for (const file of await state.children(value)) files.set(file.hash, file);
        if (data.init) {
          for (const file of await state.parents(value)) files.set(file.hash, file);
        } else if (data.tree) {
          const root = await state.inspect('/');
          files.set(root.file.hash, root.file);
        }
        const response = {
          cwd: node.file,
          files: [...files.values()],
          options: { path: value, separator: '/', disabled: [...disabled] },
        };
        if (data.init) Object.assign(response, { api: '2.1', netDrivers: [] });
        return response;
      }
      case 'tree': {
        const value = pathFor(data.target);
        const node = await state.directory(value);
        return { tree: [node.file, ...await state.children(value, true)] };
      }
      case 'parents': {
        const value = pathFor(data.target);
        const until = data.until === undefined || data.until === '' ? undefined : pathFor(data.until);
        if (until !== undefined && value !== until && until !== '/' && !value.startsWith(`${until}/`)) {
          throw new TypeError('The parent limit must be an ancestor directory.');
        }
        return { tree: await state.parents(value, until) };
      }
      case 'subdirs': {
        if (!Array.isArray(data.targets)) throw new TypeError('Expected target hashes.');
        const values = data.targets.map(pathFor);
        const nodes = await Promise.all(values.map(value => state.subdirectories(value)));
        // Denied directories update permissions, not a false empty-folder hint.
        return {
          subdirs: Object.fromEntries(nodes.filter(node => !node.readError)
            .map(node => [node.file.hash, node.file.dirs])),
          changed: nodes.map(node => node.file),
        };
      }
      case 'info': {
        if (!Array.isArray(data.targets)) throw new TypeError('Expected target hashes.');
        const values = data.targets.map(pathFor);
        return { files: await Promise.all(values.map(async value => {
          const node = await state.inspect(value);
          return node.file.mime === 'directory' ? (await state.subdirectories(value)).file : node.file;
        })) };
      }
      case 'ls': {
        const value = pathFor(data.target);
        if (data.intersect !== undefined && (!Array.isArray(data.intersect)
            || data.intersect.some(name => typeof name !== 'string'))) {
          throw new TypeError('Expected intersect names.');
        }
        const node = await state.directory(value);
        if (node.readError) throw node.readError;
        const names = data.intersect?.length ? new Set(data.intersect) : undefined;
        return { list: Object.fromEntries(node.entries
          .filter(([name]) => !names || names.has(name))
          .map(([name]) => [hashFor(path.join(value, name)), name])) };
      }
      default:
        throw new Error(`Unsupported read-only connector command: ${String(data.cmd)}`);
    }
  }

  async function navigate(value) {
    value = directoryPath(value);
    const node = await view().directory(value);
    if (node.readError) throw node.readError;
    return { target: node.file.hash, path: value };
  }

  async function select(hash) {
    const value = pathFor(hash);
    const stat = await fs.stat(uriFor(value));
    if (!(stat.type & 1) || stat.type & 2) {
      throw Object.assign(new Error(`Not a file: ${value}`), { code: 'FileIsADirectory' });
    }
    return uriFor(value);
  }

  return { startHash, request, navigate, select };
}

module.exports = { createConnector };
