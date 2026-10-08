import { useEffect, useState } from 'react';
import type { ShopOrder, ShopProduct, ShopVariant } from '@workspace/api-client-react';

const BASE = import.meta.env.BASE_URL;
export const money = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

export function imgUrl(url: string | undefined | null): string {
  if (!url) return `${BASE}images/placeholder.svg`;
  if (url.startsWith('/objects/')) return `${BASE}api/storage${url}`;
  if (url.startsWith('/images/')) return `${BASE}${url.slice(1)}`;
  return url;
}
export const productImage = (p: ShopProduct) => imgUrl(p.imageUrls[0]);
export const activeVariants = (p: ShopProduct): ShopVariant[] => p.variants.filter(v => v.active);
export const minPrice = (p: ShopProduct) => { const v = activeVariants(p); return v.length ? Math.min(...v.map(x => x.priceCents)) : 0; };
export const totalStock = (p: ShopProduct) => activeVariants(p).reduce((s, v) => s + v.availableStock, 0);
export const errMsg = (e: unknown) => e instanceof Error && e.message ? e.message : 'Something went wrong. Please try again.';

/* ---------- cart ---------- */
export type CartLine = { variantId: number; quantity: number };
const CART_KEY = 'everyday-store-cart-v1';
const COUPON_KEY = 'everyday-store-coupon-v1';
const subs = new Set<() => void>();
const notify = () => subs.forEach(f => f());
function readJson<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback; } catch { return fallback; }
}
const writeJson = (key: string, v: unknown) => { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* storage unavailable */ } notify(); };
const readCart = (): CartLine[] => readJson<CartLine[]>(CART_KEY, []).filter(l => l && Number.isInteger(l.variantId) && l.quantity > 0);

export function useCart() {
  const [lines, setLines] = useState<CartLine[]>(readCart);
  const [coupon, setCouponState] = useState<string>(() => readJson<string>(COUPON_KEY, ''));
  useEffect(() => {
    const f = () => { setLines(readCart()); setCouponState(readJson<string>(COUPON_KEY, '')); };
    subs.add(f); window.addEventListener('storage', f);
    return () => { subs.delete(f); window.removeEventListener('storage', f); };
  }, []);
  const save = (next: CartLine[]) => writeJson(CART_KEY, next);
  return {
    lines, coupon,
    count: lines.reduce((s, l) => s + l.quantity, 0),
    add: (variantId: number, quantity: number, max: number) => {
      const cur = readCart(); const ex = cur.find(l => l.variantId === variantId);
      const cap = Math.max(0, Math.min(99, max));
      if (ex) ex.quantity = Math.min(cap, ex.quantity + quantity); else if (cap > 0) cur.push({ variantId, quantity: Math.min(cap, quantity) });
      save(cur);
    },
    setQty: (variantId: number, quantity: number) => save(readCart().map(l => l.variantId === variantId ? { ...l, quantity } : l).filter(l => l.quantity > 0)),
    remove: (variantId: number) => save(readCart().filter(l => l.variantId !== variantId)),
    clear: () => save([]),
    setCoupon: (c: string) => writeJson(COUPON_KEY, c),
  };
}

/* ---------- pending order + remembered orders ---------- */
export type Pending = { requestKey: string; accessToken: string; orderId?: number };
const PENDING_KEY = 'everyday-store-pending-order-v1';
const ORDERS_KEY = 'everyday-store-orders-v1';
export type SavedOrder = { id: number; accessToken: string };

export const loadPending = () => readJson<Pending | null>(PENDING_KEY, null);
export const savePending = (p: Pending) => { try { localStorage.setItem(PENDING_KEY, JSON.stringify(p)); } catch { /* ignore */ } };
export const clearPending = () => { try { localStorage.removeItem(PENDING_KEY); } catch { /* ignore */ } };
export function newPending(): Pending {
  const bytes = new Uint8Array(32); crypto.getRandomValues(bytes);
  return { requestKey: crypto.randomUUID(), accessToken: Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('') };
}
export const loadOrders = () => readJson<SavedOrder[]>(ORDERS_KEY, []);
export function saveOrder(o: SavedOrder) {
  const cur = loadOrders().filter(x => x.id !== o.id); cur.unshift(o);
  try { localStorage.setItem(ORDERS_KEY, JSON.stringify(cur)); } catch { /* ignore */ }
}
export function forgetOrder(id: number) {
  try { localStorage.setItem(ORDERS_KEY, JSON.stringify(loadOrders().filter(x => x.id !== id))); } catch { /* ignore */ }
}

export const isTerminal = (o: ShopOrder) =>
  ['approved', 'declined', 'cancelled', 'expired'].includes(o.verificationState) || ['confirmed', 'cancelled', 'expired', 'fulfilled'].includes(o.status);

export const label = (s: string) => s.replace(/^simulated_/, '').replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());

export function luhnCard() {
  const d = [4, 2, 4, 2]; while (d.length < 15) d.push(Math.floor(Math.random() * 10));
  let sum = 0; d.slice().reverse().forEach((n, i) => { let x = n; if (i % 2 === 0) { x *= 2; if (x > 9) x -= 9; } sum += x; });
  d.push((10 - (sum % 10)) % 10);
  return d.join('').replace(/(\d{4})(?=\d)/g, '$1 ');
}
