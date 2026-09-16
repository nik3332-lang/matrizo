// Never pass arbitrary URL input to router.replace or open a notification URL.
export function safeDestination(value: unknown): string {
  if (typeof value !== "string") return "/account";
  if (
    [
      "/",
      "/cart",
      "/checkout",
      "/orders",
      "/account",
      "/addresses",
      "/delete-account",
    ].includes(value)
  )
    return value;
  if (/^\/orders\/[a-zA-Z0-9-]{1,80}$/.test(value)) return value;
  if (/^\/product\/[a-zA-Z0-9_-]{1,200}$/.test(value)) return value;
  return "/account";
}
export function orderDestination(value: unknown): string | null {
  return typeof value === "string" && /^[a-zA-Z0-9-]{1,80}$/.test(value)
    ? `/orders/${value}`
    : null;
}
