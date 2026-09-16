import type { OrderStatus } from "@matrizo/shared";
export const statusLabels: Record<OrderStatus, string> = {
  placed: "Order placed",
  confirmed: "Confirmed",
  picked: "Packed",
  dispatched: "On the way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};
export function dateLabel(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
