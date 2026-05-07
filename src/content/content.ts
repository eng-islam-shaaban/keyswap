import { convert } from '../core/converter';
import {
  getTextFromInput,
  replaceInInput,
  getTextFromContentEditable,
  replaceInContentEditable,
} from '../core/textSelection';
import { getSettings } from '../shared/storage';
import { buildMaps, detectPlatformLayout } from '../mapping/charMap';
import type { LayoutMaps } from '../mapping/charMap';
import type { ConvertMessage } from '../shared/types';

const isTopFrame = window === window.top;

function isInputElement(el: Element): el is HTMLInputElement | HTMLTextAreaElement {
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
}

function isContentEditable(el: Element): boolean {
  return (el as HTMLElement).isContentEditable === true;
}

// ── Editable element detection ──────────────────────────────────

interface EditableTarget {
  el: Element;
  win: Window;
  doc: Document;
}

function tryIframeEditable(iframe: HTMLIFrameElement): EditableTarget | null {
  try {
    const iframeDoc = iframe.contentDocument;
    const iframeWin = iframe.contentWindow;
    if (!iframeDoc || !iframeWin) return null;

    const iframeActive = iframeDoc.activeElement;
    if (iframeActive && isContentEditable(iframeActive)) {
      return { el: iframeActive, win: iframeWin, doc: iframeDoc };
    }
    if (iframeDoc.body && isContentEditable(iframeDoc.body)) {
      return { el: iframeDoc.body, win: iframeWin, doc: iframeDoc };
    }
  } catch { /* cross-origin */ }
  return null;
}

function findEditableElement(): EditableTarget | null {
  const el = document.activeElement;
  if (!el || el === document.body) return null;

  // Iframe-based editors (TinyMCE, CKEditor)
  if (el.tagName === 'IFRAME') {
    return tryIframeEditable(el as HTMLIFrameElement);
  }

  // Direct match
  if (isInputElement(el)) return { el, win: window, doc: document };
  if (isContentEditable(el)) return { el, win: window, doc: document };

  // Walk up to find contenteditable ancestor
  let parent = el.parentElement;
  while (parent && parent !== document.body) {
    if (isContentEditable(parent)) return { el: parent, win: window, doc: document };
    parent = parent.parentElement;
  }

  // Walk down for role="textbox" patterns (Facebook, WhatsApp)
  const editableChild = el.querySelector('[contenteditable="true"]');
  if (editableChild) return { el: editableChild, win: window, doc: document };

  const textbox = el.closest('[role="textbox"]');
  if (textbox) {
    if (isContentEditable(textbox)) return { el: textbox, win: window, doc: document };
    const child = textbox.querySelector('[contenteditable="true"]');
    if (child) return { el: child, win: window, doc: document };
  }

  // Last resort: scan all same-origin iframes
  const iframes = document.querySelectorAll('iframe');
  for (const iframe of iframes) {
    const result = tryIframeEditable(iframe as HTMLIFrameElement);
    if (result) return result;
  }

  return null;
}

function findEditableFromTarget(target: Element): EditableTarget | null {
  if (isInputElement(target)) return { el: target, win: window, doc: document };
  if (isContentEditable(target)) return { el: target, win: window, doc: document };

  if (target.tagName === 'IFRAME') {
    return tryIframeEditable(target as HTMLIFrameElement);
  }

  // Walk up
  let parent = target.parentElement;
  while (parent && parent !== document.body) {
    if (isContentEditable(parent)) return { el: parent, win: window, doc: document };
    parent = parent.parentElement;
  }

  // Walk down
  const editableChild = target.querySelector('[contenteditable="true"]');
  if (editableChild) return { el: editableChild, win: window, doc: document };

  const textbox = target.closest('[role="textbox"]');
  if (textbox) {
    if (isContentEditable(textbox)) return { el: textbox, win: window, doc: document };
    const child = textbox.querySelector('[contenteditable="true"]');
    if (child) return { el: child, win: window, doc: document };
  }

  return null;
}

// ── Toast notification ──────────────────────────────────────────

