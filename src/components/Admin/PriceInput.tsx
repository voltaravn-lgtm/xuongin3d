import React, { useRef, useState } from 'react';
import { formatPriceInput, priceInputSuggestions } from '../../lib/priceInput';

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  value?: string;
  onValueChange: (value: string) => void;
};

export default function PriceInput({ value = '', onValueChange, className, ...props }: Props) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestions = focused ? priceInputSuggestions(value) : [];
  return <div className="relative min-w-0" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
  }}>
    <input {...props} ref={inputRef} type="text" inputMode="numeric" value={formatPriceInput(value)} className={className}
      onFocus={event => { setFocused(true); props.onFocus?.(event); }}
      onBlur={event => props.onBlur?.(event)}
      onChange={event => {
        const raw = event.target.value;
        const cursor = event.target.selectionStart || 0;
        const digitsBeforeCursor = raw.slice(0, cursor).replace(/\D/g, '').length;
        const formatted = formatPriceInput(raw);
        onValueChange(formatted);
        if (/^[\d\s.,]*$/.test(raw)) requestAnimationFrame(() => {
          const input = inputRef.current;
          if (!input || document.activeElement !== input) return;
          let position = 0, count = 0;
          while (position < formatted.length && count < digitsBeforeCursor) {
            if (/\d/.test(formatted[position])) count++;
            position++;
          }
          input.setSelectionRange(position, position);
        });
      }} />
    {suggestions.length > 0 && <div className="absolute left-0 top-full z-20 mt-1 min-w-full border border-gold-dark/40 bg-[#151515] p-2 shadow-xl">
      <span className="mb-1 block text-[9px] normal-case text-gray-400">Chọn nhanh (đ)</span>
      <div className="flex flex-wrap gap-1">{suggestions.map(price => <button key={price} type="button" onMouseDown={event => event.preventDefault()} onClick={() => { onValueChange(price); setFocused(false); }} className="whitespace-nowrap border border-white/15 px-2 py-1.5 text-xs font-bold text-gold-light hover:border-gold-light">{price}</button>)}</div>
    </div>}
  </div>;
}
