export const ORDER_SUCCESS_EVENT = "xuongin3d:order-success";

export function announceOrderSuccess(source: "product" | "cart" | "dealer" | "landing") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ORDER_SUCCESS_EVENT, { detail: { source } }));
}
