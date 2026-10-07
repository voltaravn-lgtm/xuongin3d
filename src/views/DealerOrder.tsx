'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, ChevronRight, Lock, LogIn, Minus, PackageCheck, Plus, Search, ShoppingCart, Trash2, X } from 'lucide-react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User } from 'firebase/auth';
import { addDoc, collection, doc, getDoc, limit, onSnapshot, query as firestoreQuery, where } from 'firebase/firestore';
import { useApp } from '../context/AppContext';
import { DealerAccount, DealerOrderRecord, Product } from '../types';
import { auth, db } from '../lib/firebase';
import { isAdminEmail } from '../lib/adminAuth';
import { VIETNAM_LOCATIONS } from '../lib/vietnamLocations';
import { announceOrderSuccess } from '../lib/orderSuccess';

const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
const parsePrice = (value?: string) => Number(String(value || '').replace(/[^0-9]/g, '')) || 0;
const normalizePhone = (value: string) => { const digits = value.replace(/\D/g, ''); return digits.startsWith('84') ? `0${digits.slice(2)}` : digits; };
const authEmailFromPhone = (phone: string) => `${normalizePhone(phone)}@dealer.voltara.vn`;
const cleanText = (value?: string) => String(value || '')
  .replace(/<script[\s\S]*?<\/script>/gi, '')
  .replace(/<style[\s\S]*?<\/style>/gi, '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\s+/g, ' ')
  .trim();

function retailOf(product: Product) {
  const productPrice = parsePrice(product.retailPrice || product.salePrice || product.price);
  if (productPrice) return productPrice;
  const variantPrices = (product.variants || [])
    .filter(variant => !variant.hidden)
    .map((variant) => parsePrice(variant.salePrice || variant.price))
    .filter((price) => price > 0);
  return variantPrices.length ? Math.min(...variantPrices) : 0;
}

function effectiveDiscount(product: Product, level: 1 | 2, level1Discount: number, level2Discount: number) {
  const retail = retailOf(product);
  const dealer = dealerPriceOf(product, level, level1Discount, level2Discount);
  return retail && dealer ? Math.max(0, Math.round((1 - dealer / retail) * 100)) : 0;
}

function dealerPriceOf(product: Product, level: 1 | 2, level1Discount: number, level2Discount: number) {
  const explicit = parsePrice(level === 1 ? product.dealerLevel1Price : product.dealerLevel2Price);
  if (explicit) return explicit;
  const legacyLevel2 = product.dealerDiscountPercent;
  const discount = level === 1
    ? product.dealerLevel1DiscountPercent ?? (legacyLevel2 !== undefined ? legacyLevel2 + Math.max(0, level1Discount - level2Discount) : level1Discount)
    : product.dealerLevel2DiscountPercent ?? legacyLevel2 ?? level2Discount;
  return Math.round(retailOf(product) * (1 - Math.min(discount, 90) / 100));
}

function isUsableDealerAccount(account: DealerAccount | null): account is DealerAccount {
  if (!account || account.status !== 'active') return false;
  if (account.dealerCode === 'ADMIN') return true;
  return Boolean(account.uid && account.dealerCode?.trim() && account.name?.trim() && (account.level === 1 || account.level === 2));
}

export default function DealerOrder() {
  const { products, productCategories, dealerPricingSettings, showToast } = useApp();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [loadedCartUid, setLoadedCartUid] = useState<string | null>(null);
  const [detail, setDetail] = useState<Product | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [account, setAccount] = useState<DealerAccount | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [phone, setPhone] = useState('');
  const email = phone;
  const setEmail = setPhone;
  const [password, setPassword] = useState('');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [checkout, setCheckout] = useState({ recipientName: '', recipientPhone: '', deliveryAddress: '', province: '', district: '', ward: '', streetAddress: '', postMergerAddress: '', note: '' });
  const [locationData, setLocationData] = useState<Array<{ name: string; districts: Array<{ name: string; wards: Array<{ name: string }> }> }>>([]);
  const [orderHistory, setOrderHistory] = useState<DealerOrderRecord[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const dealerLevel = account?.level || 2;
  const level1Discount = dealerLevel === 1 && account?.customDiscountPercent !== undefined ? account.customDiscountPercent : dealerPricingSettings.level1DiscountPercent;
  const level2Discount = dealerLevel === 2 && account?.customDiscountPercent !== undefined ? account.customDiscountPercent : dealerPricingSettings.level2DiscountPercent;
  const currentAccountDiscount = dealerLevel === 1 ? level1Discount : level2Discount;
  // Compatibility aliases for the compact detail modal markup; both now mean a direct discount.
  const baseDiscount = currentAccountDiscount;
  const level1Extra = 0;
  const canAccessDealerOrder = Boolean(user && isUsableDealerAccount(account));
  const dealerProducts = canAccessDealerOrder ? products : [];
  const dealerProductCategories = canAccessDealerOrder ? productCategories : [];

  useEffect(() => onAuthStateChanged(auth, async (currentUser) => {
    setUser(currentUser);
    setAccount(null);
    if (currentUser) {
      try {
        const snapshot = await getDoc(doc(db, 'dealerAccounts', currentUser.uid));
        if (snapshot.exists()) {
          setAccount(snapshot.data() as DealerAccount);
        } else if (isAdminEmail(currentUser.email)) {
          const now = new Date().toISOString();
          setAccount({
            uid: currentUser.uid,
            dealerCode: 'ADMIN',
            name: 'Quản trị viên Voltara',
            email: currentUser.email || '',
            level: 1,
            status: 'active',
            createdAt: now,
            updatedAt: now,
          });
        }
      } catch { setLoginError('Không đọc được quyền tài khoản đại lý.'); }
    }
    setAuthLoading(false);
  }), []);

  useEffect(() => {
    if (!canAccessDealerOrder || !user?.uid) {
      setLoadedCartUid(null);
      setQuantities({});
      setDetail(null);
      setIsCheckoutOpen(false);
      setIsMobileCartOpen(false);
      return;
    }

    try {
      const saved = JSON.parse(localStorage.getItem(`xuongin3d_dealer_cart_${user.uid}`) || '{}') as Record<string, unknown>;
      const restored = Object.entries(saved).reduce<Record<string, number>>((result, [productId, quantity]) => {
        const normalizedQuantity = Math.min(9999, Math.max(0, Math.floor(Number(quantity) || 0)));
        if (normalizedQuantity > 0) result[productId] = normalizedQuantity;
        return result;
      }, {});
      setQuantities(restored);
    } catch {
      setQuantities({});
      localStorage.removeItem(`xuongin3d_dealer_cart_${user.uid}`);
    }
    setLoadedCartUid(user.uid);
  }, [canAccessDealerOrder, user?.uid]);

  useEffect(() => {
    if (!canAccessDealerOrder || !user?.uid || loadedCartUid !== user.uid) return;
    const storageKey = `xuongin3d_dealer_cart_${user.uid}`;
    const activeQuantities = Object.fromEntries(Object.entries(quantities).filter(([, quantity]) => quantity > 0));
    if (Object.keys(activeQuantities).length) localStorage.setItem(storageKey, JSON.stringify(activeQuantities));
    else localStorage.removeItem(storageKey);
  }, [quantities, canAccessDealerOrder, user?.uid, loadedCartUid]);

  useEffect(() => {
    if (account) return;
    const input = document.querySelector<HTMLInputElement>('form input[type="email"]');
    if (!input) return;
    input.type = 'tel';
    input.inputMode = 'tel';
    input.placeholder = 'Số điện thoại';
    input.form?.setAttribute('novalidate', 'true');
    const labelText = input.parentElement?.firstChild;
    if (labelText?.nodeType === Node.TEXT_NODE) labelText.textContent = 'Số điện thoại';
  }, [account, user, authLoading]);

  useEffect(() => {
    if (!user || !account || account.dealerCode === 'ADMIN') return undefined;
    const ordersQuery = firestoreQuery(collection(db, 'dealerOrders'), where('dealerUid', '==', user.uid), limit(20));
    return onSnapshot(ordersQuery, (snapshot) => {
      const items = snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as DealerOrderRecord));
      setOrderHistory(items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    }, (error) => console.error('Could not load dealer order history:', error));
  }, [user, account]);

  useEffect(() => {
    if (!isCheckoutOpen || locationData.length) return;
    fetch('https://provinces.open-api.vn/api/?depth=3')
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('location-api')))
      .then((data) => Array.isArray(data) && setLocationData(data))
      .catch((error) => console.warn('Could not load ward data, using local province data:', error));
  }, [isCheckoutOpen, locationData.length]);

  useEffect(() => {
    const openMobileCart = () => setIsMobileCartOpen(true);
    window.addEventListener('xuongin3d:open-dealer-cart', openMobileCart);
    return () => window.removeEventListener('xuongin3d:open-dealer-cart', openMobileCart);
  }, []);

  useEffect(() => {
    if (!isMobileCartOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [isMobileCartOpen]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault(); setLoginLoading(true); setLoginError('');
    try {
      const normalizedPhone = normalizePhone(phone);
      if (!/^0\d{9}$/.test(normalizedPhone)) throw new Error('invalid-phone');
      if (auth.currentUser) await signOut(auth);
      setUser(null);
      setAccount(null);
      setQuantities({});
      await signInWithEmailAndPassword(auth, authEmailFromPhone(normalizedPhone), password);
    }
    catch { setLoginError('Số điện thoại hoặc mật khẩu không đúng.'); }
    finally { setLoginLoading(false); }
  };

  const visibleProducts = useMemo(() => dealerProducts.filter((product) => {
    if (product.hidden) return false;
    const matchesCategory = category === 'all' || product.category === category;
    const text = `${product.name} ${product.id} ${product.sku || ''}`.toLowerCase();
    return matchesCategory && text.includes(query.trim().toLowerCase());
  }), [dealerProducts, category, query]);

  const cart = useMemo(() => dealerProducts
    .filter((product) => (quantities[product.id] || 0) > 0)
    .map((product) => ({ product, quantity: quantities[product.id], price: dealerPriceOf(product, dealerLevel, level1Discount, level2Discount) })), [dealerProducts, quantities, dealerLevel, level1Discount, level2Discount]);

  const retailTotal = cart.reduce((sum, item) => sum + retailOf(item.product) * item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const saved = Math.max(0, retailTotal - subtotal);
  const totalUnits = cart.reduce((sum, item) => sum + item.quantity, 0);
  const provinceOptions = locationData.length ? locationData.map((item) => item.name) : VIETNAM_LOCATIONS.map((item) => item.province);
  const selectedRemoteProvince = locationData.find((item) => item.name === checkout.province);
  const districtOptions = selectedRemoteProvince?.districts.map((item) => item.name) || VIETNAM_LOCATIONS.find((item) => item.province === checkout.province)?.districts || [];
  const wardOptions = selectedRemoteProvince?.districts.find((item) => item.name === checkout.district)?.wards.map((item) => item.name) || [];
  const setQuantity = (id: string, quantity: number) => setQuantities((current) => ({ ...current, [id]: Math.max(0, quantity) }));
  const scrollToProducts = () => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => document.getElementById('dealer-products-start')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    });
  };
  const updateQuery = (nextQuery: string) => {
    setQuery(nextQuery);
    scrollToProducts();
  };
  const selectCategory = (nextCategory: string) => {
    setCategory(nextCategory);
    scrollToProducts();
  };
  const openCheckout = () => {
    setCheckout((current) => ({ ...current, recipientName: current.recipientName || account?.name || '', recipientPhone: current.recipientPhone || account?.phone || '' }));
    setIsCheckoutOpen(true);
  };
  const submitOrder = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!account || !user || !cart.length) return;
    const recipientPhone = normalizePhone(checkout.recipientPhone);
    if (!/^0\d{9}$/.test(recipientPhone)) return showToast('Số điện thoại người nhận chưa hợp lệ.', 'warning');
    if (!checkout.province || !checkout.district || !checkout.ward || !checkout.streetAddress.trim()) return showToast('Vui lòng chọn đầy đủ địa chỉ giao hàng.', 'warning');
    setSubmittingOrder(true);
    try {
      const now = new Date().toISOString();
      await addDoc(collection(db, 'dealerOrders'), {
        dealerUid: user.uid,
        dealerCode: account.dealerCode,
        dealerName: account.name,
        dealerLevel,
        recipientName: checkout.recipientName.trim(),
        recipientPhone,
        deliveryAddress: `${[checkout.streetAddress.trim(), checkout.ward, checkout.district, checkout.province].filter(Boolean).join(', ')}${checkout.postMergerAddress.trim() ? ` | Sau sáp nhập: ${checkout.postMergerAddress.trim()}` : ''}`,
        province: checkout.province,
        district: checkout.district,
        ward: checkout.ward,
        streetAddress: checkout.streetAddress.trim(),
        ...(checkout.postMergerAddress.trim() ? { postMergerAddress: checkout.postMergerAddress.trim() } : {}),
        ...(checkout.note.trim() ? { note: checkout.note.trim() } : {}),
        items: cart.map(({ product, quantity, price }) => ({ productId: product.id, sku: product.sku || product.id, name: product.name, image: product.image || '', quantity, retailPrice: retailOf(product), dealerPrice: price })),
        retailTotal,
        discountTotal: saved,
        total: subtotal,
        status: 'new',
        createdAt: now,
        updatedAt: now,
      });
      setQuantities({});
      setIsCheckoutOpen(false);
      showToast('Đã gửi đơn hàng. Bộ phận Sale sẽ liên hệ xác nhận.', 'success');
      announceOrderSuccess('dealer');
    } catch (error) {
      console.error('Could not create dealer order:', error);
      showToast('Không thể gửi đơn hàng. Vui lòng kiểm tra Firestore Rules.', 'error');
    } finally { setSubmittingOrder(false); }
  };

  if (authLoading) return <div className="flex min-h-screen items-center justify-center bg-[#080808] pt-20 text-sm uppercase tracking-widest text-[#f4b820]">Đang kiểm tra tài khoản...</div>;
  if (!user || !account) return <div className="flex min-h-screen items-center justify-center bg-[#080808] px-4 pt-20 text-white"><div className="w-full max-w-md border border-[#f4b820]/25 bg-[#111] shadow-2xl"><div className="border-b border-white/10 p-6"><div className="mb-4 flex h-12 w-12 items-center justify-center border border-[#f4b820]/30 bg-[#f4b820]/10"><Lock className="h-6 w-6 text-[#f4b820]" /></div><p className="text-[10px] font-bold uppercase tracking-[.24em] text-[#f4b820]">Cổng dành cho đại lý</p><h1 className="mt-2 font-display text-2xl font-black uppercase">Đăng nhập đặt hàng</h1><p className="mt-2 text-xs leading-5 text-gray-500">Hệ thống tự nhận diện cấp đại lý và hiển thị đúng bảng giá sau khi đăng nhập.</p></div>{user && !account ? <div className="p-6"><p className="border border-red-500/20 bg-red-500/10 p-4 text-xs leading-5 text-red-300">Tài khoản này chưa được Admin cấp quyền đại lý hoặc hồ sơ đã bị xóa.</p><button onClick={() => signOut(auth)} className="mt-4 w-full border border-white/10 py-3 text-xs font-bold uppercase">Đăng xuất</button></div> : <form onSubmit={handleLogin} className="space-y-4 p-6"><label className="block space-y-2 text-[10px] font-bold uppercase text-gray-400">Email<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-white/10 bg-black px-4 py-3 text-sm normal-case text-white outline-none focus:border-[#f4b820]" /></label><label className="block space-y-2 text-[10px] font-bold uppercase text-gray-400">Mật khẩu<input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none focus:border-[#f4b820]" /></label>{loginError && <p className="border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">{loginError}</p>}<button disabled={loginLoading} className="flex w-full items-center justify-center gap-2 bg-[#f4b820] py-3 text-xs font-black uppercase text-black disabled:opacity-50"><LogIn className="h-4 w-4" />{loginLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}</button></form>}</div></div>;
  if (account.status === 'locked') return <div className="flex min-h-screen items-center justify-center bg-[#080808] px-4 pt-20"><div className="max-w-md border border-red-500/20 bg-[#111] p-8 text-center"><Lock className="mx-auto h-8 w-8 text-red-400" /><h1 className="mt-4 text-xl font-black uppercase">Tài khoản đã bị khóa</h1><p className="mt-2 text-xs text-gray-500">Vui lòng liên hệ Voltara để được hỗ trợ.</p><button onClick={() => signOut(auth)} className="mt-5 border border-white/10 px-5 py-3 text-xs uppercase">Đăng xuất</button></div></div>;
  if (!canAccessDealerOrder) return <div className="flex min-h-screen items-center justify-center bg-[#080808] px-4 pt-20"><div className="max-w-md border border-red-500/20 bg-[#111] p-8 text-center"><Lock className="mx-auto h-8 w-8 text-red-400" /><h1 className="mt-4 text-xl font-black uppercase">Không có quyền đặt hàng</h1><p className="mt-2 text-xs text-gray-500">Tài khoản này chưa được cấp hồ sơ đại lý hợp lệ.</p><button onClick={() => signOut(auth)} className="mt-5 border border-white/10 px-5 py-3 text-xs uppercase">Đăng xuất</button></div></div>;

  return (
    <div className="min-h-screen bg-[#080808] pt-20 text-[#efefef]">
      <header className="border-y border-white/10 bg-[#0b0b0b]/95 backdrop-blur-xl lg:sticky lg:top-16 lg:z-30">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-3 py-3 lg:flex-row lg:items-center lg:px-4 lg:py-4">
          <div className="min-w-56">
            <p className="text-[10px] font-bold uppercase tracking-[.24em] text-[#f4b820]">Cổng đặt hàng đại lý</p>
            <h1 className="mt-1 line-clamp-1 font-display text-lg font-black uppercase lg:text-xl">Xin chào, {account.name}</h1>
          </div>
            <div className="flex flex-1 gap-2 overflow-x-auto">
            <div className="min-w-36 border-l border-white/10 px-4"><p className="text-[10px] text-gray-500">Hạng tài khoản</p><b className="text-sm text-[#f4b820]">{account.dealerCode === 'ADMIN' ? 'Admin · Xem giá cấp 1' : `Đại lý cấp ${dealerLevel}`}</b></div>
            <div className="min-w-36 border-l border-white/10 px-4"><p className="text-[10px] text-gray-500">CK trực tiếp từ giá bán</p><b className="text-2xl text-[#f4b820]">{currentAccountDiscount}%</b></div>
          </div>
          <div className="flex items-center justify-between gap-5 rounded bg-[#151515] px-4 py-3 lg:min-w-72">
            <div><p className="text-[10px] text-gray-500">Tổng đơn hàng</p><b className="text-lg text-[#f4b820]">{money.format(subtotal)}</b></div>
            <ShoppingCart className="h-6 w-6" /><span className="rounded-full bg-[#f4b820] px-2 py-1 text-xs font-black text-black">{totalUnits}</span>
          </div>
          {account.dealerCode !== 'ADMIN' && <button onClick={() => setIsHistoryOpen(true)} className="border border-gold-dark/30 px-3 py-2 text-[10px] font-bold uppercase text-gold-light">Lịch sử mua ({orderHistory.length})</button>}
          <button onClick={() => signOut(auth)} className="border border-white/10 px-3 py-2 text-[10px] uppercase text-gray-400 hover:text-white">Đăng xuất</button>
        </div>
      </header>

      <div className="sticky top-16 z-40 border-b border-white/10 bg-[#0b0b0b]/98 px-2 py-2 shadow-xl backdrop-blur-xl lg:hidden">
        <label className="flex h-12 items-center gap-2 border border-[#f4b820]/40 bg-black px-3">
          <Search className="h-5 w-5 shrink-0 text-[#f4b820]" />
          <input value={query} onChange={(e) => updateQuery(e.target.value)} placeholder="Tìm tên, SKU hoặc mã sản phẩm..." className="w-full bg-transparent text-base text-white outline-none placeholder:text-gray-600" />
          {query && <button onClick={() => updateQuery('')} className="p-1 text-gray-500"><X className="h-4 w-4" /></button>}
        </label>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button onClick={() => selectCategory('all')} className={`shrink-0 rounded-full border px-3 py-2 text-[11px] font-bold uppercase ${category === 'all' ? 'border-[#f4b820] bg-[#f4b820] text-black' : 'border-white/10 text-gray-400'}`}>Tất cả</button>
          {dealerProductCategories.filter((item) => !item.hidden).map((item) => <button key={item.id} onClick={() => selectCategory(item.id)} className={`shrink-0 rounded-full border px-3 py-2 text-[11px] font-bold ${category === item.id ? 'border-[#f4b820] bg-[#f4b820] text-black' : 'border-white/10 text-gray-400'}`}>{item.name}</button>)}
        </div>
      </div>

      <div className="mx-auto grid max-w-[1600px] gap-2 p-2 lg:grid-cols-[210px_minmax(0,1fr)_330px] lg:gap-4 lg:p-4">
        <aside className="hidden h-fit border border-white/10 bg-[#0e0e0e] lg:sticky lg:top-40 lg:block">
          <button onClick={() => selectCategory('all')} className={`w-full px-4 py-3 text-left text-xs font-black uppercase ${category === 'all' ? 'bg-[#f4b820] text-black' : ''}`}>Tất cả sản phẩm</button>
          {dealerProductCategories.filter((item) => !item.hidden).map((item) => (
            <button key={item.id} onClick={() => selectCategory(item.id)} className={`w-full border-t border-white/5 px-4 py-3 text-left text-xs transition hover:text-[#f4b820] ${category === item.id ? 'text-[#f4b820]' : 'text-gray-300'}`}>{item.name}</button>
          ))}
          <Link href="/dai-ly" className="flex items-center justify-between border-t border-white/10 px-4 py-4 text-[10px] font-bold uppercase text-gray-500 hover:text-white">Hệ thống đại lý <ChevronRight className="h-4 w-4" /></Link>
        </aside>

        <main id="dealer-products-start" className="min-h-[65vh] min-w-0 scroll-mt-40">
          <div className="mb-3 hidden flex-col gap-2 lg:flex lg:flex-row">
            <label className="flex flex-1 items-center gap-2 border border-white/10 bg-[#111] px-4 py-3"><Search className="h-4 w-4 text-gray-500" /><input value={query} onChange={(e) => updateQuery(e.target.value)} placeholder="Tìm tên, mã SKU hoặc mã sản phẩm..." className="w-full bg-transparent text-base outline-none lg:text-sm" /></label>
            <div className="flex min-w-[290px] items-center gap-2 border border-white/10 bg-[#111] px-3 py-2 text-xs"><b className="whitespace-nowrap text-[#f4b820]">NHẬP NHANH</b><input placeholder="Mã sản phẩm" className="min-w-0 flex-1 bg-black px-3 py-2 outline-none" onKeyDown={(e) => { if (e.key === 'Enter') { const found = dealerProducts.find((p) => [p.id, p.sku].some((v) => v?.toLowerCase() === e.currentTarget.value.toLowerCase())); if (found) { setQuantity(found.id, (quantities[found.id] || 0) + 1); e.currentTarget.value = ''; } else showToast('Không tìm thấy mã sản phẩm', 'warning'); } }} /></div>
          </div>
          <div className="mb-2 flex items-center justify-between px-1 lg:mb-3 lg:px-0"><h2 className="font-display text-xs font-black uppercase lg:text-sm">{category === 'all' ? 'Tất cả sản phẩm' : dealerProductCategories.find((item) => item.id === category)?.name}</h2><span className="text-[10px] text-gray-500 lg:text-xs">{visibleProducts.length} sản phẩm</span></div>
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {visibleProducts.length === 0 && <div className="col-span-full flex min-h-64 flex-col items-center justify-center border border-white/10 bg-[#0d0d0d] px-5 text-center"><Search className="mb-3 h-8 w-8 text-gray-700" /><b className="text-sm uppercase text-gray-300">Không tìm thấy sản phẩm</b><p className="mt-2 text-xs text-gray-500">Kiểm tra lại tên, SKU hoặc mã sản phẩm.</p>{query && <button type="button" onClick={() => updateQuery('')} className="mt-4 border border-[#f4b820]/30 px-4 py-2 text-[10px] font-bold uppercase text-[#f4b820]">Xóa từ khóa</button>}</div>}
            {visibleProducts.map((product) => {
              const quantity = quantities[product.id] || 0;
              const selected = quantity > 0;
              const retailPrice = retailOf(product);
              const dealerPrice = dealerPriceOf(product, dealerLevel, level1Discount, level2Discount);
              const discountPercent = effectiveDiscount(product, dealerLevel, level1Discount, level2Discount);
              const hasVariantPrices = !parsePrice(product.retailPrice || product.salePrice || product.price) && (product.variants || []).some((variant) => parsePrice(variant.salePrice || variant.price));
              return <article key={product.id} className={`group relative overflow-hidden border bg-[#f1f1ef] text-black transition ${selected ? 'border-[#f4b820] ring-1 ring-[#f4b820]' : 'border-black/10'}`}>
                <button onClick={() => setDetail(product)} className="block w-full text-left">
                  <div className="aspect-square overflow-hidden bg-white"><img src={product.image || '/images/voltara_banner.webp'} alt={product.name} className="h-full w-full object-contain transition duration-300 group-hover:scale-105" /></div>
                  <div className="p-3"><span className="text-[9px] font-black text-gray-500">{product.sku || product.id}</span><h3 className="mt-1 line-clamp-2 min-h-9 text-xs font-black uppercase">{product.name}</h3>{retailPrice ? <div className="mt-2"><div className="flex items-center justify-between gap-2"><span className="text-[10px] text-gray-500">{hasVariantPrices ? 'Giá gốc từ' : 'Giá gốc'}</span><span className="text-[10px] text-gray-400 line-through">{money.format(retailPrice)}</span></div><div className="mt-1 flex items-end justify-between gap-2"><div><p className="text-[10px] text-gray-500">Giá đại lý</p><b className="text-sm text-black">{money.format(dealerPrice)}</b></div><span className="rounded bg-emerald-100 px-1.5 py-1 text-[9px] font-black text-emerald-700">-{discountPercent}%</span></div></div> : <div className="mt-2"><p className="text-[10px] text-gray-500">Giá đại lý</p><b className="text-sm">Liên hệ</b></div>}</div>
                </button>
                <div className="flex h-10 border-t border-black/10">
                  {selected ? <><button onClick={() => setQuantity(product.id, quantity - 1)} className="w-10 bg-black/5"><Minus className="mx-auto h-4 w-4" /></button><b className="flex flex-1 items-center justify-center">{quantity}</b><button onClick={() => setQuantity(product.id, quantity + 1)} className="w-10 bg-black/5"><Plus className="mx-auto h-4 w-4" /></button></> : <button onClick={() => setQuantity(product.id, 1)} className="flex w-full items-center justify-center gap-2 bg-[#f4b820] text-xs font-black uppercase"><Check className="h-4 w-4" /> Chọn</button>}
                </div>
              </article>;
            })}
          </div>
        </main>

        <aside id="dealer-order-cart" className="h-fit scroll-mt-24 border border-white/10 bg-[#111] lg:sticky lg:top-40">
          <div className="flex items-center justify-between border-b border-white/10 p-4"><h2 className="font-display text-sm font-black uppercase">Đơn hàng ({cart.length})</h2>{cart.length > 0 && <button onClick={() => setQuantities({})} className="text-[10px] text-red-400">Xóa hết</button>}</div>
          <div className="max-h-[42vh] overflow-y-auto px-4">
            {cart.length === 0 ? <div className="py-12 text-center"><ShoppingCart className="mx-auto mb-3 h-8 w-8 text-gray-700" /><p className="text-xs text-gray-500">Chọn sản phẩm để bắt đầu đơn hàng</p></div> : cart.map(({ product, quantity, price }) => <div key={product.id} className="flex gap-3 border-b border-white/10 py-3"><img src={product.image} alt="" className="h-14 w-14 bg-white object-contain" /><div className="min-w-0 flex-1"><p className="truncate text-[10px] font-bold">{product.name}</p><p className="mt-1 text-xs text-gray-500">{quantity} × {money.format(price)}</p><b className="text-sm text-[#f4b820]">{money.format(price * quantity)}</b><div className="mt-2 inline-flex h-7 items-center border border-white/15 bg-black"><button type="button" aria-label={`Giảm số lượng ${product.name}`} onClick={() => setQuantity(product.id, quantity - 1)} className="flex h-full w-7 items-center justify-center text-gray-300 transition hover:bg-white/10 hover:text-white"><Minus className="h-3.5 w-3.5" /></button><span className="flex h-full min-w-8 items-center justify-center border-x border-white/15 px-1 text-xs font-bold text-white">{quantity}</span><button type="button" aria-label={`Tăng số lượng ${product.name}`} onClick={() => setQuantity(product.id, quantity + 1)} className="flex h-full w-7 items-center justify-center text-gray-300 transition hover:bg-white/10 hover:text-white"><Plus className="h-3.5 w-3.5" /></button></div></div><button type="button" aria-label={`Xóa ${product.name} khỏi đơn hàng`} onClick={() => setQuantity(product.id, 0)} className="self-start p-1"><Trash2 className="h-4 w-4 text-red-400" /></button></div>)}
          </div>
          <div className="space-y-2 border-t border-white/10 p-4 text-xs"><div className="flex justify-between text-gray-400"><span>Giá bán lẻ</span><span>{money.format(retailTotal)}</span></div><div className="flex justify-between text-emerald-400"><span>Tiết kiệm</span><span>-{money.format(saved)}</span></div><div className="flex justify-between border-t border-white/10 pt-3 text-base font-black"><span>Tổng cộng</span><span className="text-[#f4b820]">{money.format(subtotal)}</span></div></div>
          <button disabled={!cart.length} onClick={openCheckout} className="m-4 mt-0 flex w-[calc(100%-2rem)] items-center justify-center gap-2 bg-[#f4b820] py-3 text-sm font-black uppercase text-black disabled:cursor-not-allowed disabled:opacity-40"><PackageCheck className="h-5 w-5" /> Đặt hàng</button>
          <p className="border-t border-white/10 p-3 text-center text-[10px] text-gray-500">Bộ phận Sale sẽ liên hệ đại lý để xác nhận giao hàng.</p>
        </aside>
      </div>

      {isMobileCartOpen && <div className="fixed inset-0 z-[80] flex items-end bg-black/75 backdrop-blur-sm lg:hidden" onClick={() => setIsMobileCartOpen(false)}>
        <section role="dialog" aria-modal="true" aria-label="Đơn hàng đang đặt" onClick={(event) => event.stopPropagation()} className="flex max-h-[88dvh] w-full flex-col border-t border-[#f4b820]/40 bg-[#111] shadow-2xl">
          <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-4"><div><p className="text-[9px] font-bold uppercase tracking-[.2em] text-[#f4b820]">Đơn hàng đang đặt</p><h2 className="mt-1 font-display text-base font-black uppercase">{cart.length} sản phẩm · {totalUnits} món</h2></div><button type="button" aria-label="Đóng đơn hàng" onClick={() => setIsMobileCartOpen(false)} className="rounded-full border border-white/10 p-2 text-gray-400"><X className="h-5 w-5" /></button></div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4">
            {cart.length === 0 ? <div className="py-14 text-center"><ShoppingCart className="mx-auto mb-3 h-9 w-9 text-gray-700" /><p className="text-xs text-gray-500">Chưa chọn sản phẩm nào</p></div> : cart.map(({ product, quantity, price }) => <div key={product.id} className="flex gap-3 border-b border-white/10 py-3"><img src={product.image} alt="" className="h-16 w-16 shrink-0 bg-white object-contain" /><div className="min-w-0 flex-1"><p className="line-clamp-2 text-[11px] font-bold">{product.name}</p><p className="mt-1 text-xs text-gray-500">{money.format(price)} / sản phẩm</p><div className="mt-2 flex items-center justify-between"><b className="text-sm text-[#f4b820]">{money.format(price * quantity)}</b><div className="inline-flex h-8 items-center border border-white/15 bg-black"><button type="button" aria-label={`Giảm số lượng ${product.name}`} onClick={() => setQuantity(product.id, quantity - 1)} className="flex h-full w-8 items-center justify-center"><Minus className="h-4 w-4" /></button><span className="flex h-full min-w-9 items-center justify-center border-x border-white/15 text-sm font-bold">{quantity}</span><button type="button" aria-label={`Tăng số lượng ${product.name}`} onClick={() => setQuantity(product.id, quantity + 1)} className="flex h-full w-8 items-center justify-center"><Plus className="h-4 w-4" /></button></div></div></div><button type="button" aria-label={`Xóa ${product.name}`} onClick={() => setQuantity(product.id, 0)} className="self-start p-2 text-red-400"><Trash2 className="h-4 w-4" /></button></div>)}
          </div>
          <div className="shrink-0 border-t border-white/10 bg-[#111] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"><div className="mb-3 flex items-end justify-between"><div className="text-xs text-gray-500"><p>Giá bán lẻ: {money.format(retailTotal)}</p><p className="mt-1 text-emerald-400">Tiết kiệm: -{money.format(saved)}</p></div><div className="text-right"><p className="text-[9px] uppercase text-gray-500">Tổng cộng</p><b className="text-xl text-[#f4b820]">{money.format(subtotal)}</b></div></div><button type="button" disabled={!cart.length} onClick={() => { setIsMobileCartOpen(false); openCheckout(); }} className="flex w-full items-center justify-center gap-2 bg-[#f4b820] py-3.5 text-sm font-black uppercase text-black disabled:opacity-40"><PackageCheck className="h-5 w-5" /> Đặt hàng</button></div>
        </section>
      </div>}

      {detail && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setDetail(null)}><div className="relative grid max-h-[90vh] w-full max-w-4xl overflow-y-auto border border-white/15 bg-[#121212] md:grid-cols-[.9fr_1.1fr]" onClick={(e) => e.stopPropagation()}><button onClick={() => setDetail(null)} className="absolute right-3 top-3 z-10 rounded-full bg-black p-2"><X className="h-5 w-5" /></button><div className="flex min-h-80 items-center bg-white p-5"><img src={detail.image} alt={detail.name} className="h-auto max-h-[560px] w-full object-contain" /></div><div className="flex flex-col p-6 md:p-8"><p className="text-[10px] font-bold uppercase tracking-widest text-[#f4b820]">{detail.sku || detail.id}</p><h2 className="mt-2 pr-8 font-display text-xl font-black uppercase leading-tight md:text-2xl">{detail.name}</h2><div className="mt-5 flex items-end justify-between border-y border-white/10 py-4"><div><p className="text-[10px] uppercase text-gray-500">Giá đại lý cấp {dealerLevel}</p><b className="mt-1 block text-xl text-[#f4b820]">{dealerPriceOf(detail, dealerLevel, baseDiscount, level1Extra) ? money.format(dealerPriceOf(detail, dealerLevel, baseDiscount, level1Extra)) : 'Liên hệ'}</b></div><span className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-400">CK {detail.dealerDiscountPercent ?? (dealerLevel === 1 ? baseDiscount + level1Extra : baseDiscount)}%</span></div><h3 className="mt-5 text-xs font-black uppercase tracking-wider text-white">Thông số kỹ thuật</h3><div className="mt-3 overflow-hidden border border-white/10 text-xs">{Object.entries(detail.specs || {}).filter(([key, value]) => cleanText(key) && cleanText(value)).slice(0, 10).map(([key, value], index) => <div key={key} className={`grid grid-cols-[42%_58%] gap-3 px-3 py-2.5 ${index % 2 ? 'bg-white/[.025]' : 'bg-black/20'}`}><span className="text-gray-500">{cleanText(key)}</span><b className="break-words text-right text-gray-200">{cleanText(value)}</b></div>)}{Object.entries(detail.specs || {}).filter(([key, value]) => cleanText(key) && cleanText(value)).length === 0 && <div className="p-4 text-center text-gray-500">Thông số đang được cập nhật</div>}</div><button onClick={() => { setQuantity(detail.id, (quantities[detail.id] || 0) + 1); setDetail(null); }} className="mt-6 w-full bg-[#f4b820] py-3 text-xs font-black uppercase text-black">Thêm vào đơn hàng</button></div></div></div>}
      {isCheckoutOpen && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4" onClick={() => !submittingOrder && setIsCheckoutOpen(false)}><form onSubmit={submitOrder} onClick={(e) => e.stopPropagation()} className="w-full max-w-lg border border-[#f4b820]/30 bg-[#111] text-white shadow-2xl"><div className="flex items-center justify-between border-b border-white/10 p-5"><div><p className="text-[10px] font-bold uppercase tracking-widest text-[#f4b820]">Xác nhận đơn hàng</p><h2 className="mt-1 text-lg font-black uppercase">Thông tin nhận hàng</h2></div><button type="button" onClick={() => setIsCheckoutOpen(false)} className="p-2 text-gray-500"><X className="h-5 w-5" /></button></div><div className="grid gap-4 p-5 sm:grid-cols-2"><label className="space-y-2 text-[10px] font-bold uppercase text-gray-400">Tên người nhận *<input required value={checkout.recipientName} onChange={(e) => setCheckout({ ...checkout, recipientName: e.target.value })} className="w-full border border-white/10 bg-black px-3 py-3 text-base normal-case text-white outline-none focus:border-[#f4b820]" /></label><label className="space-y-2 text-[10px] font-bold uppercase text-gray-400">Số điện thoại *<input required inputMode="tel" value={checkout.recipientPhone} onChange={(e) => setCheckout({ ...checkout, recipientPhone: e.target.value })} className="w-full border border-white/10 bg-black px-3 py-3 text-base normal-case text-white outline-none focus:border-[#f4b820]" /></label><label className="space-y-2 text-[10px] font-bold uppercase text-gray-400 sm:col-span-2">Địa chỉ giao hàng *<textarea required rows={3} value={checkout.deliveryAddress} onChange={(e) => setCheckout({ ...checkout, deliveryAddress: e.target.value })} className="w-full resize-none border border-white/10 bg-black px-3 py-3 text-base normal-case text-white outline-none focus:border-[#f4b820]" /></label><label className="space-y-2 text-[10px] font-bold uppercase text-gray-400 sm:col-span-2">Ghi chú<textarea rows={2} value={checkout.note} onChange={(e) => setCheckout({ ...checkout, note: e.target.value })} placeholder="Thông tin cần Sale lưu ý" className="w-full resize-none border border-white/10 bg-black px-3 py-3 text-base normal-case text-white outline-none focus:border-[#f4b820]" /></label></div><div className="flex items-center justify-between border-t border-white/10 p-5"><div><p className="text-[10px] uppercase text-gray-500">Tổng thanh toán</p><b className="text-lg text-[#f4b820]">{money.format(subtotal)}</b></div><button disabled={submittingOrder} className="bg-[#f4b820] px-5 py-3 text-xs font-black uppercase text-black disabled:opacity-50">{submittingOrder ? 'Đang gửi...' : 'Xác nhận đặt hàng'}</button></div></form></div>}

      {isHistoryOpen && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4" onClick={() => setIsHistoryOpen(false)}><div onClick={(e) => e.stopPropagation()} className="max-h-[88vh] w-full max-w-3xl overflow-y-auto border border-white/15 bg-[#111]"><div className="sticky top-0 flex items-center justify-between border-b border-white/10 bg-[#111] p-5"><div><p className="text-[10px] font-bold uppercase tracking-widest text-[#f4b820]">Tài khoản {account.dealerCode}</p><h2 className="mt-1 text-lg font-black uppercase">Lịch sử mua hàng</h2></div><button onClick={() => setIsHistoryOpen(false)}><X className="h-5 w-5" /></button></div><div className="space-y-3 p-4">{orderHistory.length === 0 ? <p className="py-12 text-center text-xs text-gray-500">Chưa có đơn hàng nào.</p> : orderHistory.map((order) => <article key={order.id} className="border border-white/10 bg-black/30 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><b className="font-mono text-xs text-gold-light">#{order.id.slice(-8).toUpperCase()}</b><p className="mt-1 text-[10px] text-gray-500">{new Date(order.createdAt).toLocaleString('vi-VN')}</p></div><div className="text-right"><span className="inline-block border border-white/10 px-2 py-1 text-[9px] font-bold uppercase text-gray-300">{{ new: 'Đơn mới', confirmed: 'Đã xác nhận', contacting: 'Sale đang liên hệ', completed: 'Hoàn tất', cancelled: 'Đã hủy' }[order.status]}</span><b className="mt-2 block text-base text-[#f4b820]">{money.format(order.total)}</b></div></div><div className="mt-3 space-y-2 border-t border-white/10 pt-3">{order.items.map((item) => <div key={item.productId} className="flex justify-between gap-3 text-xs"><span className="line-clamp-1 text-gray-400">{item.quantity} × {item.name}</span><b>{money.format(item.dealerPrice * item.quantity)}</b></div>)}</div><div className="mt-3 border-t border-white/10 pt-3 text-[10px] leading-5 text-gray-500"><p>{order.recipientName} · {order.recipientPhone}</p><p>{order.deliveryAddress}</p>{order.note && <p>Ghi chú: {order.note}</p>}</div></article>)}</div></div></div>}
      {isCheckoutOpen && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-3"><form onSubmit={submitOrder} className="max-h-[94vh] w-full max-w-2xl overflow-y-auto border border-[#f4b820]/30 bg-[#111] text-white shadow-2xl"><div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#111] p-5"><div><p className="text-[10px] font-bold uppercase tracking-widest text-[#f4b820]">Xác nhận đơn hàng</p><h2 className="mt-1 text-lg font-black uppercase">Thông tin nhận hàng</h2></div><button type="button" onClick={() => setIsCheckoutOpen(false)}><X className="h-5 w-5" /></button></div><div className="grid gap-4 p-5 sm:grid-cols-2"><label className="space-y-2 text-[10px] font-bold uppercase text-gray-400">Tên người nhận *<input required value={checkout.recipientName} onChange={(e) => setCheckout({ ...checkout, recipientName: e.target.value })} className="w-full border border-white/10 bg-black px-3 py-3 text-base normal-case text-white outline-none focus:border-[#f4b820]" /></label><label className="space-y-2 text-[10px] font-bold uppercase text-gray-400">Số điện thoại *<input required inputMode="tel" value={checkout.recipientPhone} onChange={(e) => setCheckout({ ...checkout, recipientPhone: e.target.value })} className="w-full border border-white/10 bg-black px-3 py-3 text-base normal-case text-white outline-none focus:border-[#f4b820]" /></label><label className="space-y-2 text-[10px] font-bold uppercase text-gray-400">Tỉnh / Thành phố *<select required value={checkout.province} onChange={(e) => setCheckout({ ...checkout, province: e.target.value, district: '', ward: '' })} className="w-full border border-white/10 bg-black px-3 py-3 text-base normal-case text-white outline-none focus:border-[#f4b820]"><option value="">Chọn Tỉnh/Thành</option>{provinceOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label className="space-y-2 text-[10px] font-bold uppercase text-gray-400">Quận / Huyện *<select required disabled={!checkout.province} value={checkout.district} onChange={(e) => setCheckout({ ...checkout, district: e.target.value, ward: '' })} className="w-full border border-white/10 bg-black px-3 py-3 text-base normal-case text-white outline-none disabled:opacity-40 focus:border-[#f4b820]"><option value="">Chọn Quận/Huyện</option>{districtOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label className="space-y-2 text-[10px] font-bold uppercase text-gray-400 sm:col-span-2">Phường / Xã *{wardOptions.length ? <select required value={checkout.ward} onChange={(e) => setCheckout({ ...checkout, ward: e.target.value })} className="w-full border border-white/10 bg-black px-3 py-3 text-base normal-case text-white outline-none focus:border-[#f4b820]"><option value="">Chọn Phường/Xã</option>{wardOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select> : <input required disabled={!checkout.district} value={checkout.ward} onChange={(e) => setCheckout({ ...checkout, ward: e.target.value })} placeholder={checkout.district ? 'Nhập Phường/Xã' : 'Chọn Quận/Huyện trước'} className="w-full border border-white/10 bg-black px-3 py-3 text-base normal-case text-white outline-none disabled:opacity-40 focus:border-[#f4b820]" />}</label><label className="space-y-2 text-[10px] font-bold uppercase text-gray-400 sm:col-span-2">Số nhà, tên đường / ấp / thôn *<input required value={checkout.streetAddress} onChange={(e) => setCheckout({ ...checkout, streetAddress: e.target.value })} placeholder="Nhập phần địa chỉ chi tiết" className="w-full border border-white/10 bg-black px-3 py-3 text-base normal-case text-white outline-none focus:border-[#f4b820]" /></label><label className="space-y-2 text-[10px] font-bold uppercase text-gray-400 sm:col-span-2">Địa chỉ sau sáp nhập (nếu có)<textarea rows={2} value={checkout.postMergerAddress} onChange={(e) => setCheckout({ ...checkout, postMergerAddress: e.target.value })} placeholder="Nhập địa chỉ hành chính mới sau sáp nhập" className="w-full resize-none border border-gold-dark/25 bg-black px-3 py-3 text-base normal-case text-white outline-none focus:border-[#f4b820]" /></label><label className="space-y-2 text-[10px] font-bold uppercase text-gray-400 sm:col-span-2">Ghi chú<textarea rows={2} value={checkout.note} onChange={(e) => setCheckout({ ...checkout, note: e.target.value })} className="w-full resize-none border border-white/10 bg-black px-3 py-3 text-base normal-case text-white outline-none focus:border-[#f4b820]" /></label></div><div className="sticky bottom-0 flex items-center justify-between border-t border-white/10 bg-[#111] p-5"><div><p className="text-[10px] uppercase text-gray-500">Tổng thanh toán</p><b className="text-lg text-[#f4b820]">{money.format(subtotal)}</b></div><button disabled={submittingOrder} className="bg-[#f4b820] px-5 py-3 text-xs font-black uppercase text-black disabled:opacity-50">{submittingOrder ? 'Đang gửi...' : 'Xác nhận đặt hàng'}</button></div></form></div>}
    </div>
  );
}
