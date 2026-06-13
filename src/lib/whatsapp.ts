export function waLink(phone: string, message?: string) {
  const clean = (phone || "").replace(/[^\d]/g, "");
  const m = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${clean}${m}`;
}
