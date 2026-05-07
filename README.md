# Keyswap — Arabic/English Smart Typing Correction

A Chrome browser extension that detects and corrects mistyped Arabic and English keyboard input caused by incorrect keyboard layout selection. Works across standard inputs, rich text editors (TinyMCE, CKEditor), and React-based editors (WhatsApp Web, Facebook).

## Features

- Bidirectional Arabic <> English text conversion
- Supports both **Mac Arabic** and **PC Arabic** keyboard layouts with auto-detection
- Works in `<input>`, `<textarea>`, `contenteditable`, iframe-based editors (TinyMCE), and Lexical-based editors (WhatsApp, Facebook)
- Converts selected text or entire input content (no selection needed)
- Selected text stays selected after conversion for easy re-conversion (toggle back)
- Floating convert button appears on focused inputs (small, non-intrusive)
- Lightweight toast notification on conversion
- Platform-aware shortcut label (Option on Mac, Alt on Windows)
- All processing is local — no external API calls, no text stored or logged

## Requirements

- Node.js 18+
- npm 9+
- Google Chrome, Microsoft Edge, Brave, or Opera (Chromium-based)

## Installation & Setup

### 1. Install dependencies

```bash
cd keyboard
npm install
```

### 2. Build the extension

```bash
npm run build
```

This runs TypeScript type checking followed by the Vite build. Output goes to the `dist/` directory.

### 3. Load in Chrome

1. Open `chrome://extensions/` in your browser
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **Load unpacked**
4. Select the `dist/` folder inside the project directory
5. The extension icon should appear in your toolbar

### 4. Development mode (watch)

```bash
npm run dev
```

Rebuilds automatically when source files change. After each rebuild, click the reload button on the extension card in `chrome://extensions/`.

## Usage

### Converting text

1. Click into any text input, textarea, or rich text editor
2. Type text (it appears in the wrong language if your keyboard layout was incorrect)
3. Press the keyboard shortcut:
   - **Mac**: `Option + Space`
   - **Windows/Linux**: `Alt + Space`
4. The text converts instantly

Alternatively, click the small floating convert button that appears at the top corner of focused inputs.

### Conversion behavior

| Scenario | What gets converted |
|----------|-------------------|
| Text is selected | Only the selected text (stays selected after conversion) |
| No text selected | Entire input field content |

### Settings

Click the extension icon in the toolbar to access settings:

- **Enabled** — Turn the extension on/off
- **Show Notifications** — Toggle the toast notification after conversion
- **Show Convert Button** — Toggle the floating convert button on focused inputs
- **Keyboard Layout** — Choose between Auto-detect, Mac Arabic, or PC Arabic
- **Customize shortcut** — Opens Chrome's keyboard shortcuts page

## Keyboard Shortcut

The default shortcut is `Alt+Space` (shown as `Option+Space` on Mac).

To customize:
1. Go to `chrome://extensions/shortcuts`
2. Find "Keyswap - Arabic/English"
3. Click the pencil icon next to "Convert selected text or current word"
4. Press your desired key combination

## Project Structure

```
keyboard/
├── manifest.json              # Chrome MV3 extension manifest
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── vite.config.ts             # Vite build configuration
├── public/
│   └── icons/                 # Extension icons (16, 48, 128px)
├── src/
│   ├── global.d.ts            # Chrome types reference
│   ├── mapping/
│   │   └── charMap.ts         # Bidirectional keyboard layout mappings (Mac + PC)
│   ├── core/
│   │   ├── converter.ts       # Language detection + text conversion engine
│   │   └── textSelection.ts   # Text extraction, DOM replacement, Lexical workarounds
│   ├── content/
│   │   └── content.ts         # Content script: element detection, hotkey, floating button
│   ├── background/
│   │   └── background.ts      # Service worker (forwards chrome.commands)
│   ├── popup/
│   │   ├── popup.html         # Settings popup markup
│   │   ├── popup.ts           # Settings popup logic
│   │   └── popup.css          # Settings popup styles
│   └── shared/
│       ├── types.ts           # Shared TypeScript interfaces
│       └── storage.ts         # Chrome Storage API wrapper
└── dist/                      # Built extension (load this in Chrome)
```

## npm Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Type check + production build |
| `npm run dev` | Watch mode (rebuilds on file changes) |
| `npm run typecheck` | TypeScript type checking only |

## Supported Keyboard Layouts

### Mac Arabic (macOS default)

The default Arabic keyboard layout on macOS. Key differences from PC layout are mainly in the bottom row and some punctuation:

| Key | Mac Arabic | PC Arabic |
|-----|-----------|-----------|
| z | ظ | ئ |
| x | ط | ء |
| c | ذ | ؤ |
| v | د | ر |
| b | ز | لا |
| n | ر | ى |
| m | و | ة |
| ] | ة | د |
| , | ، | و |
| . | . | ز |
| / | / | ظ |
| ' | ؛ | ط |

## Supported Editors

