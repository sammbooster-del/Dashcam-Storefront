import { type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { Package, ShoppingBag } from 'lucide-react';
import { useGetShopCatalog } from '@workspace/api-client-react';
import { imgUrl, useCart } from '@/lib/shop';

export function Layout({ children }: { children: ReactNode }) {
  const { data } = useGetShopCatalog();
  const { count } = useCart();
  const [loc] = useLocation();
  const s = data?.settings;
  const brand = s?.brandName || 'Everyday Store';
  const accent = s?.accentColor && /^#[0-9a-fA-F]{6}$/.test(s.accentColor) ? s.accentColor : undefined;
  const cats = (data?.categories ?? []).filter(c => c.active);
  return (
    <div className="grain min-h-[100dvh] flex flex-col" style={accent ? ({ '--brand': accent } as React.CSSProperties) : undefined}>
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <Link href="/" className="flex items-center gap-2" data-testid="link-home">
            {s?.logoUrl ? <img src={imgUrl(s.logoUrl)} alt="" className="h-8 w-8 rounded-full object-cover" /> : <span className="grid h-8 w-8 place-items-center rounded-full text-sm font-bold text-white" style={{ background: 'var(--brand)' }}>{brand.charAt(0)}</span>}
            <span className="display text-xl font-semibold">{brand}</span>
          </Link>
          <nav className="ml-4 hidden gap-5 text-sm font-medium md:flex">
            {cats.map(c => <Link key={c.id} href={`/category/${c.slug}`} className={loc === `/category/${c.slug}` ? 'underline underline-offset-4' : 'text-muted-foreground hover:text-foreground'} data-testid={`link-nav-${c.slug}`}>{c.name}</Link>)}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/orders" className="btn btn-ghost btn-sm" data-testid="link-orders"><Package size={16} /><span className="hidden sm:inline">My orders</span></Link>
            <Link href="/cart" className="btn btn-sm" data-testid="link-cart"><ShoppingBag size={16} />Cart<span className="ml-1 rounded-full bg-white/20 px-1.5 text-xs" data-testid="text-cart-count">{count}</span></Link>
          </div>
        </div>
        {cats.length > 0 && <div className="flex gap-2 overflow-x-auto border-t px-4 py-2 md:hidden">{cats.map(c => <Link key={c.id} href={`/category/${c.slug}`} className="chip whitespace-nowrap">{c.name}</Link>)}</div>}
      </header>
      <main className="flex-1">{children}</main>
      <footer className="mt-16 border-t py-10 text-sm text-muted-foreground">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 sm:flex-row sm:justify-between">
          <span className="display text-base text-foreground">{brand}</span>
          {s?.supportEmail && <span>Questions: {s.supportEmail}</span>}
        </div>
      </footer>
    </div>
  );
}

export function Skeletons({ n = 8 }: { n?: number }) {
  return <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{Array.from({ length: n }, (_, i) => <div key={i} className="animate-pulse"><div className="aspect-square rounded-2xl bg-muted" /><div className="mt-3 h-4 w-2/3 rounded bg-muted" /><div className="mt-2 h-4 w-1/3 rounded bg-muted" /></div>)}</div>;
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div className="panel mx-auto max-w-md p-8 text-center" role="alert" data-testid="state-error"><h2 className="text-xl font-semibold">That did not load</h2><p className="mt-2 text-sm text-muted-foreground">{message}</p>{onRetry && <button className="btn mt-5" onClick={onRetry} data-testid="button-retry">Try again</button>}</div>;
}

export function EmptyBlock({ title, text, children }: { title: string; text: string; children?: ReactNode }) {
  return <div className="panel mx-auto max-w-md p-10 text-center" data-testid="state-empty"><div className="mx-auto mb-4 h-14 w-14 rounded-2xl border-2 border-dashed" style={{ borderColor: 'var(--brand)' }} /><h2 className="text-xl font-semibold">{title}</h2><p className="mt-2 text-sm text-muted-foreground">{text}</p><div className="mt-5">{children}</div></div>;
}
