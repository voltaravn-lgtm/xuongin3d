import { Product } from "../../types";
import {
  LandingBlock,
  LandingBlockType,
  LandingPage,
  LandingPageLayout,
  LandingProductOverrides,
} from "../../types/landing";
import { createDefaultLandingBlock } from "./landingDefaults";

export interface LandingTemplateDefinition {
  templateId: string;
  templateVersion: number;
  name: string;
  description: string;
  blockTypes: LandingBlockType[];
  layout: LandingPageLayout;
  productRequired?: boolean;
  createOverrides?: (product: Product) => LandingProductOverrides | undefined;
}

const salesLayout: LandingPageLayout = {
  hideHeader: true,
  hideFooter: true,
  stickyMobileCta: true,
  theme: "light",
};

const dealerLayout: LandingPageLayout = {
  ...salesLayout,
  theme: "light",
};

export const LANDING_TEMPLATES: LandingTemplateDefinition[] = [
  {
    templateId: "dealer-recruitment",
    templateVersion: 1,
    name: "Tư vấn dự án doanh nghiệp",
    description: "Landing B2B tiếp nhận nhu cầu tạo mẫu, POSM, quà tặng và sản xuất in 3D theo dự án.",
    blockTypes: ["hero", "benefits", "features", "reviews", "faq", "order-form", "contact-button"],
    layout: dealerLayout,
    productRequired: false,
  },
  {
    templateId: "single-product",
    templateVersion: 1,
    name: "Sản phẩm đơn",
    description: "Bố cục bán một sản phẩm với lợi ích, thông số, giá, bảo hành và form đặt hàng.",
    blockTypes: ["hero", "benefits", "gallery", "specifications", "price", "warranty", "faq", "order-form", "contact-button"],
    layout: salesLayout,
    createOverrides: () => ({ ctaLabel: "Đặt hàng ngay" }),
  },
  {
    templateId: "promotion-product",
    templateVersion: 1,
    name: "Sản phẩm khuyến mãi",
    description: "Nhấn mạnh ưu đãi, thời gian giới hạn, quà tặng và bằng chứng khách hàng.",
    blockTypes: ["hero", "banner", "price", "countdown", "gift", "benefits", "reviews", "faq", "order-form", "contact-button"],
    layout: salesLayout,
    createOverrides: () => ({ ctaLabel: "Nhận ưu đãi ngay" }),
  },
  {
    templateId: "product-combo",
    templateVersion: 1,
    name: "Combo sản phẩm",
    description: "Bố cục bán combo; sản phẩm chính được thêm sẵn, các sản phẩm khác bổ sung ở Builder.",
    blockTypes: ["hero", "gallery", "combo", "gift", "benefits", "warranty", "faq", "order-form", "contact-button"],
    layout: salesLayout,
    createOverrides: () => ({ ctaLabel: "Chọn combo" }),
  },
  {
    templateId: "consultation-lead",
    templateVersion: 1,
    name: "Thu tư vấn",
    description: "Tập trung giải thích nhu cầu và thu thông tin khách hàng để Sale tư vấn.",
    blockTypes: ["hero", "benefits", "features", "specifications", "reviews", "faq", "order-form", "contact-button"],
    layout: salesLayout,
    createOverrides: () => ({ ctaLabel: "Đăng ký tư vấn" }),
  },
  {
    templateId: "shopee-redirect",
    templateVersion: 1,
    name: "Điều hướng sang Shopee",
    description: "Giới thiệu nhanh sản phẩm và dẫn khách sang gian hàng Shopee để hoàn tất mua hàng.",
    blockTypes: ["hero", "gallery", "benefits", "price", "reviews", "warranty", "cta", "contact-button"],
    layout: salesLayout,
    createOverrides: () => ({ ctaLabel: "Mua trên Shopee" }),
  },
  {
    templateId: "technical-product",
    templateVersion: 1,
    name: "Sản phẩm kỹ thuật nhiều thông số",
    description: "Ưu tiên tính năng, video, bảng thông số, bảo hành và tư vấn kỹ thuật.",
    blockTypes: ["hero", "gallery", "video", "features", "specifications", "benefits", "warranty", "faq", "cta", "order-form", "contact-button"],
    layout: salesLayout,
    createOverrides: () => ({ ctaLabel: "Nhận tư vấn kỹ thuật" }),
  },
];

