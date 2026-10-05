import type { Product, ProductVariant } from "../types";

export const variantExcelFields = ["ID", "Tên", "Giá bán", "Giá giảm", "SKU", "Số tồn", "Ảnh", "Trạng thái kho"] as const;
export const variantExcelHeader = (index: number, field: string) => `Phân loại ${index} - ${field}`;

export function splitProductChoices(value: string): string[] {
  return Array.from(new Set(value.split(/[,|\r\n]+/).map((item) => item.trim()).filter(Boolean)));
}

export function readProductExcelOptions(
  headers: string[],
  cell: (label: string) => string,
  productId: string,
  existing?: Product,
): Pick<Product, "colors" | "orderNote" | "variants" | "defaultVariantId"> {
  const indexes = Array.from(new Set(headers.flatMap((header) => {
    const match = header.match(/^phân loại (\d+) - tên$/i);
    return match ? [Number(match[1])] : [];
  }))).sort((a, b) => a - b);
  const indexed: Array<{ index: number; variant: ProductVariant }> = [];
  for (const index of indexes) {
    const read = (field: string) => cell(variantExcelHeader(index, field));
    const name = read("Tên");
    if (!name) continue;
    const id = read("ID") || existing?.variants?.[index - 1]?.id || `${productId}-variant-${index}`;
    const previous = existing?.variants?.find((variant) => variant.id === id);
    const stockStatus = read("Trạng thái kho") || previous?.stockStatus || "";
    if (!["", "in-stock", "low-stock", "out-of-stock", "preorder"].includes(stockStatus)) {
      throw new Error(`${productId}: trạng thái kho phân loại ${index} không hợp lệ.`);
    }
    indexed.push({ index, variant: {
      ...previous,
      id, name,
      price: read("Giá bán") || previous?.price || "",
      salePrice: read("Giá giảm") || previous?.salePrice || "",
      sku: read("SKU") || previous?.sku || "",
      stockQuantity: read("Số tồn") || previous?.stockQuantity || "",
      image: read("Ảnh") || previous?.image || "",
      stockStatus: stockStatus as ProductVariant["stockStatus"],
    } });
  }
  if (new Set(indexed.map(({ variant }) => variant.id)).size !== indexed.length) {
    throw new Error(`${productId}: ID phân loại bị trùng.`);
  }
  const variants = indexed.length ? indexed.map(({ variant }) => variant) : existing?.variants || [];
  const defaultIndex = cell("Phân loại chọn sẵn");
  const requestedDefault = defaultIndex ? indexed.find(({ index }) => index === Number(defaultIndex))?.variant.id : undefined;
  if (defaultIndex && !requestedDefault) throw new Error(`${productId}: phân loại chọn sẵn phải là số thứ tự của phân loại đã điền tên.`);
  const colors = cell("Màu sắc");
  return {
    colors: colors === "-" ? [] : colors ? splitProductChoices(colors) : existing?.colors || [],
    orderNote: cell("Ghi chú đặt hàng") === "-" ? "" : cell("Ghi chú đặt hàng") || existing?.orderNote || "",
    variants,
    defaultVariantId: requestedDefault || (variants.some((v) => v.id === existing?.defaultVariantId) ? existing?.defaultVariantId : variants[0]?.id || ""),
  };
}
