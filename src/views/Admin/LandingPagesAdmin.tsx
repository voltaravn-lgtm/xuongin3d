'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Copy, Edit3, ExternalLink, Eye, EyeOff, FilePlus2, Layers3, Loader2, PackagePlus, PanelsTopLeft,
  RefreshCw, Search, Trash2, X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { LandingPage } from '../../types/landing';
import { createDefaultLandingPage } from '../../lib/landing/landingDefaults';
import {
  createLandingPage, deleteLandingPage, isLandingSlugAvailable,
  saveLandingPage, subscribeLandingPages,
} from '../../lib/landing/landingPageRepository';
import { normalizeLandingSlug, sanitizeLandingSlugInput, validateLandingPageForPublish, validateLandingSlug } from '../../lib/landing/landingValidation';
import CreateLandingFromProduct from '../../components/Admin/LandingBuilder/CreateLandingFromProduct';
import LandingBuilder from '../../components/Admin/LandingBuilder/LandingBuilder';
import { ImageUrlField } from '../../components/Admin/LandingBuilder/BlockEditorFields';
import { revalidateLandingCache } from '../../lib/landing/landingCacheClient';
import { createStandaloneLandingTemplateData, getLandingTemplate } from '../../lib/landing/landingTemplates';

type LandingForm = LandingPage;
type StatusFilter = 'all' | LandingPage['status'];

function createEmptyForm(): LandingForm {
  const now = new Date().toISOString();
  return { ...createDefaultLandingPage(now), id: '', createdAt: now, updatedAt: now };
}

function formatDate(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('vi-VN');
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định.';
}

