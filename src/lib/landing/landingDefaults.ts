import type { LandingBlock, LandingBlockType, LandingPage } from '../../types/landing';
import { DEFAULT_LANDING_TEMPLATE_ID, DEFAULT_LANDING_TEMPLATE_VERSION } from './landingSchema';

export function createLandingEntityId(prefix: string) {
  const randomPart = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${randomPart}`;
}

export function createDefaultLandingBlock(type: LandingBlockType): LandingBlock {
  const base = { id: createLandingEntityId('block'), type, hidden: false, desktopVisible: true, mobileVisible: true, style: { alignment: 'left' as const, paddingTop: 48, paddingBottom: 48 } };
  switch (type) {
    case 'hero': return { ...base, type, layout: 'right-image', title: 'Tên sản phẩm nổi bật', description: 'Mô tả ngắn giúp khách hàng hiểu ngay giá trị sản phẩm.', ctaLabel: 'Đặt hàng ngay', ctaTarget: '#dat-hang' };
    case 'banner': return { ...base, type, image: '', mobileImage: '', alt: 'Banner quảng cáo' };
    case 'gallery': return { ...base, type, title: 'Hình ảnh sản phẩm', layout: 'grid', images: [] };
    case 'video': return { ...base, type, title: 'Video sản phẩm', url: '', autoplay: false };
    case 'benefits': return { ...base, type, title: 'Lợi ích nổi bật', items: [] };
    case 'features': return { ...base, type, title: 'Tính năng', items: [] };
    case 'specifications': return { ...base, type, title: 'Thông số kỹ thuật', useProductSpecs: true, customRows: [] };
    case 'price': return { ...base, type, title: 'Ưu đãi hôm nay', useProductPrice: true, ctaLabel: 'Đặt hàng ngay' };
    case 'combo': return { ...base, type, title: 'Combo tiết kiệm', products: [], gifts: [], ctaLabel: 'Chọn combo' };
    case 'gift': return { ...base, type, title: 'Quà tặng kèm', description: '', items: [] };
    case 'countdown': return { ...base, type, title: 'Ưu đãi sắp kết thúc', timezone: 'Asia/Ho_Chi_Minh', hideWhenExpired: false, expiredMessage: 'Chương trình đã kết thúc' };
    case 'reviews': return { ...base, type, title: 'Khách hàng đánh giá', items: [] };
    case 'faq': return { ...base, type, title: 'Câu hỏi thường gặp', items: [] };
    case 'warranty': return { ...base, type, title: 'Bảo hành chính hãng', description: '', items: [] };
    case 'cta': return { ...base, type, title: 'Sẵn sàng sở hữu sản phẩm?', buttonLabel: 'Đặt hàng ngay', buttonTarget: '#dat-hang' };
    case 'order-form': return { ...base, type, title: 'Thông tin đặt hàng', formType: 'order', submitLabel: 'Xác nhận đặt hàng', successMessage: 'Cảm ơn bạn. Xưởng In 3D sẽ liên hệ xác nhận sớm nhất.', requireAddress: true, allowNote: true, showName: true, showAddress: true, showNote: true, showQuantity: true };
    case 'contact-button': return { ...base, type, channel: 'call', label: 'Gọi ngay', href: '', fixedOnMobile: false };
    case 'spacer': return { ...base, type, desktopHeight: 48, mobileHeight: 24 };
  }
}

export function createDefaultLandingPage(now = new Date().toISOString()): Omit<LandingPage, 'id'> {
  return { slug: '', slugHistory: [], name: 'Landing Page mới', status: 'draft', templateId: DEFAULT_LANDING_TEMPLATE_ID, templateVersion: DEFAULT_LANDING_TEMPLATE_VERSION, seo: {}, layout: { hideHeader: true, hideFooter: true, stickyMobileCta: true, theme: 'dark' }, tracking: {}, blocks: [], createdAt: now, updatedAt: now };
}
