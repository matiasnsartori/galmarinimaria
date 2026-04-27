export function buildWhatsappUrl(phone: string, message: string): string {
  const clean = phone.replace(/^\+/, '');
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}
