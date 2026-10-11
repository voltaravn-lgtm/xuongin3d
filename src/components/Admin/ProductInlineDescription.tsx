'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/** Edit rendered content without exposing HTML or rewriting untouched descriptions. */
export default function ProductInlineDescription({ enabled, label, value, html, onChange, children }: {
  enabled: boolean; label: string; value: string; html: string;
  onChange: (value: string) => void; children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const editor = useRef<HTMLDivElement>(null);
  const lastEmitted = useRef<string | null>(null);

  useEffect(() => {
    if (!open || !editor.current || value === lastEmitted.current) return;
    // Another description editor may change the shared draft. Our own input
    // must not replace the DOM, which would move the caret on every keystroke.
    editor.current.innerHTML = html;
  }, [open, value, html]);

  if (!enabled) return <>{children}</>;
  if (!open) return <div role="button" tabIndex={0}
    onClickCapture={event => { event.preventDefault(); event.stopPropagation(); lastEmitted.current = null; setOpen(true); }}
    onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); lastEmitted.current = null; setOpen(true); } }}
    className="block w-full rounded border border-dashed border-gold-dark/50 p-2 text-left hover:bg-gold-dark/10">
    {children}<span className="block text-[10px] text-gold-light">Nhấp để sửa {label}</span>
  </div>;

  const emit = () => {
    if (!editor.current) return;
    lastEmitted.current = editor.current.innerHTML;
    onChange(lastEmitted.current);
  };
  return <div className="space-y-2">
    <span className="block text-xs text-gold-light">{label}</span>
    <div ref={editor} contentEditable suppressContentEditableWarning role="textbox" aria-label={label} aria-multiline="true"
      onInput={emit}
      onPaste={event => {
        // Paste text only; don't import foreign styling, scripts or embeds.
        event.preventDefault();
        const selection = window.getSelection();
        if (!selection?.rangeCount || !editor.current?.contains(selection.anchorNode)) return;
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const text = document.createTextNode(event.clipboardData.getData('text/plain'));
        range.insertNode(text);
        range.setStartAfter(text);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        emit();
      }}
      className="product-description-content min-h-40 max-h-[28rem] overflow-y-auto whitespace-pre-wrap border border-gold-dark bg-black p-3 text-sm font-normal normal-case leading-7 text-gray-300 outline-none focus:ring-1 focus:ring-gold-dark" />
    <button type="button" onClick={() => setOpen(false)} className="text-xs text-gold-light">Xong · chưa lưu</button>
  </div>;
}