function showNotification(original: string, converted: string): void {
  if (!isTopFrame) return;

  const existing = document.getElementById('kbd-switcher-toast');
  if (existing) existing.remove();

  const el = document.createElement('div');
  el.id = 'kbd-switcher-toast';
  el.textContent = `"${original.slice(0, 25)}" → "${converted.slice(0, 25)}"`;
  el.style.cssText = `
    position: fixed; top: 16px; right: 16px; z-index: 2147483647;
    background: #323232; color: #fff; padding: 8px 16px;
    border-radius: 6px; font-size: 13px; font-family: system-ui, sans-serif;
    opacity: 0; transition: opacity 0.2s; direction: ltr;
    pointer-events: none; max-width: 400px; overflow: hidden;
    text-overflow: ellipsis; white-space: nowrap;
  `;
  document.body.appendChild(el);
  requestAnimationFrame(() => { el.style.opacity = '1'; });
  setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 300);
  }, 1500);
}

// ── Core conversion logic ───────────────────────────────────────

function resolveLayout(setting: string): LayoutMaps {
  const layout = setting === 'auto' ? detectPlatformLayout() : setting as 'mac' | 'pc';
  return buildMaps(layout);
}

async function handleConvert(): Promise<void> {
  // IMPORTANT: Capture element, text, and range SYNCHRONOUSLY before any async call.
  // await getSettings() introduces a microtask delay during which React/WhatsApp/Facebook
  // can change the selection, focus, or DOM — making ranges and elements stale.
  const target = findEditableElement();
  if (!target) return;

  let inputRange: ReturnType<typeof getTextFromInput> = null;
  let ceResult: ReturnType<typeof getTextFromContentEditable> = null;

  if (isInputElement(target.el)) {
    inputRange = getTextFromInput(target.el);
    if (!inputRange) return;
  } else if (isContentEditable(target.el)) {
    ceResult = getTextFromContentEditable(target.el, target.win, target.doc);
    if (!ceResult) return;
  } else {
    return;
  }

  // Now safe to do async work — we already captured everything
  const settings = await getSettings();
  if (!settings.enabled) return;

  const maps = resolveLayout(settings.layout);
  let original: string | undefined;
  let converted: string | undefined;

  if (inputRange) {
    original = inputRange.text;
    converted = convert(original, maps);
    if (converted === original) return;
    replaceInInput(target.el as HTMLInputElement | HTMLTextAreaElement, inputRange.start, inputRange.end, converted, inputRange.hadSelection);
  } else if (ceResult) {
    original = ceResult.text;
    converted = convert(original, maps);
    if (converted === original) return;
    replaceInContentEditable(ceResult, converted);
  }

  if (settings.notificationsEnabled && original && converted) {
    showNotification(original, converted);
  }
}

// ── Keyboard shortcut listener ──────────────────────────────────

function handleKeydown(e: KeyboardEvent): void {
  if (e.altKey && e.code === 'Space') {
    e.preventDefault();
    e.stopPropagation();
    handleConvert();
  }
}

document.addEventListener('keydown', handleKeydown);

// Listen for command from background service worker
chrome.runtime.onMessage.addListener((message: ConvertMessage) => {
  if (message.type === 'CONVERT_TEXT') {
    handleConvert();
  }
  return undefined;
});

// ── Floating convert button (top frame only) ────────────────────

let floatingBtn: HTMLElement | null = null;
let currentTarget: Element | null = null;
let buttonEnabled = true;

// Load and watch the showButton setting
getSettings().then(s => { buttonEnabled = s.showButton; });
chrome.storage.onChanged.addListener((changes) => {
  if (changes.showButton) {
    buttonEnabled = changes.showButton.newValue;
    if (!buttonEnabled) hideButton();
  }
});

function hasText(el: Element): boolean {
  if (isInputElement(el)) {
    return (el as HTMLInputElement | HTMLTextAreaElement).value.length > 0;
  }
  return (el.textContent || '').trim().length > 0;
}

