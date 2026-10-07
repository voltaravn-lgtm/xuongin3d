import React from 'react';

type Props = {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  disabled?: boolean;
  maxPage?: number;
};

export default function ProductPagination({ total, page, pageSize, onPageChange, onPageSizeChange, disabled = false, maxPage = Infinity }: Props) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const start = Math.max(1, Math.min(page - 2, pages - 4));
  const numbers = Array.from({ length: Math.min(5, pages) }, (_, index) => start + index);
  const buttonClass = 'border border-white/15 px-3 py-2 hover:border-gold-light disabled:opacity-30 disabled:cursor-not-allowed';
  return <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
    <div className="flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-2 text-gray-400">Hiển thị
        <select disabled={disabled} value={pageSize} onChange={event => onPageSizeChange(Number(event.target.value))} className="border border-white/15 bg-black px-3 py-2 text-white">
          {[12, 24, 48].map(size => <option key={size} value={size}>{size} SP / trang</option>)}
        </select>
      </label>
      <span role="status" className="text-gray-400">{total ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, total)} / {total} SP · Trang {page}/{pages}</span>
    </div>
    <nav aria-label="Phân trang kho sản phẩm" className="flex flex-wrap items-center gap-1">
      <button type="button" disabled={disabled || page === 1} onClick={() => onPageChange(page - 1)} className={buttonClass}>Trước</button>
      {start > 1 && <><button type="button" disabled={disabled} onClick={() => onPageChange(1)} className={buttonClass}>1</button>{start > 2 && <span aria-hidden="true" className="px-1 text-gray-500">…</span>}</>}
      {numbers.map(number => <button key={number} type="button" disabled={disabled || number > maxPage} aria-label={`Trang ${number}`} aria-current={number === page ? 'page' : undefined} onClick={() => onPageChange(number)} className={`${buttonClass} ${number === page ? 'border-gold-light bg-gold-dark/20 text-gold-light' : ''}`}>{number}</button>)}
      {numbers[numbers.length - 1] < pages && <>{numbers[numbers.length - 1] < pages - 1 && <span aria-hidden="true" className="px-1 text-gray-500">…</span>}<button type="button" disabled={disabled || pages > maxPage} onClick={() => onPageChange(pages)} className={buttonClass}>{pages}</button></>}
      <button type="button" disabled={disabled || page === pages || page + 1 > maxPage} onClick={() => onPageChange(page + 1)} className={buttonClass}>Sau</button>
    </nav>
  </div>;
}