export function getLandingTemplate(templateId: string) {
  return LANDING_TEMPLATES.find((template) => template.templateId === templateId) || null;
}

export function createBlocksFromTemplate(template: LandingTemplateDefinition, product?: Product): LandingBlock[] {
  return template.blockTypes.map((type) => {
    const block = createDefaultLandingBlock(type);
    if (template.templateId === "dealer-recruitment") {
      switch (block.type) {
        case "hero": return { ...block, layout: "overlay", eyebrow: "GIẢI PHÁP IN 3D CHO DOANH NGHIỆP", title: "Hiện thực hóa ý tưởng và dự án bằng công nghệ in 3D", description: "Tư vấn tạo mẫu nhanh, POSM, quà tặng, mô hình trình diễn và chi tiết tùy chỉnh với số lượng linh hoạt.", backgroundImage: "/images/giai-phap.webp", ctaLabel: "Gửi yêu cầu tư vấn", ctaTarget: "#dat-hang", style: { ...block.style, textColor: "#ffffff", paddingTop: 0, paddingBottom: 0 } };
        case "benefits": return { ...block, title: "Lợi ích dành cho doanh nghiệp", items: [
          { id: "dealer-benefit-margin", title: "Tạo mẫu nhanh", description: "Rút ngắn thời gian từ bản vẽ đến sản phẩm có thể kiểm tra thực tế." },
          { id: "dealer-benefit-area", title: "Số lượng linh hoạt", description: "Thực hiện từ mẫu thử đến các lô sản phẩm theo từng giai đoạn." },
          { id: "dealer-benefit-marketing", title: "Thiết kế theo nhận diện", description: "Tùy chỉnh hình dáng, màu sắc, logo và cách hoàn thiện theo thương hiệu." },
        ] };
        case "features": return { ...block, title: "Quy trình triển khai rõ ràng", items: [
          { id: "dealer-step-1", title: "1. Tiếp nhận", description: "Gửi file, bản vẽ, hình ảnh tham khảo hoặc mẫu thật." },
          { id: "dealer-step-2", title: "2. Tư vấn", description: "Xưởng In 3D đề xuất công nghệ, vật liệu và phương án hoàn thiện." },
          { id: "dealer-step-3", title: "3. Sản xuất", description: "Duyệt mẫu, sản xuất, kiểm tra và bàn giao theo tiến độ." },
        ] };
        case "reviews": return { ...block, title: "Phản hồi dự án mẫu", items: [
          { id: "dealer-review-sample-1", name: "Khách hàng doanh nghiệp · Nội dung mẫu", content: "Quy trình tiếp nhận rõ ràng và phản hồi nhanh trong giai đoạn duyệt mẫu.", rating: 5 },
          { id: "dealer-review-sample-2", name: "Đơn vị sự kiện · Nội dung mẫu", content: "Sản phẩm được tùy chỉnh theo nhận diện và bàn giao theo tiến độ thống nhất.", rating: 5 },
          { id: "dealer-review-sample-3", name: "Đội ngũ thiết kế · Nội dung mẫu", content: "Mẫu in giúp kiểm tra trực quan kích thước và hình dáng trước khi triển khai.", rating: 5 },
        ] };
        case "faq": return { ...block, title: "Câu hỏi thường gặp", items: [
          { id: "dealer-faq-capital", question: "Có nhận làm một mẫu thử không?", answer: "Có. Xưởng tiếp nhận từ một sản phẩm mẫu và tư vấn phương án phù hợp trước khi sản xuất số lượng." },
          { id: "dealer-faq-support", question: "Xưởng có hỗ trợ thiết kế file không?", answer: "Có thể hỗ trợ dựng hoặc tối ưu file tùy theo dữ liệu, hình ảnh và yêu cầu kỹ thuật của dự án." },
          { id: "dealer-faq-area", question: "Thời gian thực hiện bao lâu?", answer: "Thời gian phụ thuộc kích thước, vật liệu, số lượng và mức độ hoàn thiện; xưởng sẽ xác nhận khi báo giá." },
        ] };
        case "order-form": return { ...block, title: "Đăng ký tư vấn dự án", description: "Hoàn tất thông tin bên dưới, Xưởng In 3D sẽ liên hệ trong thời gian sớm nhất.", formType: "consultation", submitLabel: "Gửi yêu cầu tư vấn", successMessage: "Cảm ơn bạn đã quan tâm. Xưởng In 3D sẽ sớm liên hệ để trao đổi phương án.", productIds: [], requireAddress: false, showAddress: true, showNote: true, showQuantity: false, showBusinessName: true, showBusinessType: true, showEstimatedVolume: true };
        case "contact-button": return { ...block, channel: "zalo", label: "Tư vấn dự án", fixedOnMobile: true };
        default: return block;
      }
    }
    switch (block.type) {
      case "specifications": return { ...block, productId: product?.id };
      case "price": return { ...block, productId: product?.id };
      case "combo": return { ...block, products: product ? [{ productId: product.id }] : [] };
      case "gift": return { ...block, productId: product?.id };
      case "reviews": return product ? { ...block, items: [
        { id: "product-review-sample-1", name: "Khách hàng đã mua · Nội dung mẫu", content: `${product.name} có thông tin rõ ràng, đóng gói cẩn thận và đội ngũ tư vấn hỗ trợ nhanh.`, rating: 5 },
        { id: "product-review-sample-2", name: "Khách hàng sử dụng · Nội dung mẫu", content: "Sản phẩm dễ sử dụng, hoàn thiện chắc chắn và đáp ứng tốt nhu cầu công việc thực tế.", rating: 5 },
        { id: "product-review-sample-3", name: "Khách hàng Xưởng In 3D · Nội dung mẫu", content: "Tôi hài lòng với quá trình tư vấn, hoàn thiện sản phẩm và hỗ trợ sau bàn giao.", rating: 5 },
      ] } : block;
      case "faq": return product ? { ...block, items: [
        { id: "product-faq-fit", question: `${product.name} phù hợp với nhu cầu nào?`, answer: "Bạn nên cung cấp mục đích sử dụng, kích thước và môi trường làm việc để Xưởng In 3D tư vấn vật liệu phù hợp." },
        { id: "product-faq-warranty", question: "Sản phẩm được hỗ trợ như thế nào?", answer: "Điều kiện hỗ trợ được xác nhận theo vật liệu, kết cấu và yêu cầu sử dụng của từng sản phẩm." },
        { id: "product-faq-order", question: "Tôi có được tư vấn trước khi đặt hàng không?", answer: "Có. Bạn có thể gửi form hoặc liên hệ kênh hỗ trợ trên trang để được tư vấn về thông số, khả năng tương thích và nhu cầu sử dụng." },
        { id: "product-faq-delivery", question: "Thời gian giao hàng dự kiến bao lâu?", answer: "Thời gian phụ thuộc kích thước, vật liệu, số lượng và mức độ hoàn thiện. Xưởng sẽ thông báo khi xác nhận đơn." },
      ] } : block;
      case "order-form": return { ...block, productIds: product ? [product.id] : [] };
      case "contact-button": return template.templateId === "shopee-redirect"
        ? { ...block, channel: "shopee", label: "Mua trên Shopee" }
        : { ...block, channel: "zalo", label: "Chat Zalo" };
      case "cta": return template.templateId === "shopee-redirect"
        ? { ...block, title: `Mua ${product?.name || "sản phẩm"} trên Shopee`, buttonLabel: "Mua trên Shopee" }
        : { ...block, buttonLabel: product ? (template.createOverrides?.(product)?.ctaLabel || block.buttonLabel) : block.buttonLabel };
      default: return block;
    }
  });
}