function positionButton(el: Element): void {
  if (!isTopFrame || !buttonEnabled) return;
  if (!floatingBtn) floatingBtn = createFloatingButton();

  const rect = el.getBoundingClientRect();
  const isRtl = getComputedStyle(el).direction === 'rtl';

  // Position inside the input at the top corner — subtle and non-intrusive
  if (isRtl) {
    floatingBtn.style.left = `${rect.left + window.scrollX + 4}px`;
  } else {
    floatingBtn.style.left = `${rect.right + window.scrollX - 22}px`;
  }
  floatingBtn.style.top = `${rect.top + window.scrollY + 4}px`;
  floatingBtn.style.opacity = '1';
  floatingBtn.style.pointerEvents = 'auto';
  currentTarget = el;
}

function hideButton(): void {
  if (floatingBtn) {
    floatingBtn.style.opacity = '0';
    floatingBtn.style.pointerEvents = 'none';
    currentTarget = null;
  }
}

function createFloatingButton(): HTMLElement {
  const BUTTON_SVG = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>`;

  const btn = document.createElement('div');
  btn.id = 'kbd-switcher-btn';
  btn.innerHTML = BUTTON_SVG;
  btn.title = 'Convert text';
  btn.style.cssText = `
    position: absolute; width: 18px; height: 18px;
    background: rgba(66, 133, 244, 0.75); color: #fff; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; z-index: 2147483646;
    opacity: 0; transition: opacity 0.15s ease;
    pointer-events: none;
    user-select: none;
  `;
  btn.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleConvert();
  });
  document.body.appendChild(btn);
  return btn;
}

function findIframeForDocument(doc: Document): HTMLIFrameElement | null {
  const iframes = document.querySelectorAll('iframe');
  for (const iframe of iframes) {
    try {
      if ((iframe as HTMLIFrameElement).contentDocument === doc) return iframe as HTMLIFrameElement;
    } catch { /* cross-origin */ }
  }
  return null;
}

function showButtonForTarget(target: EditableTarget): void {
  if (!isTopFrame) return;
  const posEl = target.doc !== document
    ? findIframeForDocument(target.doc)
    : target.el;
  if (posEl && hasText(target.el)) {
    positionButton(posEl);
  }
}

function showButtonForIframe(iframe: HTMLIFrameElement): void {
  if (!isTopFrame) return;
  try {
    const body = iframe.contentDocument?.body;
    if (body && hasText(body)) {
      positionButton(iframe);
    }
  } catch { /* cross-origin */ }
}

// ── Iframe listener attachment ──────────────────────────────────

function attachIframeListeners(): void {
  const iframes = document.querySelectorAll('iframe');
  for (const iframe of iframes) {
    try {
      const iframeDoc = (iframe as HTMLIFrameElement).contentDocument;
      if (!iframeDoc) continue;
      if ((iframeDoc as any).__kbdSwitcherAttached) continue;
      (iframeDoc as any).__kbdSwitcherAttached = true;

      const iframeEl = iframe as HTMLIFrameElement;

      // Hotkey inside iframe
      iframeDoc.addEventListener('keydown', handleKeydown);

      // Floating button: detect focus/input/blur inside iframe
      iframeDoc.addEventListener('focusin', () => {
        showButtonForIframe(iframeEl);
      });
      iframeDoc.addEventListener('input', () => {
        showButtonForIframe(iframeEl);
      });
      iframeDoc.addEventListener('focusout', () => {
        setTimeout(() => hideButton(), 200);
      });
    } catch {
      // Cross-origin — skip
    }
  }
}

attachIframeListeners();
const iframeObserver = new MutationObserver(() => attachIframeListeners());
iframeObserver.observe(document.body, { childList: true, subtree: true });

// ── Main page floating button events ────────────────────────────

if (isTopFrame) {
  document.addEventListener('focusin', (e) => {
    const editable = findEditableFromTarget(e.target as Element);
    if (editable) showButtonForTarget(editable);
  });

  document.addEventListener('input', () => {
    const editable = findEditableElement();
    if (editable) showButtonForTarget(editable);
    else hideButton();
  });

  document.addEventListener('focusout', () => {
    setTimeout(() => {
      if (!currentTarget) return;
      const editable = findEditableElement();
      if (!editable) hideButton();
    }, 200);
  });

  window.addEventListener('scroll', () => {
    if (currentTarget) positionButton(currentTarget);
  }, { passive: true });

  window.addEventListener('resize', () => {
    if (currentTarget) positionButton(currentTarget);
  });
}