export default function LandingPagesAdmin() {
  const { showToast, products } = useApp();
  const [pages, setPages] = useState<LandingPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [subscriptionVersion, setSubscriptionVersion] = useState(0);
  const [queryText, setQueryText] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<LandingForm>(createEmptyForm);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [isProductWizardOpen, setIsProductWizardOpen] = useState(false);
  const [builderPageId, setBuilderPageId] = useState<string | null>(null);
  const isEditing = Boolean(form.id);

  useEffect(() => {
    if (builderPageId) {
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    setLoadError('');
    return subscribeLandingPages((items) => {
      setPages(items);
      setLoading(false);
    }, (error) => {
      console.error('Could not subscribe landing pages:', error);
      setLoadError('Không đọc được Landing Pages. Hãy kiểm tra Firestore Rules và kết nối Firebase.');
      setLoading(false);
    });
  }, [subscriptionVersion, builderPageId]);

  const filteredPages = useMemo(() => {
    const keyword = queryText.trim().toLowerCase();
    return pages.filter((page) => {
      const matchesText = !keyword || `${page.name} ${page.slug}`.toLowerCase().includes(keyword);
      return matchesText && (statusFilter === 'all' || page.status === statusFilter);
    });
  }, [pages, queryText, statusFilter]);

  const openCreate = () => {
    setForm(createEmptyForm());
    setIsFormOpen(true);
  };

  const createDealerLanding = async () => {
    const template = getLandingTemplate('dealer-recruitment');
    if (!template) return showToast('Không tìm thấy mẫu tư vấn doanh nghiệp.', 'error');
    setSaving(true);
    try {
      const baseSlug = 'tu-van-du-an-doanh-nghiep';
      let slug = baseSlug;
      let suffix = 2;
      while (!await isLandingSlugAvailable(slug)) slug = `${baseSlug}-${suffix++}`;
      const base = createDefaultLandingPage();
      const { createdAt: _createdAt, updatedAt: _updatedAt, ...input } = {
        ...base,
        ...createStandaloneLandingTemplateData(template),
        name: 'Landing - Tư vấn dự án doanh nghiệp',
        slug,
        seo: {
          title: 'Tư vấn dự án in 3D cho doanh nghiệp',
          description: 'Tiếp nhận nhu cầu tạo mẫu, POSM, quà tặng và sản xuất in 3D theo dự án.',
        },
      };
      const page = await createLandingPage(input);
      setBuilderPageId(page.id);
      showToast('Đã tạo Landing tư vấn doanh nghiệp. Bạn có thể chỉnh nội dung ngay trong Builder.', 'success');
    } catch (error) {
      showToast(errorMessage(error), 'error');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (page: LandingPage) => {
    setForm(JSON.parse(JSON.stringify(page)) as LandingPage);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    if (saving) return;
    setIsFormOpen(false);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const slug = normalizeLandingSlug(form.slug);
    const slugValidation = validateLandingSlug(slug);
    if (!form.name.trim()) return showToast('Vui lòng nhập tên nội bộ.', 'warning');
    if (!slugValidation.valid) return showToast(slugValidation.errors[0], 'warning');

    setSaving(true);
    try {
      if (!await isLandingSlugAvailable(slug, form.id || undefined)) {
        showToast('Slug đã được Landing Page khác sử dụng hoặc nằm trong lịch sử URL.', 'error');
        return;
      }

      if (form.status === 'published') {
        const publishValidation = validateLandingPageForPublish({ ...form, slug });
        if (!publishValidation.valid) return showToast(publishValidation.errors[0], 'error');
        if (publishValidation.warnings.length && !window.confirm(`Landing co ${publishValidation.warnings.length} canh bao truoc khi publish:\n\n${publishValidation.warnings.slice(0, 8).join('\n')}\n\nBan van muon publish?`)) return;
      }

      let saved: LandingPage;
      if (isEditing) {
        saved = await saveLandingPage({
          ...form,
          name: form.name.trim(),
          slug,
          primaryProductId: form.primaryProductId?.trim() || undefined,
        });
        showToast('Đã cập nhật thông tin Landing Page.', 'success');
      } else {
        const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...input } = form;
        saved = await createLandingPage({
          ...input,
          name: form.name.trim(),
          slug,
          primaryProductId: form.primaryProductId?.trim() || undefined,
        });
        showToast('Đã tạo Landing Page nháp mới.', 'success');
      }
      if (saved.status === 'published' || isEditing) await revalidateLandingCache([form.slug, saved.slug, ...(saved.slugHistory || [])]);
      setIsFormOpen(false);
    } catch (error) {
      console.error('Could not save landing page:', error);
      showToast(errorMessage(error), 'error');
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (page: LandingPage) => {
    setBusyId(page.id);
    try {
      const publishing = page.status !== 'published';
      if (publishing) {
        const publishValidation = validateLandingPageForPublish({ ...page, status: 'published' });
        if (!publishValidation.valid) return showToast(publishValidation.errors[0], 'error');
        if (publishValidation.warnings.length && !window.confirm(`Landing co ${publishValidation.warnings.length} canh bao truoc khi publish:\n\n${publishValidation.warnings.slice(0, 8).join('\n')}\n\nBan van muon publish?`)) return;
      }
      const saved = await saveLandingPage({
        ...page,
        status: publishing ? 'published' : 'draft',
        publishedAt: publishing ? (page.publishedAt || new Date().toISOString()) : page.publishedAt,
      });
      await revalidateLandingCache([page.slug, saved.slug, ...(saved.slugHistory || [])]);
      showToast(publishing ? 'Đã publish Landing Page.' : 'Đã chuyển Landing Page về bản nháp.', 'success');
    } catch (error) {
      showToast(errorMessage(error), 'error');
    } finally {
      setBusyId('');
    }
  };

  const duplicatePage = async (page: LandingPage) => {
    setBusyId(page.id);
    try {
      const baseSlug = normalizeLandingSlug(`${page.slug}-copy`);
      let nextSlug = baseSlug;
      let suffix = 2;
      while (!await isLandingSlugAvailable(nextSlug)) {
        nextSlug = `${baseSlug}-${suffix}`;
        suffix += 1;
        if (suffix > 100) throw new Error('Không thể tạo slug cho bản nhân bản.');
      }
      const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, publishedAt: _publishedAt, ...input } = page;
      await createLandingPage({
        ...JSON.parse(JSON.stringify(input)),
        name: `${page.name} (Bản sao)`,
        slug: nextSlug,
        slugHistory: [],
        status: 'draft',
      });
      showToast('Đã nhân bản Landing Page dưới dạng bản nháp.', 'success');
    } catch (error) {
      showToast(errorMessage(error), 'error');
    } finally {
      setBusyId('');
    }
  };

  const removePage = async (page: LandingPage) => {
    if (!window.confirm(`Xóa Landing Page “${page.name}”? Thao tác này không thể hoàn tác.`)) return;
    setBusyId(page.id);
    try {
      await deleteLandingPage(page.id);
      showToast('Đã xóa Landing Page.', 'success');
    } catch (error) {
      showToast(errorMessage(error), 'error');
    } finally {
      setBusyId('');
    }
  };

  if (builderPageId) return <LandingBuilder pageId={builderPageId} onBack={() => setBuilderPageId(null)} />;

  return <div className="space-y-5">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div><h2 className="flex items-center gap-2 font-display text-lg font-black uppercase text-gold-light"><PanelsTopLeft className="h-5 w-5" /> Landing Pages</h2><p className="mt-1 text-xs text-gray-400">Quản lý trang bán hàng chạy quảng cáo. Product Picker, Template và Builder sẽ được bổ sung ở Task 3–4.</p></div>
      <div className="flex flex-col gap-2 sm:flex-row"><button type="button" disabled={saving} onClick={() => void createDealerLanding()} className="flex items-center justify-center gap-2 border border-emerald-500/40 px-5 py-3 text-xs font-black uppercase tracking-wider text-emerald-400 hover:bg-emerald-500 hover:text-black disabled:opacity-50"><PanelsTopLeft className="h-4 w-4" /> Tạo landing doanh nghiệp</button><button type="button" onClick={openCreate} className="flex items-center justify-center gap-2 border border-gold-dark/40 px-5 py-3 text-xs font-black uppercase tracking-wider text-gold-light hover:border-gold-light"><FilePlus2 className="h-4 w-4" /> Tạo trang trống</button><button type="button" onClick={() => setIsProductWizardOpen(true)} className="flex items-center justify-center gap-2 bg-gold-light px-5 py-3 text-xs font-black uppercase tracking-wider text-black hover:brightness-110"><PackagePlus className="h-4 w-4" /> Tạo từ sản phẩm</button></div>
    </div>

    {pages.length > 0 && <div className="flex items-center gap-2 overflow-x-auto border border-white/10 bg-[#0d0d0d] p-3"><span className="shrink-0 text-[9px] font-bold uppercase text-gray-600">Builder: thêm section, kéo thả, preview</span>{filteredPages.map((page) => <button type="button" key={page.id} onClick={() => setBuilderPageId(page.id)} className="flex shrink-0 items-center gap-2 border border-gold-dark/30 px-3 py-2 text-[9px] font-bold uppercase text-gold-light hover:bg-gold-light hover:text-black"><Layers3 className="h-3.5 w-3.5" />{page.name}</button>)}</div>}

    <div className="grid gap-3 border border-white/10 bg-black p-4 sm:grid-cols-[1fr_190px_auto]">
      <label className="flex items-center gap-2 border border-white/10 bg-[#111] px-3"><Search className="h-4 w-4 text-gray-500" /><input value={queryText} onChange={(event) => setQueryText(event.target.value)} placeholder="Tìm theo tên hoặc slug..." className="w-full bg-transparent py-3 text-base outline-none sm:text-xs" /></label>
      <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="border border-white/10 bg-[#111] px-3 py-3 text-xs"><option value="all">Tất cả trạng thái</option><option value="draft">Bản nháp</option><option value="published">Đã publish</option></select>
      <div className="flex items-center border border-white/10 px-4 text-xs text-gray-400">{filteredPages.length}/{pages.length} trang</div>
    </div>

    {loading && <div className="flex min-h-64 items-center justify-center border border-white/10 bg-black text-xs uppercase tracking-widest text-gray-500"><Loader2 className="mr-2 h-5 w-5 animate-spin text-gold-light" /> Đang tải Landing Pages</div>}
    {!loading && loadError && <div className="flex min-h-64 flex-col items-center justify-center border border-red-500/20 bg-red-500/5 px-5 text-center"><p className="text-sm text-red-300">{loadError}</p><button type="button" onClick={() => setSubscriptionVersion((value) => value + 1)} className="mt-4 flex items-center gap-2 border border-red-400/30 px-4 py-2 text-xs uppercase text-red-200"><RefreshCw className="h-4 w-4" /> Thử lại</button></div>}
    {!loading && !loadError && filteredPages.length === 0 && <div className="flex min-h-64 flex-col items-center justify-center border border-white/10 bg-black px-5 text-center"><PanelsTopLeft className="mb-3 h-10 w-10 text-gray-700" /><b className="text-sm uppercase text-gray-300">{pages.length ? 'Không có Landing Page phù hợp' : 'Chưa có Landing Page'}</b><p className="mt-2 text-xs text-gray-500">{pages.length ? 'Hãy đổi từ khóa hoặc bộ lọc trạng thái.' : 'Tạo bản nháp đầu tiên để bắt đầu.'}</p>{!pages.length && <button type="button" onClick={openCreate} className="mt-5 bg-gold-light px-5 py-2.5 text-xs font-black uppercase text-black">Tạo Landing Page</button>}</div>}

    {!loading && !loadError && filteredPages.length > 0 && <div className="overflow-x-auto border border-white/10 bg-black"><table className="w-full min-w-[980px] text-left"><thead className="border-b border-white/10 bg-[#111] text-[9px] uppercase tracking-wider text-gray-500"><tr><th className="px-4 py-3">Landing Page</th><th className="px-4 py-3">Slug</th><th className="px-4 py-3">Sản phẩm chính</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">Cập nhật</th><th className="px-4 py-3 text-right">Thao tác</th></tr></thead><tbody className="divide-y divide-white/5">{filteredPages.map((page) => {
      const busy = busyId === page.id;
      return <tr key={page.id} className="hover:bg-white/[.025]"><td className="px-4 py-4"><b className="block max-w-64 truncate text-xs text-white">{page.name}</b><span className="mt-1 block font-mono text-[9px] text-gray-600">{page.id}</span></td><td className="px-4 py-4"><span className="font-mono text-xs text-gold-light">/landing/{page.slug}</span>{page.slugHistory?.length > 0 && <span className="mt-1 block text-[9px] text-gray-600">{page.slugHistory.length} slug cũ</span>}</td><td className="px-4 py-4 font-mono text-xs text-gray-400">{page.primaryProductId || 'Chưa chọn'}</td><td className="px-4 py-4"><span className={`inline-flex items-center gap-1 border px-2 py-1 text-[9px] font-bold uppercase ${page.status === 'published' ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400' : 'border-amber-500/25 bg-amber-500/10 text-amber-300'}`}>{page.status === 'published' ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}{page.status === 'published' ? 'Đã publish' : 'Bản nháp'}</span></td><td className="px-4 py-4 text-[10px] text-gray-500">{formatDate(page.updatedAt)}</td><td className="px-4 py-4"><div className="flex items-center justify-end gap-1.5"><button disabled={busy} onClick={() => setBuilderPageId(page.id)} title="Mở Builder" className="border border-gold-dark/40 p-2 text-gold-light hover:bg-gold-light hover:text-black disabled:opacity-40"><Layers3 className="h-3.5 w-3.5" /></button><button disabled={busy} onClick={() => openEdit(page)} title="Sửa thông tin" className="border border-white/10 p-2 text-gold-light hover:bg-gold-light hover:text-black disabled:opacity-40"><Edit3 className="h-3.5 w-3.5" /></button><button disabled={busy} onClick={() => duplicatePage(page)} title="Nhân bản" className="border border-white/10 p-2 text-blue-400 hover:bg-blue-500 hover:text-white disabled:opacity-40"><Copy className="h-3.5 w-3.5" /></button><button disabled={busy} onClick={() => togglePublish(page)} title={page.status === 'published' ? 'Unpublish' : 'Publish'} className="border border-white/10 p-2 text-emerald-400 hover:bg-emerald-500 hover:text-black disabled:opacity-40">{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : page.status === 'published' ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</button>{page.status === 'published' && <a href={`/landing/${page.slug}`} target="_blank" rel="noreferrer" title="Mở URL public" className="border border-white/10 p-2 text-gray-300 hover:bg-white hover:text-black"><ExternalLink className="h-3.5 w-3.5" /></a>}<button disabled={busy} onClick={() => removePage(page)} title="Xóa" className="border border-red-500/20 p-2 text-red-400 hover:bg-red-500 hover:text-white disabled:opacity-40"><Trash2 className="h-3.5 w-3.5" /></button></div></td></tr>;
    })}</tbody></table></div>}

    {isFormOpen && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm" onMouseDown={closeForm}><form onSubmit={handleSave} onMouseDown={(event) => event.stopPropagation()} className="max-h-[94vh] w-full max-w-4xl overflow-y-auto border border-gold-dark/30 bg-[#0d0d0d] shadow-2xl"><div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#0d0d0d] p-5"><div><p className="text-[9px] font-bold uppercase tracking-[.2em] text-gold-light">Thông tin cơ bản</p><h3 className="mt-1 text-lg font-black uppercase text-white">{isEditing ? 'Sửa Landing Page' : 'Tạo Landing Page nháp'}</h3></div><button type="button" disabled={saving} onClick={closeForm} className="p-2 text-gray-500 hover:text-white"><X className="h-5 w-5" /></button></div>
      <div className="grid gap-5 p-5 md:grid-cols-2">
        <label className="space-y-2 text-[10px] font-bold uppercase text-gray-400">Tên nội bộ *<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="w-full border border-white/10 bg-black px-3 py-3 text-base normal-case text-white outline-none focus:border-gold-light md:text-sm" /></label>
        <label className="space-y-2 text-[10px] font-bold uppercase text-gray-400">Slug *<div className="flex border border-white/10 bg-black focus-within:border-gold-light"><span className="flex items-center border-r border-white/10 px-3 text-xs normal-case text-gray-600">/landing/</span><input required value={form.slug} onChange={(event) => setForm({ ...form, slug: sanitizeLandingSlugInput(event.target.value) })} className="min-w-0 flex-1 bg-transparent px-3 py-3 text-base normal-case text-white outline-none md:text-sm" /></div></label>
        <label className="space-y-2 text-[10px] font-bold uppercase text-gray-400">Trạng thái<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as LandingPage['status'] })} className="w-full border border-white/10 bg-black px-3 py-3 text-base normal-case text-white outline-none md:text-sm"><option value="draft">Bản nháp</option><option value="published">Publish</option></select></label>
        <label className="space-y-2 text-[10px] font-bold uppercase text-gray-400">Product ID chính<input value={form.primaryProductId || ''} onChange={(event) => setForm({ ...form, primaryProductId: event.target.value })} placeholder="Tạm thời có thể để trống" className="w-full border border-white/10 bg-black px-3 py-3 text-base normal-case text-white outline-none focus:border-gold-light md:text-sm" /></label>

        <div className="space-y-4 border border-white/10 p-4 md:col-span-2"><h4 className="text-xs font-black uppercase text-gold-light">SEO & Social</h4><div className="grid gap-4 md:grid-cols-2"><label className="space-y-2 text-[10px] font-bold uppercase text-gray-400">SEO title<input value={form.seo.title || ''} onChange={(event) => setForm({ ...form, seo: { ...form.seo, title: event.target.value } })} className="w-full border border-white/10 bg-black px-3 py-3 text-base normal-case text-white outline-none md:text-sm" /></label><ImageUrlField label="Ảnh social" value={form.seo.image} onChange={(image) => setForm({ ...form, seo: { ...form.seo, image: image || undefined } })} /><label className="space-y-2 text-[10px] font-bold uppercase text-gray-400 md:col-span-2">SEO description<textarea rows={3} value={form.seo.description || ''} onChange={(event) => setForm({ ...form, seo: { ...form.seo, description: event.target.value } })} className="w-full resize-none border border-white/10 bg-black px-3 py-3 text-base normal-case text-white outline-none md:text-sm" /></label></div></div>

        <div className="space-y-4 border border-white/10 p-4"><h4 className="text-xs font-black uppercase text-gold-light">Hiển thị</h4>{[
          ['hideHeader', 'Ẩn Header'], ['hideFooter', 'Ẩn Footer'], ['stickyMobileCta', 'CTA mobile cố định'],
        ].map(([key, label]) => <label key={key} className="flex items-center justify-between gap-3 border-b border-white/5 py-2 text-xs text-gray-300"><span>{label}</span><input type="checkbox" checked={Boolean(form.layout[key as keyof LandingPage['layout']])} onChange={(event) => setForm({ ...form, layout: { ...form.layout, [key]: event.target.checked } })} className="h-4 w-4 accent-[#f5c45a]" /></label>)}</div>

        <div className="space-y-4 border border-white/10 p-4"><h4 className="text-xs font-black uppercase text-gold-light">Quảng cáo</h4><label className="block space-y-2 text-[10px] font-bold uppercase text-gray-400">Meta Pixel ID<input value={form.tracking.metaPixelId || ''} onChange={(event) => setForm({ ...form, tracking: { ...form.tracking, metaPixelId: event.target.value.trim() } })} className="w-full border border-white/10 bg-black px-3 py-2.5 text-sm normal-case text-white outline-none" /></label><label className="block space-y-2 text-[10px] font-bold uppercase text-gray-400">TikTok Pixel ID<input value={form.tracking.tiktokPixelId || ''} onChange={(event) => setForm({ ...form, tracking: { ...form.tracking, tiktokPixelId: event.target.value.trim() } })} className="w-full border border-white/10 bg-black px-3 py-2.5 text-sm normal-case text-white outline-none" /></label><label className="block space-y-2 text-[10px] font-bold uppercase text-gray-400">Google Tag Manager ID<input value={form.tracking.googleTagManagerId || ''} onChange={(event) => setForm({ ...form, tracking: { ...form.tracking, googleTagManagerId: event.target.value.trim().toUpperCase() } })} placeholder="GTM-XXXXXXX" className="w-full border border-white/10 bg-black px-3 py-2.5 text-sm normal-case text-white outline-none" /></label></div>
      </div>
      <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-white/10 bg-[#0d0d0d] p-5"><button type="button" disabled={saving} onClick={closeForm} className="border border-white/10 px-5 py-3 text-xs font-bold uppercase text-gray-400">Hủy</button><button disabled={saving} className="flex min-w-40 items-center justify-center gap-2 bg-gold-light px-5 py-3 text-xs font-black uppercase text-black disabled:opacity-50">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{saving ? 'Đang lưu...' : isEditing ? 'Lưu thay đổi' : 'Tạo bản nháp'}</button></div>
    </form></div>}
    {isProductWizardOpen && <CreateLandingFromProduct products={products} onClose={() => setIsProductWizardOpen(false)} onCreated={(page) => { setIsProductWizardOpen(false); setBuilderPageId(page.id); showToast('Đã tạo Landing từ sản phẩm. Builder đã sẵn sàng để thêm section, kéo thả và chỉnh nội dung.', 'success'); }} />}
  </div>;
}
