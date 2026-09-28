# OMP pi-natives Rust crate inventory and N-API binding evidence

> Source: pi_natives.linux-x64-modern.node embedded source paths (strings extraction); pi-natives/package.json; pi-natives/native/index.js; pi-natives-linux-x64/THIRD-PARTY-NOTICES.txt; pi-natives-linux-x64/package.json; ps output
> Collected: 2026-09-27
> Published: Unknown

## Crate inventory from binary strings

Extraction method: `strings pi_natives.linux-x64-modern.node | grep -oE "crates/pi-(predict|diff|edit|ast|vcs|vfs|walker|shell|iso|voice|builtins|natives)/src/[a-z0-9_]+\.rs"`

### pi-predict

Files found:
- crates/pi-predict/src/prose.rs

Note: no ngram.rs or smollm.rs paths appear in the extraction. The TS-side reference `pi_predict::smollm::open` appears in smollm-weights.ts line 52 comment. The ngram and smollm module files may be inlined or under different path patterns not captured by the grep.

### pi-diff

Files found:
- crates/pi-diff/src/lib.rs

### pi-edit

Files found:
- crates/pi-edit/src/diff_string.rs
- crates/pi-edit/src/fuzzy.rs
- crates/pi-edit/src/notebook.rs
- crates/pi-edit/src/path_policy.rs
- crates/pi-edit/src/session.rs
- crates/pi-edit/src/store.rs
- crates/pi-edit/src/stream_json.rs
- crates/pi-edit/src/text.rs

### pi-ast

Files found:
- crates/pi-ast/src/ops.rs
- crates/pi-ast/src/summary.rs

### pi-vcs

No source files found in this extraction pass (only referenced in crate name list).

### pi-vfs

Files found:
- crates/pi-vfs/src/canonicalize.rs
- crates/pi-vfs/src/dir.rs
- crates/pi-vfs/src/file.rs
- crates/pi-vfs/src/fs.rs
- crates/pi-vfs/src/path.rs
- crates/pi-vfs/src/provider.rs
- crates/pi-vfs/src/runtime.rs

### pi-walker

Files found:
- crates/pi-walker/src/lib.rs

### pi-shell

Files found:
- crates/pi-shell/src/cancel.rs
- crates/pi-shell/src/output_decode.rs
- crates/pi-shell/src/process.rs
- crates/pi-shell/src/shell.rs

### pi-iso

Files found:
- crates/pi-iso/src/diff.rs
- crates/pi-iso/src/lib.rs
- crates/pi-iso/src/zfs.rs

### pi-voice

Files found:
- crates/pi-voice/src/audio.rs
- crates/pi-voice/src/live.rs

### pi-builtins

Files found (103 .rs files, complete unique list):
alias.rs, base32.rs, bg.rs, bind.rs, break_.rs, builtin_.rs, caller.rs, cat.rs, cd.rs, cksum.rs, cmp.rs, combine.rs, comm.rs, command.rs, complete.rs, continue_.rs, cp.rs, cut.rs, date.rs, declare.rs, diff.rs, dirs.rs, dot.rs, echo.rs, enable.rs, errno.rs, eval.rs, exec.rs, exit.rs, export.rs, fc.rs, fd.rs, fg.rs, file_backup.rs, find.rs, getopts.rs, grep.rs, hash.rs, head.rs, help.rs, history.rs, host.rs, hostname.rs, ifne.rs, isutf8.rs, jobs.rs, jq.rs, kill.rs, let_.rs, ln.rs, ls.rs, mapfile.rs, mktemp.rs, mv.rs, nohup.rs, paste.rs, pidwait.rs, pkill.rs, popd.rs, printf.rs, proc_match.rs, proc_snapshot.rs, ps.rs, pushd.rs, pwd.rs, read.rs, realpath.rs, return_.rs, rg.rs, rm.rs, sed.rs, seq.rs, set.rs, shift.rs, shopt.rs, sleep.rs, sort.rs, sponge.rs, stat.rs, suspend.rs, tac.rs, tail.rs, tee.rs, test.rs, timeout.rs, times.rs, top.rs, touch.rs, tr.rs, trap.rs, truncate.rs, ts.rs, type_.rs, ulimit.rs, umask.rs, unalias.rs, unimp.rs, uniq.rs, unset.rs, wait.rs, wc.rs, xargs.rs, yes.rs

### pi-natives

Files found:
- crates/pi-natives/src/appearance.rs
- crates/pi-natives/src/ast.rs
- crates/pi-natives/src/audio.rs
- crates/pi-natives/src/crash_handler.rs
- crates/pi-natives/src/diff.rs
- crates/pi-natives/src/edit.rs
- crates/pi-natives/src/glob_util.rs
- crates/pi-natives/src/grep.rs
- crates/pi-natives/src/highlight.rs
- crates/pi-natives/src/iso.rs
- crates/pi-natives/src/js.rs
- crates/pi-natives/src/keys.rs
- crates/pi-natives/src/live.rs
- crates/pi-natives/src/power.rs
- crates/pi-natives/src/predict.rs
- crates/pi-natives/src/prof.rs
- crates/pi-natives/src/ps.rs
- crates/pi-natives/src/pty.rs
- crates/pi-natives/src/shell.rs
- crates/pi-natives/src/sixel.rs
- crates/pi-natives/src/snapcompact.rs
- crates/pi-natives/src/spelling.rs
- crates/pi-natives/src/task.rs
- crates/pi-natives/src/text.rs
- crates/pi-natives/src/tokens.rs
- crates/pi-natives/src/tty_writer.rs
- crates/pi-natives/src/vcs.rs
- crates/pi-natives/src/vectors.rs

