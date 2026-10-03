'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Copy, Edit3, Eye, EyeOff, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { LandingBlock, LandingPage, LandingPreviewMode } from '../../../types/landing';
import { getLandingBlockRegistry } from './blockRegistry';
import { useApp } from '../../../context/AppContext';
import { landingDesignStyle } from '../../../lib/landing/landingDesign';

interface Props {
  page: LandingPage;
  mode: LandingPreviewMode;
  selectedBlockId: string | null;
  previewOnly: boolean;
  scrollSignal: number;
  onSelectBlock: (id: string) => void;
  onEditBlock: (id: string) => void;
  onToggleBlock: (id: string) => void;
  onDuplicateBlock: (id: string) => void;
  onDeleteBlock: (id: string) => void;
  onMoveBlock: (id: string, direction: -1 | 1) => void;
}

export default function VisualBuilderCanvas({ page, mode, selectedBlockId, previewOnly, scrollSignal, onSelectBlock, onEditBlock, onToggleBlock, onDuplicateBlock, onDeleteBlock, onMoveBlock }: Props) {
  const { products } = useApp();
  const product = products.find((item) => item.id === page.primaryProductId) || null;
  const refs = useRef<Record<string, HTMLDivElement | null>>({});
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const visibleBlocks = page.blocks.filter((block) => !block.hidden && (mode === 'mobile' ? block.mobileVisible !== false : block.desktopVisible !== false));
  const frame = mode === 'mobile' ? 'w-[390px]' : mode === 'tablet' ? 'w-[768px]' : 'w-full max-w-[1180px]';

  useEffect(() => {
    if (!selectedBlockId || !scrollSignal) return;
    refs.current[selectedBlockId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [selectedBlockId, scrollSignal]);

  return <main className="flex h-full min-h-0 flex-col bg-[#161616]">
    <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-2">
      <div><b className="text-[10px] uppercase text-white">Canvas</b><p className="text-[8px] text-gray-600">Renderer chung với public Landing</p></div>
      <span className="border border-white/10 px-2 py-1 text-[9px] uppercase text-gray-500">{mode}</span>
    </div>
    <div className="min-h-0 flex-1 overflow-auto p-4">
      <div style={landingDesignStyle(page)} data-button-style={page.design?.buttonStyle || 'solid'} className={`landing-root mx-auto min-h-full max-w-full overflow-hidden border border-white/10 shadow-2xl transition-all ${frame}`}>
        {!page.layout.hideHeader && <div className="flex h-14 items-center justify-between border-b border-white/10 bg-black px-5 text-white"><b className="text-xs tracking-[.2em] text-gold-light">XƯỞNG IN 3D</b><span className="text-[9px] uppercase text-gray-500">Landing Header</span></div>}
        {visibleBlocks.map((block, index) => {
          const registry = getLandingBlockRegistry(block.type);
          const Renderer = registry.Renderer;
          const selected = block.id === selectedBlockId;
          const hovered = hoveredId === block.id;
          return <div
            key={block.id}
            ref={(node) => { refs.current[block.id] = node; }}
            onMouseEnter={() => setHoveredId(block.id)}
            onMouseLeave={() => setHoveredId((current) => current === block.id ? null : current)}
            onClick={previewOnly ? undefined : (event) => { event.stopPropagation(); onSelectBlock(block.id); }}
            className={`relative ${previewOnly ? '' : 'cursor-pointer'} ${selected ? 'ring-2 ring-inset ring-gold-light' : hovered ? 'ring-1 ring-inset ring-gold-dark/60' : ''}`}
          >
            {!previewOnly && (selected || hovered) && <div className="absolute right-2 top-2 z-30 flex items-center gap-1 border border-gold-dark/40 bg-black/90 p-1 text-white shadow-xl">
              <button type="button" onClick={(event) => { event.stopPropagation(); onEditBlock(block.id); }} title="Chỉnh sửa" className="p-1.5 text-gold-light hover:bg-gold-light hover:text-black"><Edit3 className="h-3.5 w-3.5" /></button>
              <button type="button" disabled={index === 0} onClick={(event) => { event.stopPropagation(); onMoveBlock(block.id, -1); }} title="Di chuyển lên" className="p-1.5 text-gray-300 hover:bg-white/10 disabled:opacity-25"><ArrowUp className="h-3.5 w-3.5" /></button>
              <button type="button" disabled={index === visibleBlocks.length - 1} onClick={(event) => { event.stopPropagation(); onMoveBlock(block.id, 1); }} title="Di chuyển xuống" className="p-1.5 text-gray-300 hover:bg-white/10 disabled:opacity-25"><ArrowDown className="h-3.5 w-3.5" /></button>
              <button type="button" onClick={(event) => { event.stopPropagation(); onDuplicateBlock(block.id); }} title="Nhân bản" className="p-1.5 text-blue-300 hover:bg-white/10"><Copy className="h-3.5 w-3.5" /></button>
              <button type="button" onClick={(event) => { event.stopPropagation(); onToggleBlock(block.id); }} title="Ẩn/hiện" className="p-1.5 text-emerald-300 hover:bg-white/10">{block.hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}</button>
              <button type="button" onClick={(event) => { event.stopPropagation(); onDeleteBlock(block.id); }} title="Xóa" className="p-1.5 text-red-300 hover:bg-white/10"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>}
            <Renderer block={block} page={page} product={product} products={products} mode={mode} editorMode={!previewOnly} selected={selected} onSelect={() => onSelectBlock(block.id)} />
          </div>;
        })}
        {!visibleBlocks.length && <div className="flex min-h-80 items-center justify-center text-xs uppercase text-gray-600">Không có section phù hợp</div>}
        {!page.layout.hideFooter && <div className="border-t border-white/10 bg-black px-5 py-8 text-center text-[9px] uppercase text-gray-600">Landing Footer · Xưởng In 3D</div>}
        {page.layout.stickyMobileCta && mode === 'mobile' && <div className="sticky bottom-0 border-t border-white/10 bg-black/95 p-3"><a href="#dat-hang" className="landing-button block w-full py-3 text-center text-xs font-black uppercase">{page.productOverrides?.ctaLabel || 'Đặt hàng ngay'}</a></div>}
      </div>
    </div>
  </main>;
}