| Editor Type | Status | How it works |
|------------|--------|-------------|
| `<input>` and `<textarea>` | Full support | Native value setter + input event dispatch |
| YouTube search bar | Full support | Standard `<input>` handling |
| Simple `contenteditable` | Full support | `execCommand('insertText')` |
| Gmail compose | Full support | `execCommand('insertText')` |
| TinyMCE (iframe-based) | Full support | Keydown listeners attached to iframe document, parent accesses `iframe.contentDocument` |
| WhatsApp Web (Lexical) | Full support | Word-by-word `execCommand('insertText')` to bypass Lexical's space-blocking |
| Facebook (Lexical) | Full support | Same word-by-word approach as WhatsApp |
| React-controlled inputs | Full support | Native value setter trick for framework compatibility |
| Google Docs (canvas) | Not supported | Canvas-based rendering, no DOM access |

## Testing

### Manual test checklist

1. **Basic conversion**: Type English text with Arabic layout active, press shortcut — converts to Arabic
2. **Reverse conversion**: Type Arabic text with English layout active, press shortcut — converts to English
3. **No selection**: Place cursor in a filled input, press shortcut — entire input converts
4. **With selection**: Select part of the text, press shortcut — only selected text converts, stays selected
5. **Re-conversion**: After converting selected text, press shortcut again — toggles back
6. **Multi-word on WhatsApp**: Type a sentence, press shortcut — all words convert with spaces preserved
7. **Multi-word on Facebook**: Open create post, type sentence, press shortcut — converts correctly
8. **TinyMCE**: Test on any page with TinyMCE editor — hotkey works inside iframe
9. **Floating button**: Focus an input with text — small button appears at top corner
10. **Mac layout**: Type `tjn]` and convert — should produce `فترة`
11. **Notification**: Verify toast appears in top-right corner
12. **Settings**: Toggle settings in popup, verify persistence after reload
13. **Layout switching**: Change layout between Auto/Mac/PC, verify correct conversion

## Architecture

### Content Script Flow

```
User presses Option+Space (or clicks floating button)
  │
  ├─ handleConvert() called
  │   ├─ Capture element + text + range SYNCHRONOUSLY (before any async)
  │   ├─ await getSettings() (async — safe because data already captured)
  │   ├─ convert(text, layoutMaps) → converted text
  │   └─ Replace text in element
  │       ├─ <input>/<textarea>: native value setter + input event
  │       └─ contenteditable:
  │           ├─ No spaces in text: single execCommand('insertText')
  │           └─ Has spaces: word-by-word execCommand (Lexical workaround)
  │
  └─ Show toast notification
```

### Editable Element Detection

`findEditableElement()` handles complex DOM structures:

1. Check `document.activeElement` directly
2. If it's an `<iframe>` — access `iframe.contentDocument.body` (TinyMCE)
3. Walk UP the DOM tree for `contenteditable` ancestors
4. Walk DOWN for `[contenteditable="true"]` children
5. Check `[role="textbox"]` pattern (Facebook, WhatsApp)
6. Scan all same-origin iframes as last resort

### Iframe Support

TinyMCE uses `about:srcdoc` iframes which Chrome does NOT inject content scripts into (even with `all_frames: true`). The parent page's content script:
- Accesses `iframe.contentDocument` directly (same-origin)
- Attaches `keydown`, `focusin`, `input`, `focusout` listeners to each iframe document
- Uses a `MutationObserver` to detect dynamically added iframes

### Lexical Editor Workaround (WhatsApp, Facebook)

Meta's Lexical editor blocks `document.execCommand('insertText', false, text)` when `text` contains spaces. The workaround:

```
Split "word1 word2 word3" into:
  execCommand('insertText', false, 'word1')    ← replaces selection
  execCommand('insertText', false, ' word2')   ← space attached to word
  execCommand('insertText', false, ' word3')   ← space attached to word
```

Each call inserts text without standalone spaces, which Lexical accepts.

### Punctuation Preservation

When building the `arToEn` reverse mapping, shifted keyboard pairs (e.g., `['>', '.']`) can overwrite normal pairs and cause common punctuation to convert incorrectly (`.` becoming `>`, `,` becoming `<`). After building all mappings, `buildMaps()` applies identity overrides for common punctuation:

```
Preserved characters: . , ! ? ( ) - : " ' space newline
```

These always map to themselves in `arToEn`, regardless of any shifted pair conflicts. This does not affect `enToAr` — typing `.` on an English keyboard still correctly maps to the Arabic character on that key position.

## Known Limitations

- Google Docs (canvas-based rendering) is not supported
- Shadow DOM elements may not be accessible
- `Alt+Space` may conflict with OS-level shortcuts on some platforms (customizable via Chrome shortcuts)
- Cross-origin iframes cannot be accessed (security restriction)

## Tech Stack

- TypeScript (strict mode)
- Vite + vite-plugin-web-extension (builds each entry as self-contained IIFE)
- Chrome Extension Manifest V3
- Chrome Storage API
