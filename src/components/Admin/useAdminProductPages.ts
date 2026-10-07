import { useEffect, useRef, useState } from 'react';
import type { Product } from '../../types';
import { ADMIN_PRODUCT_CACHE_EVENT, findAdminProductCode, loadAdminProductCatalogue, loadAdminProductPage, loadAdminProductTotal } from '../../lib/adminProductPages';

export type AdminProductFilters = { search: string; visibility: string; price: string };
export function filterAdminProducts(products: Product[], filters: AdminProductFilters) {
  const search = filters.search.trim().toLowerCase();
  const price = (value?: string) => Number(String(value || '').replace(/[^\d]/g, '')) || 0;
  return products.filter(product => {
    if (search && ![product.name, product.id, product.sku, product.category, product.subCategory, product.brand].some(value => String(value || '').toLowerCase().includes(search))) return false;
    if (filters.visibility === 'hidden' && !product.hidden || filters.visibility === 'visible' && product.hidden) return false;
    const variants = product.variants || [];
    const missing = variants.length ? variants.some(item => !price(item.salePrice || item.price)) : !price(product.retailPrice || product.salePrice || product.price);
    return filters.price === 'all' || filters.price === 'missing' && missing || filters.price === 'complete' && !missing || filters.price === 'variants' && variants.length > 0;
  }).sort((a, b) => (b.createdAt ? Date.parse(b.createdAt) || 0 : 0) - (a.createdAt ? Date.parse(a.createdAt) || 0 : 0) || b.id.localeCompare(a.id));
}

export default function useAdminProductPages(pageSize: number, page: number, filters: AdminProductFilters, merge: (items: Product[]) => void) {
  const [rows, setRows] = useState<Product[]>([]), [total, setTotal] = useState(0), [catalogueTotal, setCatalogueTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [revision, setRevision] = useState(0);
  const cursors = useRef<Record<number, string | undefined>>({});
  const mergeRef = useRef(merge); mergeRef.current = merge;
  const [knownPage, setKnownPage] = useState(1);
  const advanced = !!filters.search || filters.visibility !== 'all' || filters.price !== 'all';
  const exactCode = /^IN3D-[A-Z0-9]+$/i.test(filters.search.trim()) && filters.visibility === 'all' && filters.price === 'all';
  useEffect(() => {
    const reset = () => { cursors.current = {}; setKnownPage(1); setRevision(value => value + 1); };
    window.addEventListener(ADMIN_PRODUCT_CACHE_EVENT, reset);
    return () => window.removeEventListener(ADMIN_PRODUCT_CACHE_EVENT, reset);
  }, []);
  useEffect(() => { cursors.current = {}; setKnownPage(1); }, [pageSize, filters.search, filters.visibility, filters.price]);
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(''); setRows([]);
    (async () => {
      try {
        let items: Product[], count: number;
        if (advanced) {
          const catalogue = exactCode ? await findAdminProductCode(filters.search) : await loadAdminProductCatalogue();
          if (!exactCode && !cancelled) setCatalogueTotal(catalogue.length);
          const filtered = filterAdminProducts(catalogue, filters);
          count = filtered.length;
          items = filtered.slice((page - 1) * pageSize, page * pageSize);
          if (!cancelled) setKnownPage(Math.max(1, Math.ceil(count / pageSize)));
        } else {
          // Direct navigation can only use already-known cursor boundaries.
          if (page > 1 && !cursors.current[page - 1]) throw new Error('Hãy dùng nút Sau để tải trang kế tiếp.');
          const [result, allCount] = await Promise.all([loadAdminProductPage(pageSize, cursors.current[page - 1]), loadAdminProductTotal()]);
          items = result.products; count = allCount;
          if (!cancelled) {
            cursors.current[page] = result.cursor;
            setCatalogueTotal(allCount);
            setKnownPage(value => Math.max(value, page + (items.length === pageSize && page * pageSize < count ? 1 : 0)));
          }
        }
        if (!cancelled) { setRows(items); setTotal(count); mergeRef.current(items); }
      } catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : 'Không tải được trang sản phẩm.'); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [pageSize, page, filters.search, filters.visibility, filters.price, revision]);
  return { rows, total, catalogueTotal, loading, error, knownPage, advanced, refresh: () => { cursors.current = {}; setKnownPage(1); setRevision(value => value + 1); } };
}