## Rust build evidence

THIRD-PARTY-NOTICES.txt line 10804-10808:

```
RUST RUNTIME DEPENDENCY LICENSES
=================================

Generated from Cargo.lock by cargo-about 0.8.2 in locked, offline, workspace, all-feature, all-target mode, then restricted using cargo metadata to normal and build edges reachable from the workspace (development-only edges are excluded). cargo-deny independently evaluates the complete all-target graph.
```

## N-API registration evidence

Binary strings: `napi_register_module_v1` (single symbol, no v2+ variants found).

## pi-natives package.json evidence

pi-natives/package.json (v18.3.5):

- description: "Native Rust bindings for PDF conversion, audio, WebRTC, grep, clipboard, image processing, syntax highlighting, PTY, and shell operations via N-API"
- devDependencies: `"@napi-rs/cli": "3.7.2"` (line 50)
- napi config block (line 63-66): `"napi": { "binaryName": "pi_natives", "triples": {} }`
- scripts include `"gen:native": "bun scripts/embed-native.ts"` and `"gen:npm": "bun scripts/gen-npm-packages.ts"`
- engines: `"bun": ">=1.3.14"`

pi-natives-linux-x64/package.json (v18.3.5):
- main: "./pi_natives.linux-x64-baseline.node"
- files: ["*.node", "README.md", "LICENSE", "THIRD-PARTY-NOTICES.txt"]
- engines: `"bun": ">=1.3.14"`

## native/index.js export list

Classes exported (lines 26-45): AudioCapture, AudioPlayback, DesktopSession, DiffStream, EditSession, EditStore, FileLock, HighlightStream, LiveWebRtcPeer, MacAppearanceObserver, NativeOAuthCallback, PowerAssertion, Process, PtySession, Shell, TextPredictor, TtyWriter, VcsGitRepo, VcsJjWorkspace, VcsRepo

Functions exported (lines 48-138): __ompInstallTokioRuntime, __piNativesBuildVersion, appleFmAvailability, appleFmCancel, appleFmGenerate, astEdit, astGrep, astMatch, blockRangeAt, copyToClipboard, cosineSimilarityPairs, countTokens, decodeSixelToPng, detectMacOSAppearance, deviceCheckGenerateToken, diffLineRuns, diffLines, diffWords, editAutoGeneratedMessage, editDescription, editDiffString, editGrammar, editInspect, enclosingBlockBoundaries, encodeSixel, execReplace, executeShell, extractInlineSloppyRegions, extractSegments, fuzzyFind, getSupportedLanguages, getWorkProfile, glob, grep, hashlineCountOps, hashlineFileHash, hashlineFormatHeader, hashlineFormatNumberedLines, hashlineIsReadTruncationNotice, hashlineStripPrefixes, hasMatch, highlightCode, htmlToMarkdown, invalidateFsScanCache, isoBackend, isoDiff, isoIsUnavailableError, isoProbe, isoResolve, isoStart, isoStop, listWorkspace, macOSAutocorrectWord, macOSCheckSpelling, macOSSpellCheckerAvailable, macOSSpellingGuesses, matchesKey, matchesKittySequence, matchesLegacySequence, mmrRerankIndices, nodeChainAt, notebookToEditableText, parseKey, parseKittySequence, pdfToMarkdown, rasterizeSvg, readImageFromClipboard, renderMermaidAscii, renderSnapcompactPng, search, setHangulCompatJamoWidthOverride, sliceWithWidth, snapcompactSupportedChars, structuredPatchHunks, summarizeCode, supportsLanguage, truncateToWidth, vcsDetachGitDir, vcsDiscover, vcsDiscoverForDisplay, vcsGitClone, vcsGitDiscover, vcsGitRepoInfo, vcsIsPureJj, vcsJjDiscover, vcsJoinPatches, vcsValidateHunkSelections, vectorIndexTopK, visibleWidth, warmHighlighter, wrapTextWithAnsi

File header comment (lines 1-21): describes loadNative() pattern, gen-enums.ts regeneration after `napi build`, and missingNativeExport fallback for stale workspace trees.

## Live process tree (ps output, 2026-09-27)

```
PID 578292  TTY=pts/19  bun /home/cpf/.bun/bin/omp
PID 578807  PPID=578292  bun .../pi-coding-agent/dist/cli.js __omp_worker_daemon_broker
PID 578848  PPID=578807  bun .../pi-coding-agent/dist/cli.js __omp_worker_text_predict
```

Additional stale processes from an earlier session:
```
PID 42942   PPID=1     bun .../pi-coding-agent/dist/cli.js __omp_worker_daemon_broker
PID 43011   PPID=42942 bun .../pi-coding-agent/dist/cli.js __omp_worker_lsp_mux
PID 7323    TTY=pts/20 bun /home/cpf/.bun/bin/omp --resume=...2026-09-24...
```
