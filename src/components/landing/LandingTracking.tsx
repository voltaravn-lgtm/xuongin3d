'use client';
import { useEffect } from 'react';
import { Product } from '../../types';
import { LandingPage } from '../../types/landing';
import { landingSuccessEventNames, validLandingTrackingIds } from '../../lib/landing/landingTracking';
type QueueFunction = ((...args: unknown[]) => void) & { queue?: unknown[][]; loaded?: boolean; version?: string };
declare global { interface Window { fbq?: QueueFunction; _fbq?: QueueFunction; ttq?: { track?: (...args: unknown[]) => void; page?: () => void; load?: (id: string) => void; _queue?: unknown[][] }; dataLayer?: Array<Record<string, unknown>>; TiktokAnalyticsObject?: string; } }
function addScript(id: string, src: string) { if (document.getElementById(id)) return; const script = document.createElement('script'); script.id = id; script.async = true; script.src = src; document.head.appendChild(script); }
export default function LandingTracking({ page, product }: { page: LandingPage; product?: Product | null }) {
  useEffect(() => {
    const { metaPixelId: metaId, tiktokPixelId: tiktokId, googleTagManagerId: gtmId } = validLandingTrackingIds(page.tracking);
    if (metaId) { if (!window.fbq) { const fbq: QueueFunction = (...args: unknown[]) => { fbq.queue = fbq.queue || []; fbq.queue.push(args); }; fbq.loaded = true; fbq.version = '2.0'; window.fbq = fbq; window._fbq = fbq; addScript('voltara-meta-pixel', 'https://connect.facebook.net/en_US/fbevents.js'); } window.fbq('init', metaId); window.fbq('track', 'PageView'); window.fbq('track', 'ViewContent', { content_ids: product ? [product.id] : [], content_name: product?.name || page.name, content_type: 'product' }); }
    if (tiktokId) { if (!window.ttq) { const queue: unknown[][] = []; window.ttq = { _queue: queue, track: (...args: unknown[]) => queue.push(['track', ...args]), page: () => queue.push(['page']), load: (id: string) => addScript('voltara-tiktok-pixel', `https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${encodeURIComponent(id)}&lib=ttq`) }; window.TiktokAnalyticsObject = 'ttq'; } window.ttq.load?.(tiktokId); window.ttq.page?.(); window.ttq.track?.('ViewContent', { content_id: product?.id, content_name: product?.name || page.name, content_type: 'product' }); }
    if (gtmId) { window.dataLayer = window.dataLayer || []; window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' }); addScript('voltara-gtm', `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmId)}`); }
    const success = (event: Event) => { const detail = (event as CustomEvent<{ formType: string; total: number; currency: string; orderCode: string; items: Array<{ productId: string; quantity: number }> }>).detail; if (!detail) return; const names = landingSuccessEventNames(detail.formType); const purchase = detail.formType === 'order'; if (metaId) window.fbq?.('track', names.meta, purchase ? { value: detail.total, currency: detail.currency, content_ids: detail.items.map((item) => item.productId), order_id: detail.orderCode } : { content_name: page.name }); if (tiktokId) window.ttq?.track?.(names.tiktok, purchase ? { value: detail.total, currency: detail.currency, content_id: detail.items.map((item) => item.productId).join(',') } : {}); if (gtmId) { window.dataLayer = window.dataLayer || []; window.dataLayer.push({ event: names.gtm, order_code: detail.orderCode, value: detail.total, currency: detail.currency, form_type: detail.formType, items: detail.items }); } };
    window.addEventListener('xuongin3d:landing-order-success', success); return () => window.removeEventListener('xuongin3d:landing-order-success', success);
  }, [page.id, page.name, page.tracking.googleTagManagerId, page.tracking.metaPixelId, page.tracking.tiktokPixelId, product?.id, product?.name]);
  return null;
}
