# Changelog

All notable changes to the Keyswap extension are documented in this file.

---

## [1.6.0] - 2026-05-07

### Added
- **Show/hide convert button setting**: Users can toggle the floating convert button on/off via the popup settings ("Show Convert Button" checkbox). The setting persists and applies immediately — toggling off hides the button on all pages without requiring a reload. The hotkey still works regardless of this setting.

### Changed
- **Extension renamed to Keyswap**: manifest, package.json, popup title, README, and CHANGELOG updated.
- **New app icon**: Blue circle with bold A + ع + swap arrows design.

### Files modified
- `src/shared/types.ts` — Added `showButton: boolean` to `Settings`
- `src/popup/popup.html` — Added "Show Convert Button" checkbox
- `src/popup/popup.ts` — Added handler for showButton setting
- `src/content/content.ts` — Button respects `showButton` setting, listens to `chrome.storage.onChanged` for real-time toggle
- `manifest.json` — Name changed to "Keyswap — Arabic/English"
- `package.json` — Name changed to "keyswap"

---

## [1.5.0] - 2026-05-07

### Fixed
- **Punctuation incorrectly converted**: `.` (period) was converting to `>` and `,` (comma) to `<` when converting Arabic to English. Root cause: shifted keyboard pairs like `['>', '.']` overwrote normal mappings in the `arToEn` map during `buildMaps()`. Fix: common punctuation characters (`. , ! ? ( ) - : " '` space, newline) are now preserved as identity mappings in `arToEn` after all pairs are processed, so they always map to themselves regardless of shifted pair conflicts.

### Changed
- **Floating convert button redesigned**: Smaller (18px vs 26px), semi-transparent background, positioned inside the input at the top corner (top-right for LTR, top-left for RTL) instead of outside. SVG icon scaled to 10px. Less intrusive and doesn't obscure content.

### Files modified
- `src/mapping/charMap.ts` — Added `PRESERVE_CHARS` identity mapping loop at end of `buildMaps()` to prevent shifted pairs from corrupting common punctuation in `arToEn`
- `src/content/content.ts` — Button size reduced to 18px, semi-transparent, repositioned to top corner inside input

---

## [1.4.0] - 2026-05-07

### Fixed
- **WhatsApp and Facebook multi-word conversion**: Meta's Lexical editor blocks `execCommand('insertText')` when the text contains spaces. Discovered via Playwright testing that single-word replacement works but multi-word silently fails. The fix: split text on spaces and insert word by word, with each subsequent word prefixed by its space (`' ' + word`) to prevent Lexical from dropping standalone space insertions.
- **Async timing bug breaking all contenteditable conversion**: `handleConvert()` called `await getSettings()` BEFORE capturing the element and selection range. The async gap allowed React/Lexical to change selection/focus/DOM state, making the captured range stale. Fix: capture element, text, and range SYNCHRONOUSLY before any async call.
- **`replaceInContentEditable` using wrong element**: Was reading `doc.activeElement` independently instead of using the element already found by `findEditableElement()`. Added `editableEl` to `ContentEditableResult` interface so the same element is used throughout.
- **Range spanning element boundaries on Lexical editors**: `selectNodeContents(outerDiv)` creates a cross-element range that Lexical blocks. Added `findDeepestTextContainer()` that walks down `<div>` > `<p>` > `<span>` to find the innermost single container holding all text.

### Changed
- **Floating convert button redesigned**: Smaller (18px vs 26px), semi-transparent, positioned inside the input at the top corner instead of outside. Less intrusive and doesn't confuse the user.
- **Simplified replacement strategy**: Removed complex 3-tier fallback cascade (which caused text duplication). Now: single `execCommand` for text without spaces, word-by-word for text with spaces. No more innerHTML save/restore or textContent fallback.

### Issues investigated with Playwright
- `execCommand('insertText', false, 'text with spaces')` returns `true` but Lexical silently blocks the insertion
- `execCommand('selectAll')` + `execCommand('insertText')` also blocked for multi-word
- `execCommand('delete')` on multi-word selection blocked by Lexical
- Synthetic paste events (`new ClipboardEvent('paste')`) ignored (untrusted)
- `execCommand('paste')` blocked by browser security
- Only `execCommand('insertText', false, 'singleword')` works reliably on Lexical
- Solution: split on spaces, insert word-by-word with leading space prefix

---

## [1.3.0] - 2026-05-06

### Fixed
- **TinyMCE and iframe-based editors now work**: TinyMCE uses `about:srcdoc` iframes which Chrome does NOT inject content scripts into (even with `all_frames: true`). The fix: the parent page's content script directly accesses same-origin iframe `contentDocument`. Keydown/focusin/input listeners attached to each iframe document via MutationObserver.
- **Facebook, WhatsApp Web, and React-based editors**: Added robust DOM traversal (`findEditableElement()`) that walks up, down, and checks `[role="textbox"]` and `[contenteditable="true"]` patterns.
- **Background service worker error**: Wrapped `chrome.tabs.sendMessage()` in try/catch to prevent "Could not establish connection" errors on `chrome://` pages.

### Changed
- **`textSelection.ts` functions accept `win`/`doc` context**: Enables operating inside iframe documents (TinyMCE) with correct `getSelection()` and `createRange()` calls.
- **Floating button shows for iframe editors**: Attached focusin/input/focusout listeners inside iframe documents to trigger button positioning on the parent page's `<iframe>` element.

---

## [1.2.0] - 2026-05-06

