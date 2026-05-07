// Walk down the DOM to find the deepest element that contains all the text.
// This avoids creating cross-element ranges that Lexical/React editors block.
function findDeepestTextContainer(el: Element): Element | null {
  let current: Element = el;
  while (true) {
    const children = current.children;
    // If there's exactly one child element and it has the same text, go deeper
    if (children.length === 1 && children[0].textContent === current.textContent) {
      current = children[0];
    } else {
      break;
    }
  }
  // Return the deepest element only if it's different from the original
  return current !== el ? current : null;
}

export interface TextRange {
  text: string;
  start: number;
  end: number;
  hadSelection: boolean;
}

export interface ContentEditableResult {
  text: string;
  range: Range;
  hadSelection: boolean;
  editableEl: Element;
  // The window/document context (may differ from main page for iframes)
  win: Window;
  doc: Document;
}

export function getTextFromInput(el: HTMLInputElement | HTMLTextAreaElement): TextRange | null {
  const start = el.selectionStart ?? 0;
  const end = el.selectionEnd ?? 0;

  if (start !== end) {
    return { text: el.value.substring(start, end), start, end, hadSelection: true };
  }

  if (el.value.length === 0) return null;
  return { text: el.value, start: 0, end: el.value.length, hadSelection: false };
}

export function replaceInInput(
  el: HTMLInputElement | HTMLTextAreaElement,
  start: number,
  end: number,
  newText: string,
  hadSelection: boolean,
): void {
  el.focus();
  el.setSelectionRange(start, end);

  const descriptor = Object.getOwnPropertyDescriptor(
    el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
    'value'
  );
  if (descriptor?.set) {
    const before = el.value.substring(0, start);
    const after = el.value.substring(end);
    descriptor.set.call(el, before + newText + after);
  } else {
    el.setRangeText(newText, start, end, 'end');
  }

  if (hadSelection) {
    el.setSelectionRange(start, start + newText.length);
  } else {
    el.setSelectionRange(start + newText.length, start + newText.length);
  }

  el.dispatchEvent(new Event('input', { bubbles: true }));
}

// win/doc params allow operating inside iframe contexts (TinyMCE, etc.)
export function getTextFromContentEditable(
  editableEl: Element,
  win: Window = window,
  doc: Document = document,
): ContentEditableResult | null {
  const selection = win.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  if (!selection.isCollapsed) {
    return {
      text: selection.toString(),
      range: selection.getRangeAt(0).cloneRange(),
      hadSelection: true,
      editableEl,
      win,
      doc,
    };
  }

  const text = editableEl.textContent || '';
  if (text.length === 0) return null;

  // Find the deepest single container that holds all the text.
  // WhatsApp/Facebook use Lexical editor with <div><p><span>text</span></p></div>.
  // selectNodeContents on the outer div creates a cross-element range that
  // Lexical blocks from being replaced. Selecting the inner span works.
  const innerTarget = findDeepestTextContainer(editableEl) || editableEl;

  const fullRange = doc.createRange();
  fullRange.selectNodeContents(innerTarget);

  return { text, range: fullRange, hadSelection: false, editableEl, win, doc };
}

export function replaceInContentEditable(result: ContentEditableResult, newText: string): void {
  const { range, hadSelection, win, doc } = result;
  const selection = win.getSelection();
  if (!selection) return;

  const editableEl = result.editableEl as HTMLElement;

  // Select the range to replace
  selection.removeAllRanges();
  selection.addRange(range);

  const hasSpaces = newText.includes(' ');

  if (!hasSpaces) {
    // No spaces — single execCommand works everywhere (TinyMCE, Lexical, Gmail)
    doc.execCommand('insertText', false, newText);
  } else {
    // Text has spaces — Lexical editors (WhatsApp, Facebook) block insertText
    // when the string contains spaces. Insert word by word, with each subsequent
    // word prefixed by its space (e.g. " word2") to keep the space attached.
    const words = newText.split(' ');
    for (let i = 0; i < words.length; i++) {
      if (i === 0) {
        doc.execCommand('insertText', false, words[i]);
      } else {
        doc.execCommand('insertText', false, ' ' + words[i]);
      }
    }
  }

  // Re-select converted text if user had a selection
  reselect(selection, doc, hadSelection, newText);
}

function reselect(selection: Selection, doc: Document, hadSelection: boolean, newText: string): void {
  if (!hadSelection || selection.rangeCount === 0) return;
  try {
    const cursorRange = selection.getRangeAt(0);
    const endNode = cursorRange.endContainer;
    const endOffset = cursorRange.endOffset;
    const selectRange = doc.createRange();
    selectRange.setStart(endNode, Math.max(0, endOffset - newText.length));
    selectRange.setEnd(endNode, endOffset);
    selection.removeAllRanges();
    selection.addRange(selectRange);
  } catch {
    // leave cursor at end
  }
}
