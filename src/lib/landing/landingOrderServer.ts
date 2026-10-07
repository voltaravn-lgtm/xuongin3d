import 'server-only';
import { createHash } from 'crypto';
import { FieldPath } from 'firebase-admin/firestore';
import { Product, ProductVariant } from '../../types';
import { ComboLandingBlock, LandingOrder, LandingOrderItemSnapshot, LandingOrderRequestInput, LandingPage, OrderFormLandingBlock, PriceLandingBlock } from '../../types/landing';
import { getAdminFirestore } from '../firebaseAdmin';
import { LANDING_ORDER_COLLECTION, LANDING_PAGE_COLLECTION, MAX_LANDING_ITEM_QUANTITY, MAX_LANDING_ORDER_ITEMS } from './landingSchema';
import { allocateComboTotal, resolveComboPrice, resolvePaidUnitPrice } from './landingPricing';
import { hasHoneypot, isAllowedLandingProduct, isPublishedOrderableLanding, normalizeVietnamesePhone } from './landingOrderGuards';

export class LandingOrderError extends Error { constructor(message: string, public status = 400) { super(message); } }
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const clean = (value: unknown, max: number) => String(value || '').trim().replace(/\s+/g, ' ').slice(0, max);
const serialize = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

async function findLanding(input: LandingOrderRequestInput) {
  const db = getAdminFirestore();
  if (input.landingPageId) {
    const snapshot = await db.collection(LANDING_PAGE_COLLECTION).doc(clean(input.landingPageId, 120)).get();
    return snapshot.exists ? ({ ...snapshot.data(), id: snapshot.id } as LandingPage) : null;
  }
  if (input.slug) {
    const snapshot = await db.collection(LANDING_PAGE_COLLECTION).where('slug', '==', clean(input.slug, 120)).where('status', '==', 'published').limit(1).get();
    const match = snapshot.docs[0]; return match ? ({ ...match.data(), id: match.id } as LandingPage) : null;
  }
  return null;
}

function validateCustomer(input: LandingOrderRequestInput, form: OrderFormLandingBlock) {
  if (hasHoneypot(input.website)) throw new LandingOrderError('Yêu cầu không hợp lệ.');
  const phone = normalizeVietnamesePhone(input.phone); if (!phone) throw new LandingOrderError('Số điện thoại Việt Nam không hợp lệ.');
  const type = form.formType || 'order';
  const customerName = clean(input.customerName, 120); const address = clean(input.address, 500);
  if (type !== 'phone-only' && form.showName !== false && !customerName) throw new LandingOrderError('Vui lòng nhập tên khách hàng.');
  if (type === 'order' && form.showAddress !== false && !address) throw new LandingOrderError('Vui lòng nhập địa chỉ nhận hàng.');
  const businessName = clean(input.businessName, 160);
  const businessType = clean(input.businessType, 120);
  if (form.showBusinessName && !businessName) throw new LandingOrderError('Vui lòng nhập tên cửa hàng hoặc doanh nghiệp.');
  if (form.showBusinessType && !businessType) throw new LandingOrderError('Vui lòng chọn mô hình kinh doanh.');
  const estimatedVolume = clean(input.estimatedVolume, 120);
  const note = [businessName && `Đơn vị: ${businessName}`, businessType && `Mô hình: ${businessType}`, estimatedVolume && `Sản lượng dự kiến: ${estimatedVolume}`, clean(input.note, 1000)].filter(Boolean).join(' · ').slice(0, 1000);
  return { phone, customerName, address, province: clean(input.province, 120), district: clean(input.district, 120), ward: clean(input.ward, 120), note, businessName, businessType, estimatedVolume };
}

function exactCombo(items: LandingOrderRequestInput['items'], combos: ComboLandingBlock[]) {
  const normalized = (values: Array<{ productId: string; quantity?: number }>) => values.map((item) => `${item.productId}:${item.quantity || 1}`).sort().join('|');
  const request = normalized(items);
  return combos.find((combo) => resolveComboPrice(combo.comboPrice) !== undefined && normalized(combo.products) === request);
}

function orderCode(now: Date, orderId: string) { const date = now.toISOString().slice(0, 10).replace(/-/g, ''); return `LP-${date}-${hash(orderId).slice(0, 8).toUpperCase()}`; }