### Added
- **Rich text editor support (TinyMCE, CKEditor, etc.)**: Content script now runs in all frames (`all_frames: true` in manifest). iframe-based editors like TinyMCE are fully supported — the hotkey works inside the iframe editor.
- **Floating convert button**: A small circular button (swap icon) appears next to any focused input/textarea/contenteditable when it contains text. Click it to convert — works as an alternative to the keyboard shortcut. RTL-aware: appears on the left for RTL inputs, right for LTR inputs. Only shown in the top frame (not inside iframes).
- **Scroll/resize tracking**: The floating button repositions when the page is scrolled or the window is resized.

### Changed
- **Selection preserved after conversion**: When the user selects text and converts it, the converted text remains selected. This allows pressing the shortcut again to re-convert (toggle back). When converting the full input (no selection), the cursor is placed at the end as before.

### Files modified
- `manifest.json` — Added `"all_frames": true` to content_scripts
- `src/core/textSelection.ts` — Added `hadSelection` flag to `TextRange` and `ContentEditableResult`. `replaceInInput()` and `replaceInContentEditable()` now preserve selection when `hadSelection` is true. Re-selects converted text in contenteditable using range manipulation.
- `src/content/content.ts` — Added floating button with SVG icon, focus/blur/input/scroll/resize listeners, top-frame guard (`window === window.top`), passes `hadSelection` through to replace functions. Toast notification also guarded to top frame only.

---

## [1.1.0] - 2026-05-06

### Added
- **Mac Arabic keyboard layout support**: Added complete Mac Arabic (macOS default) layout alongside the existing PC Arabic (Windows) layout. The two layouts differ significantly in the bottom row and some punctuation keys.
- **Layout auto-detection**: The extension automatically detects the user's platform (Mac vs PC) and selects the appropriate Arabic keyboard layout. Defaults to Mac on macOS, PC on Windows/Linux.
- **Layout selector in settings**: Users can manually choose between Auto-detect, Mac Arabic, or PC Arabic in the popup settings.
- **Platform-aware shortcut label**: The popup now shows "Option + Space" on Mac and "Alt + Space" on Windows/Linux instead of a hardcoded "Alt + Space".

### Changed
- **Full input conversion when no selection**: Previously, the extension attempted to detect the current word at the cursor position when no text was selected. Now it converts the entire input field content, which is more predictable and useful.
- **Converter accepts layout parameter**: The `convert()` function now takes a `LayoutMaps` parameter instead of using hardcoded global maps, enabling runtime layout switching.

### Fixed
- **Incorrect character mapping on Mac**: Characters like `n`, `]`, `v`, `m` and others were mapped to wrong Arabic characters because the extension only supported the PC Arabic layout. Example: typing `tjn]` produced `فتىد` instead of the correct `فترة` on Mac Arabic.

### Files modified
- `src/mapping/charMap.ts` — Rewritten: separate PC and Mac layout arrays, `buildMaps()` function, `detectPlatformLayout()`
- `src/shared/types.ts` — Added `LayoutSetting` type and `layout` field to `Settings`
- `src/shared/storage.ts` — No code changes (settings shape updated via types)
- `src/core/converter.ts` — `convert()` now accepts `LayoutMaps` parameter
- `src/core/textSelection.ts` — Removed word boundary detection; returns full input content when no selection
- `src/content/content.ts` — Resolves layout from settings before each conversion
- `src/popup/popup.html` — Added layout dropdown, dynamic modifier key label
- `src/popup/popup.ts` — Platform detection for label, layout change handler
- `src/popup/popup.css` — Added select dropdown styling

---

## [1.0.0] - 2026-05-06

### Added
- Initial release of Keyswap Chrome extension
- **Bidirectional Arabic/English conversion**: Convert mistyped text between Arabic and English keyboard layouts
- **Hotkey-triggered conversion**: Default shortcut `Alt+Space` (uses Chrome Commands API + keydown listener)
- **Browser-wide compatibility**: Works in `<input>`, `<textarea>`, and `contenteditable` elements
- **In-place text replacement**: Replaces text without page refresh, preserves caret position
- **React/Vue compatibility**: Uses native value setter + input event dispatch for framework-controlled inputs
- **Lightweight toast notification**: Shows conversion result in a non-intrusive popup (auto-dismisses after 1.5s)
- **Settings popup**: Enable/disable extension, toggle notifications, link to customize shortcut
- **Local processing**: All text conversion happens locally in the browser — no external API calls, no text logging
- **Chrome Storage API**: User preferences persist across sessions via `chrome.storage.sync`
- **PC Arabic keyboard layout**: Standard Windows Arabic QWERTY layout mapping (28 letter keys + shifted variants)
- **Character mapping engine**: O(1) Map-based lookups with 2-character lookahead for ligatures (e.g., `لا`)
- **Language auto-detection**: Regex-based Arabic vs Latin character counting to determine conversion direction

### Technical details
- Chrome Extension Manifest V3
- TypeScript with strict mode
- Vite + vite-plugin-web-extension for build (each entry built as self-contained IIFE)
- Minimal permissions: `storage` only
- Content script injected at `document_idle` on all URLs
- Background service worker forwards `chrome.commands` to content script

### Project structure created
```
src/
├── mapping/charMap.ts      — Keyboard layout character mapping
├── core/converter.ts       — Language detection + conversion engine
├── core/textSelection.ts   — DOM text extraction and replacement
├── content/content.ts      — Content script (hotkey + orchestration)
├── background/background.ts — Service worker
├── popup/                  — Settings UI (HTML/CSS/TS)
└── shared/                 — Types + Chrome storage wrapper
```