export function createLandingTemplateData(template: LandingTemplateDefinition, product: Product) {
  return {
    templateId: template.templateId,
    templateVersion: template.templateVersion,
    primaryProductId: product.id,
    productOverrides: template.createOverrides?.(product),
    layout: { ...template.layout },
    blocks: createBlocksFromTemplate(template, product),
  };
}

export function createStandaloneLandingTemplateData(template: LandingTemplateDefinition) {
  return {
    templateId: template.templateId,
    templateVersion: template.templateVersion,
    layout: { ...template.layout },
    blocks: createBlocksFromTemplate(template),
  };
}

export function materializeLandingTemplateDefaults(page: LandingPage): LandingPage {
  const productName = page.productOverrides?.title || page.seo.title || page.name.replace(/^Landing\s*-\s*/i, '') || 'Sản phẩm Xưởng In 3D';
  let changed = false;
  const blocks = page.blocks.map((block): LandingBlock => {
    if (block.type === 'hero' && page.templateId === 'dealer-recruitment' && !block.image && !block.backgroundImage) {
      changed = true;
      return { ...block, layout: 'overlay', backgroundImage: '/images/giai-phap.webp', style: { ...block.style, textColor: '#ffffff', paddingTop: 0, paddingBottom: 0 } };
    }
    if (block.type === 'reviews' && !block.items.length) {
      if (page.templateId === 'dealer-recruitment') {
        changed = true;
        return { ...block, items: [
          { id: 'dealer-review-editable-1', name: 'Khách hàng doanh nghiệp · Nội dung mẫu', content: 'Quy trình tiếp nhận rõ ràng và phản hồi nhanh trong giai đoạn duyệt mẫu.', rating: 5 },
          { id: 'dealer-review-editable-2', name: 'Đơn vị sự kiện · Nội dung mẫu', content: 'Sản phẩm được tùy chỉnh theo nhận diện và bàn giao theo tiến độ thống nhất.', rating: 5 },
          { id: 'dealer-review-editable-3', name: 'Đội ngũ thiết kế · Nội dung mẫu', content: 'Mẫu in giúp kiểm tra trực quan kích thước và hình dáng trước khi triển khai.', rating: 5 },
        ] };
      }
      if (page.primaryProductId) {
        changed = true;
        return { ...block, items: [
          { id: 'product-review-editable-1', name: 'Khách hàng đã mua · Nội dung mẫu', content: `${productName} có thông tin rõ ràng, đóng gói cẩn thận và đội ngũ tư vấn hỗ trợ nhanh.`, rating: 5 },
          { id: 'product-review-editable-2', name: 'Khách hàng sử dụng · Nội dung mẫu', content: 'Sản phẩm dễ sử dụng, hoàn thiện chắc chắn và đáp ứng tốt nhu cầu công việc thực tế.', rating: 5 },
          { id: 'product-review-editable-3', name: 'Khách hàng Xưởng In 3D · Nội dung mẫu', content: 'Tôi hài lòng với quá trình tư vấn, hoàn thiện sản phẩm và hỗ trợ sau bàn giao.', rating: 5 },
        ] };
      }
    }
    if (block.type === 'faq' && !block.items.length && page.primaryProductId) {
      changed = true;
      return { ...block, items: [
        { id: 'product-faq-editable-fit', question: `${productName} phù hợp với nhu cầu nào?`, answer: 'Hãy cung cấp mục đích sử dụng, kích thước và môi trường làm việc để Xưởng In 3D tư vấn vật liệu phù hợp.' },
        { id: 'product-faq-editable-warranty', question: 'Sản phẩm được hỗ trợ như thế nào?', answer: 'Điều kiện hỗ trợ được xác nhận theo vật liệu, kết cấu và yêu cầu sử dụng của từng sản phẩm.' },
        { id: 'product-faq-editable-order', question: 'Tôi có được tư vấn trước khi đặt hàng không?', answer: 'Có. Bạn có thể gửi form hoặc liên hệ kênh hỗ trợ trên trang để được tư vấn về thông số, khả năng tương thích và nhu cầu sử dụng.' },
        { id: 'product-faq-editable-delivery', question: 'Thời gian giao hàng dự kiến bao lâu?', answer: 'Thời gian phụ thuộc kích thước, vật liệu, số lượng và mức độ hoàn thiện. Xưởng sẽ thông báo khi xác nhận đơn.' },
      ] };
    }
    return block;
  });
  return changed ? { ...page, blocks } : page;
}