export async function createLandingOrder(input: LandingOrderRequestInput): Promise<{ order: LandingOrder; duplicate: boolean }> {
  const requestId = clean(input.requestId || input.idempotencyKey, 150); if (!requestId || requestId.length < 8) throw new LandingOrderError('Mã yêu cầu không hợp lệ.');
  if (!Array.isArray(input.items) || input.items.length > MAX_LANDING_ORDER_ITEMS) throw new LandingOrderError(`Tối đa ${MAX_LANDING_ORDER_ITEMS} dòng sản phẩm.`);
  const landing = await findLanding(input); if (!landing) throw new LandingOrderError('Landing Page không tồn tại hoặc chưa publish.', 404);
  const form = landing.blocks.find((block): block is OrderFormLandingBlock => block.type === 'order-form' && !block.hidden);
  if (!isPublishedOrderableLanding(landing.status, Boolean(form)) || !form) throw new LandingOrderError(landing.status !== 'published' ? 'Landing Page không tồn tại hoặc chưa publish.' : 'Landing Page chưa có Order Form hợp lệ.', landing.status !== 'published' ? 404 : 400);
  const customer = validateCustomer(input, form); const formType = form.formType || 'order';
  if (formType === 'order' && !input.items.length) throw new LandingOrderError('Đơn hàng chưa có sản phẩm.');
  input.items.forEach((item) => { if (!item.productId || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > MAX_LANDING_ITEM_QUANTITY) throw new LandingOrderError(`Số lượng mỗi sản phẩm phải từ 1 đến ${MAX_LANDING_ITEM_QUANTITY}.`); });

  const combos = landing.blocks.filter((block): block is ComboLandingBlock => block.type === 'combo' && !block.hidden);
  const allowed = new Set<string>([landing.primaryProductId, ...(form.productIds || [])].filter((id): id is string => Boolean(id)));
  landing.blocks.forEach((block) => { if ('productId' in block && block.productId) allowed.add(block.productId); });
  combos.forEach((combo) => [...combo.products, ...(combo.gifts || [])].forEach((ref) => allowed.add(ref.productId)));
  input.items.forEach((item) => { if (!isAllowedLandingProduct(allowed, item.productId)) throw new LandingOrderError('Sản phẩm không được phép đặt từ Landing Page này.'); });

  const ids = [...new Set(input.items.map((item) => item.productId))];
  const db = getAdminFirestore();
  const productDocs = ids.length ? await db.collection('products').where(FieldPath.documentId(), 'in', ids.slice(0, 30)).get() : null;
  const products = new Map((productDocs?.docs || []).map((snapshot) => [snapshot.id, { ...snapshot.data(), id: snapshot.id } as Product]));
  if (products.size !== ids.length) throw new LandingOrderError('Có sản phẩm không còn tồn tại.', 404);

  const combo = exactCombo(input.items, combos);
  let snapshots: LandingOrderItemSnapshot[] = input.items.map((item) => {
    const product = products.get(item.productId)!; const variants = product.variants || [];
    const variant = item.variantId ? variants.find((entry) => !entry.hidden && entry.id === item.variantId) : undefined;
    if (variants.length && !item.variantId) throw new LandingOrderError(`Vui lòng chọn phân loại cho ${product.name}.`);
    if (item.variantId && !variant) throw new LandingOrderError(`Phân loại của ${product.name} không hợp lệ.`);
    const priceBlock = landing.blocks.find((block): block is PriceLandingBlock => block.type === 'price' && !block.hidden && (block.productId || landing.primaryProductId) === product.id && block.displayPrice != null);
    let unitPrice = 0;
    if (!combo) {
      try { unitPrice = resolvePaidUnitPrice({ priceBlockOverride: priceBlock?.displayPrice, landingProductOverride: product.id === landing.primaryProductId ? landing.productOverrides?.displayPrice : undefined, variantSalePrice: variant?.salePrice, variantPrice: variant?.price, productSalePrice: product.salePrice, productRetailPrice: product.retailPrice, productPrice: product.price }); }
      catch { throw new LandingOrderError(`Giá của ${product.name} chưa hợp lệ.`); }
    }
    return { productId: product.id, variantId: variant?.id, variantName: variant?.name, sku: variant?.sku || product.sku || product.id, name: variant ? `${product.name} - ${variant.name}` : product.name, image: variant?.image || product.image, quantity: item.quantity, unitPrice, lineTotal: unitPrice * item.quantity };
  });

  if (combo?.comboPrice != null && snapshots.length) {
    snapshots = allocateComboTotal(snapshots, resolveComboPrice(combo.comboPrice)!);
    for (const gift of combo.gifts || []) { const productDoc = await db.collection('products').doc(gift.productId).get(); if (!productDoc.exists) continue; const product = { ...productDoc.data(), id: productDoc.id } as Product; snapshots.push({ productId: product.id, sku: product.sku || product.id, name: product.name, image: gift.overrides?.image || product.image, quantity: gift.quantity || 1, unitPrice: 0, lineTotal: 0, isGift: true }); }
  }

  const subtotal = snapshots.reduce((sum, item) => sum + item.lineTotal, 0); const now = new Date(); const nowIso = now.toISOString();
  const normalizedItems = snapshots.filter((item) => !item.isGift).map((item) => `${item.productId}:${item.variantId || ''}:${item.quantity}`).sort().join('|');
  const orderId = hash(`${landing.id}:${requestId}`).slice(0, 28); const bucket = Math.floor(now.getTime() / (5 * 60 * 1000));
  const dedupeId = hash(`${landing.id}:${customer.phone}:${normalizedItems}:${bucket}`).slice(0, 32);
  const order: LandingOrder = serialize({ id: orderId, orderCode: orderCode(now, orderId), landingPageId: landing.id, landingPageSlug: landing.slug, landingPageTitle: landing.name, ...customer, items: snapshots, subtotal, shippingFee: 0, discount: 0, total: subtotal, currency: 'VND', source: landing.source, status: 'new', adminNote: '', assignedTo: '', requestId, createdAt: nowIso, updatedAt: nowIso });
  const orderRef = db.collection(LANDING_ORDER_COLLECTION).doc(orderId); const dedupeRef = db.collection('landingOrderDedup').doc(dedupeId);
  return db.runTransaction(async (transaction) => {
    const [existing, dedupe] = await Promise.all([transaction.get(orderRef), transaction.get(dedupeRef)]);
    if (existing.exists) return { order: { ...existing.data(), id: existing.id } as LandingOrder, duplicate: true };
    if (dedupe.exists) { const previousRef = db.collection(LANDING_ORDER_COLLECTION).doc(String(dedupe.data()?.orderId)); const previous = await transaction.get(previousRef); if (previous.exists) return { order: { ...previous.data(), id: previous.id } as LandingOrder, duplicate: true }; }
    transaction.create(orderRef, order); transaction.set(dedupeRef, { orderId, expiresAt: new Date(now.getTime() + 10 * 60 * 1000).toISOString() });
    return { order, duplicate: false };
  });
}
