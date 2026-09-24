import { type FormEvent, type ReactNode, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  ArrowRight,
  Check,
  ChevronLeft,
  CreditCard,
  Gauge,
  LockKeyhole,
  Menu,
  Minus,
  PackageCheck,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { Link, Route, Switch, Router as WouterRouter, useLocation } from 'wouter';

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

const PRODUCT = {
  id: 'roadview-4k-dual',
  name: 'RoadView 4K Dual Dash Cam',
  price: 329,
  eyebrow: 'Sample listing · replace with your actual SKU',
};

const queryClient = new QueryClient();

function ProductVisual({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`product-stage relative flex items-center justify-center overflow-hidden ${compact ? 'h-48 rounded-[1.35rem]' : 'h-[330px] rounded-[1.8rem] sm:h-[440px]'}`}
      data-testid={compact ? 'img-product-thumbnail' : 'img-product-hero'}
      aria-label="Illustration of the RoadView 4K Dual Dash Cam"
    >
      <div className="absolute left-5 top-5 font-mono-brand text-[10px] uppercase tracking-[0.24em] text-amber-300/70">
        RV / 04K
      </div>
      <div className="absolute bottom-5 right-5 flex items-center gap-2 font-mono-brand text-[10px] uppercase tracking-[0.16em] text-slate-300/65">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-300" /> live record
      </div>
      <div className="product-sheen absolute -left-1/2 top-0 h-full w-1/2 opacity-40" />
      <div className={`relative ${compact ? 'scale-[.68]' : 'scale-100'}`}>
        <div className="absolute -bottom-10 left-1/2 h-7 w-64 -translate-x-1/2 rounded-[50%] bg-slate-950/60 blur-xl" />
        <div className="dashcam-body relative h-[168px] w-[270px] rounded-[28px] border border-slate-400/25">
          <div className="absolute -left-5 top-[46px] h-16 w-7 rounded-l-xl border border-slate-500/30 bg-slate-800" />
          <div className="absolute -right-5 top-[46px] h-16 w-7 rounded-r-xl border border-slate-500/30 bg-slate-800" />
          <div className="absolute left-6 top-5 h-3 w-12 rounded-full bg-slate-200/20" />
          <div className="absolute right-6 top-5 flex gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-300" />
            <span className="h-2 w-2 rounded-full bg-slate-400/60" />
          </div>
          <div className="absolute left-1/2 top-[42px] h-[76px] w-[116px] -translate-x-1/2 rounded-[19px] border-8 border-slate-700 bg-slate-950 shadow-inner">
            <div className="absolute inset-2 rounded-[10px] border border-cyan-200/20 bg-[radial-gradient(circle_at_35%_28%,#637f8a,#18222c_58%)]">
              <div className="absolute bottom-2 left-2 right-2 h-px bg-amber-300/60" />
            </div>
          </div>
          <div className="absolute bottom-5 left-7 right-7 flex items-center justify-between">
            <span className="font-mono-brand text-[9px] tracking-[0.2em] text-slate-300/55">DRIVEGUARD</span>
            <span className="h-1.5 w-7 rounded bg-amber-300/75" />
          </div>
        </div>
        <div className="absolute -bottom-12 left-1/2 h-16 w-20 -translate-x-1/2 rounded-b-2xl border-x border-b border-slate-400/20 bg-slate-800/80" />
      </div>
    </div>
  );
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-3" data-testid="link-home-logo">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-300 text-slate-950">
        <ShieldCheck size={20} strokeWidth={2.7} />
      </span>
      <span className="font-display text-[25px] font-bold uppercase leading-none tracking-tight text-slate-100">
        Drive<span className="text-amber-300">Guard</span>
      </span>
    </Link>
  );
}

function Header({ cartCount }: { cartCount: number }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-slate-700/80 bg-slate-950/95 text-slate-100 backdrop-blur-md">
      <div className="mx-auto flex h-[74px] max-w-7xl items-center justify-between gap-5 px-5 lg:px-8">
        <Logo />
        <nav className="hidden items-center gap-7 text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-300 lg:flex">
          <Link href="/#collections" className="transition-colors hover:text-amber-300" data-testid="link-collection-cameras">Cameras</Link>
          <Link href="/#why-driveguard" className="transition-colors hover:text-amber-300" data-testid="link-why-driveguard">Why DriveGuard</Link>
          <Link href="/#field-notes" className="transition-colors hover:text-amber-300" data-testid="link-field-notes">Field notes</Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-2 text-slate-400 sm:flex">
            <Search size={16} />
            <input aria-label="Search products" placeholder="Search gear" className="w-28 bg-transparent text-xs text-slate-200 outline-none placeholder:text-slate-500" data-testid="input-search-products" />
          </div>
          <Link href="/checkout" className="relative grid h-10 w-10 place-items-center rounded-full border border-slate-700 transition-colors hover:border-amber-300 hover:text-amber-300" data-testid="link-cart">
            <ShoppingBag size={18} />
            {cartCount > 0 && <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-amber-300 px-1 font-mono-brand text-[10px] font-bold text-slate-950" data-testid="text-cart-count">{cartCount}</span>}
          </Link>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="grid h-10 w-10 place-items-center rounded-full border border-slate-700 lg:hidden" data-testid="button-mobile-menu" aria-label="Open menu">
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>
      {mobileOpen && (
        <nav className="border-t border-slate-800 bg-slate-950 px-5 py-4 lg:hidden">
          <div className="flex flex-col gap-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
            <Link href="/#collections" onClick={() => setMobileOpen(false)} data-testid="link-mobile-cameras">Cameras</Link>
            <Link href="/#why-driveguard" onClick={() => setMobileOpen(false)} data-testid="link-mobile-why">Why DriveGuard</Link>
            <Link href="/#field-notes" onClick={() => setMobileOpen(false)} data-testid="link-mobile-notes">Field notes</Link>
          </div>
        </nav>
      )}
    </header>
  );
}

function ButtonLink({ href, children, testId, dark = false }: { href: string; children: ReactNode; testId: string; dark?: boolean }) {
  return (
    <Link href={href} className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold transition-transform hover:-translate-y-0.5 ${dark ? 'bg-slate-950 text-slate-100 hover:bg-slate-800' : 'bg-amber-300 text-slate-950 hover:bg-amber-200'}`} data-testid={testId}>
      {children}
    </Link>
  );
}

function HomePage() {
  return (
    <main>
      <section className="overflow-hidden bg-slate-950 text-slate-100">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-14 sm:pt-20 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:pb-24 lg:pt-24">
          <div className="fade-up">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-2 font-mono-brand text-[10px] uppercase tracking-[0.17em] text-amber-300">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-300" /> evidence, not anxiety
            </div>
            <h1 className="max-w-2xl font-display text-6xl font-bold uppercase leading-[.86] tracking-[-0.035em] sm:text-8xl">
              Know what<br /><span className="text-amber-300">happened.</span>
            </h1>
            <p className="mt-7 max-w-lg text-base leading-7 text-slate-300 sm:text-lg">
              DriveGuard builds the calmest part of your drive: a clear record when the road gets complicated. Specialist cameras, considered accessories, zero guesswork.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <ButtonLink href="/product/roadview-4k-dual" testId="button-shop-roadview">Shop RoadView <ArrowRight size={17} /></ButtonLink>
              <ButtonLink href="/#why-driveguard" dark testId="button-explore-driveguard">Why DriveGuard</ButtonLink>
            </div>
            <div className="mt-12 flex flex-wrap gap-x-8 gap-y-3 border-t border-slate-800 pt-5 font-mono-brand text-[10px] uppercase tracking-[0.16em] text-slate-400">
              <span className="flex items-center gap-2"><Check size={14} className="text-amber-300" /> 30-day road test</span>
              <span className="flex items-center gap-2"><Check size={14} className="text-amber-300" /> two-year cover</span>
            </div>
          </div>
          <div className="fade-up-2 relative">
            <div className="absolute -right-12 -top-10 h-56 w-56 rounded-full bg-amber-300/10 blur-3xl" />
            <div className="relative rounded-[2rem] border border-slate-700 bg-slate-900 p-3 shadow-2xl">
              <ProductVisual />
              <div className="grid grid-cols-3 gap-2 px-3 pb-2 pt-4 text-center">
                <div><p className="font-display text-2xl font-bold text-slate-100">4K</p><p className="font-mono-brand text-[9px] uppercase tracking-wider text-slate-500">front clarity</p></div>
                <div><p className="font-display text-2xl font-bold text-slate-100">144°</p><p className="font-mono-brand text-[9px] uppercase tracking-wider text-slate-500">wide view</p></div>
                <div><p className="font-display text-2xl font-bold text-slate-100">2CH</p><p className="font-mono-brand text-[9px] uppercase tracking-wider text-slate-500">front + rear</p></div>
              </div>
            </div>
            <div className="absolute -bottom-5 -left-5 rounded-2xl border border-amber-300/30 bg-amber-300 px-4 py-3 text-slate-950 shadow-xl">
              <p className="font-mono-brand text-[9px] uppercase tracking-wider">Field tested</p>
              <p className="font-display text-2xl font-bold uppercase">Road ready</p>
            </div>
          </div>
        </div>
      </section>

      <section id="collections" className="border-b border-amber-900/10 bg-amber-300 px-5 py-5 text-slate-950">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 lg:px-8">
          <p className="font-display text-xl font-bold uppercase">Built for the moments you don’t plan for.</p>
          <div className="flex items-center gap-4 font-mono-brand text-[10px] uppercase tracking-[0.16em]">
            <a href="#shop" className="border-b border-slate-950 pb-1" data-testid="link-collection-front-cameras">Front cameras</a>
            <a href="#shop" className="border-b border-slate-950 pb-1" data-testid="link-collection-dual-cameras">Dual channel</a>
          </div>
        </div>
      </section>

      <section id="shop" className="bg-[#f4f0e7] px-5 py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono-brand text-[10px] uppercase tracking-[0.2em] text-teal-700">The current kit</p>
              <h2 className="mt-2 font-display text-5xl font-bold uppercase leading-none text-slate-950 sm:text-6xl">One camera.<br />No loose ends.</h2>
            </div>
            <p className="max-w-xs text-sm leading-6 text-slate-600">A focused collection, tuned for everyday drivers who would rather be prepared than persuasive.</p>
          </div>
          <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
            <article className="group grid overflow-hidden rounded-[1.6rem] border border-stone-300 bg-[#e8e3d7] md:grid-cols-[.9fr_1.1fr]" data-testid="card-product-roadview-4k-dual">
              <div className="p-5 sm:p-7">
                <span className="font-mono-brand text-[10px] uppercase tracking-[0.18em] text-teal-700">01 / dual channel</span>
                <h3 className="mt-20 max-w-xs font-display text-4xl font-bold uppercase leading-[.9] text-slate-950 sm:mt-32 sm:text-5xl">RoadView 4K Dual</h3>
                <p className="mt-4 text-sm leading-6 text-slate-600">The complete front-and-rear record for city miles, long hauls, and everything between.</p>
                <div className="mt-7 flex items-center justify-between">
                  <span className="font-mono-brand text-sm text-slate-950">$329.00</span>
                  <ButtonLink href="/product/roadview-4k-dual" testId="button-view-roadview">View camera <ArrowRight size={16} /></ButtonLink>
                </div>
              </div>
              <div className="p-3"><ProductVisual compact /></div>
            </article>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
              <div className="flex min-h-[180px] flex-col justify-between rounded-[1.6rem] bg-slate-950 p-6 text-slate-100">
                <Zap className="text-amber-300" size={23} />
                <div><p className="font-display text-3xl font-bold uppercase">Fast install.</p><p className="mt-1 text-sm text-slate-400">A clean setup that disappears behind your mirror.</p></div>
              </div>
              <div className="flex min-h-[180px] flex-col justify-between rounded-[1.6rem] border border-stone-300 bg-white/50 p-6">
                <Gauge className="text-teal-700" size={23} />
                <div><p className="font-display text-3xl font-bold uppercase text-slate-950">Clear by design.</p><p className="mt-1 text-sm text-slate-600">Every detail chosen for readable evidence, day or night.</p></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="why-driveguard" className="bg-teal-800 px-5 py-20 text-[#eef0e7] lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.85fr_1.15fr] lg:items-end">
          <div>
            <p className="font-mono-brand text-[10px] uppercase tracking-[0.2em] text-amber-300">Why DriveGuard</p>
            <h2 className="mt-3 font-display text-6xl font-bold uppercase leading-[.87] sm:text-7xl">Less<br />uncertainty.</h2>
            <p className="mt-7 max-w-sm text-sm leading-6 text-teal-100/75">We don't sell gadgets. We select the small pieces of hardware that make a stressful moment easier to explain.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ['01', 'Selected, not stacked', 'A short shelf means every item earns its place.'],
              ['02', 'Evidence first', 'Specs are useful only when they hold up in the real world.'],
              ['03', 'Human support', 'Straight answers from people who actually use the gear.'],
            ].map(([number, title, body]) => (
              <div className="border-t border-teal-300/30 pt-4" key={number} data-testid={`card-principle-${number}`}>
                <span className="font-mono-brand text-[10px] text-amber-300">{number}</span>
                <h3 className="mt-10 font-display text-2xl font-bold uppercase leading-none">{title}</h3>
                <p className="mt-3 text-sm leading-5 text-teal-100/65">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="field-notes" className="bg-[#f4f0e7] px-5 py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-end justify-between border-b border-stone-300 pb-5">
            <div><p className="font-mono-brand text-[10px] uppercase tracking-[0.2em] text-teal-700">Field notes / 001</p><h2 className="mt-2 font-display text-5xl font-bold uppercase text-slate-950">On the road</h2></div>
            <span className="hidden font-mono-brand text-[10px] uppercase tracking-wider text-slate-500 sm:block">DriveGuard dispatch</span>
          </div>
          <div className="grid gap-8 py-8 md:grid-cols-[1fr_1.5fr] md:items-center">
            <div className="bg-grid relative h-56 overflow-hidden rounded-[1.5rem] bg-amber-300 p-5">
              <div className="absolute bottom-[-30px] left-[18%] h-48 w-48 rounded-full border-[24px] border-slate-950/85" />
              <div className="absolute bottom-[-20px] right-[11%] h-32 w-32 rounded-full border-[18px] border-teal-800/80" />
              <p className="relative z-10 max-w-[150px] font-display text-3xl font-bold uppercase leading-[.9] text-slate-950">A clear record changes the conversation.</p>
            </div>
            <div>
              <p className="font-display text-3xl font-bold uppercase leading-tight text-slate-950 sm:text-4xl">“The best dash cam is the one you forget is there—until you need the footage.”</p>
              <p className="mt-5 font-mono-brand text-[10px] uppercase tracking-[0.15em] text-slate-500">— Elise, DriveGuard product lead</p>
              <ButtonLink href="/product/roadview-4k-dual" testId="button-read-roadview" dark>Meet RoadView <ArrowRight size={16} /></ButtonLink>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}

function ProductPage({ onAdd }: { onAdd: (quantity: number) => void }) {
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const addToCart = () => { onAdd(quantity); setAdded(true); window.setTimeout(() => setAdded(false), 2200); };
  return (
    <main className="bg-[#f4f0e7]">
      <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
        <Link href="/" className="inline-flex items-center gap-2 font-mono-brand text-[10px] uppercase tracking-[0.17em] text-slate-500 hover:text-teal-700" data-testid="link-back-store"><ChevronLeft size={14} /> Back to store</Link>
        <div className="mt-8 grid gap-9 lg:grid-cols-[1.05fr_.95fr] lg:gap-16">
          <div className="fade-up"><ProductVisual /><div className="mt-3 grid grid-cols-3 gap-3"><div className="rounded-xl border-2 border-teal-700 bg-slate-950 p-2"><ProductVisual compact /></div><div className="grid place-items-center rounded-xl border border-stone-300 bg-stone-200 p-2 font-mono-brand text-[9px] uppercase text-slate-500">rear view<br />camera</div><div className="grid place-items-center rounded-xl border border-stone-300 bg-stone-200 p-2 font-mono-brand text-[9px] uppercase text-slate-500">in the<br />box</div></div></div>
          <div className="fade-up-2 flex flex-col justify-center">
            <p className="font-mono-brand text-[10px] uppercase tracking-[0.2em] text-teal-700">{PRODUCT.eyebrow}</p>
            <h1 className="mt-4 max-w-xl font-display text-6xl font-bold uppercase leading-[.86] tracking-tight text-slate-950 sm:text-8xl">RoadView<br /><span className="text-teal-800">4K Dual</span></h1>
            <div className="mt-6 flex items-center gap-4"><span className="font-mono-brand text-lg text-slate-950">$329.00</span><span className="rounded-full bg-amber-300 px-3 py-1 font-mono-brand text-[9px] uppercase tracking-wider text-slate-950">in stock</span></div>
            <p className="mt-7 max-w-lg text-base leading-7 text-slate-600">A front-and-rear dash cam for drivers who want the whole picture. 4K front detail, reliable rear coverage, and a setup that gets out of your way.</p>
            <div className="mt-7 grid gap-3 border-y border-stone-300 py-5 sm:grid-cols-3">
              <div><p className="font-display text-2xl font-bold text-slate-950">4K</p><p className="font-mono-brand text-[9px] uppercase tracking-wider text-slate-500">front camera</p></div>
              <div><p className="font-display text-2xl font-bold text-slate-950">1080p</p><p className="font-mono-brand text-[9px] uppercase tracking-wider text-slate-500">rear camera</p></div>
              <div><p className="font-display text-2xl font-bold text-slate-950">30fps</p><p className="font-mono-brand text-[9px] uppercase tracking-wider text-slate-500">steady capture</p></div>
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <div className="flex h-12 items-center rounded-full border border-stone-300 bg-white/60"><button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="grid h-12 w-11 place-items-center text-slate-600" data-testid="button-decrease-product-quantity" aria-label="Decrease quantity"><Minus size={15} /></button><span className="w-7 text-center font-mono-brand text-sm" data-testid="text-product-quantity">{quantity}</span><button onClick={() => setQuantity(quantity + 1)} className="grid h-12 w-11 place-items-center text-slate-600" data-testid="button-increase-product-quantity" aria-label="Increase quantity"><Plus size={15} /></button></div>
              <button onClick={addToCart} className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-slate-950 px-6 text-sm font-bold text-slate-100 transition-transform hover:-translate-y-0.5 hover:bg-teal-800 sm:flex-none" data-testid="button-add-to-cart">{added ? <><Check size={17} /> Added to cart</> : <>Add to cart <ShoppingBag size={17} /></>}</button>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-slate-500"><PackageCheck size={15} className="text-teal-700" /> Free shipping over $100 · Ships in 1–2 business days</div>
          </div>
        </div>
      </div>
      <section className="mt-12 bg-slate-950 px-5 py-16 text-slate-100 lg:px-8"><div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.7fr_1.3fr]"><div><p className="font-mono-brand text-[10px] uppercase tracking-[0.2em] text-amber-300">Details that matter</p><h2 className="mt-3 font-display text-5xl font-bold uppercase leading-[.88]">The calm<br />is built in.</h2></div><div className="grid gap-3 sm:grid-cols-2">{[['Night capture', 'HDR tuning keeps signs, plates, and lane lines readable after sundown.'], ['Parking watch', 'Impact detection wakes the camera when your car is resting.'], ['Loop recording', 'Old clips make room automatically. The important moments stay locked.'], ['Simple controls', 'One tactile button. Clear voice prompts. No menu maze at the curb.']].map(([title, body], index) => <div className="border-t border-slate-700 pt-4" key={title} data-testid={`feature-${index}`}><h3 className="font-display text-2xl font-bold uppercase text-amber-300">{title}</h3><p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">{body}</p></div>)}</div></div></section>
    </main>
  );
}

function CartSummary({ cart, updateQuantity, removeItem }: { cart: CartItem[]; updateQuantity: (id: string, amount: number) => void; removeItem: (id: string) => void }) {
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal > 100 || subtotal === 0 ? 0 : 12;
  return (
    <div className="rounded-[1.5rem] border border-stone-300 bg-white/50 p-5 sm:p-7">
      <div className="flex items-center justify-between border-b border-stone-300 pb-4"><h2 className="font-display text-3xl font-bold uppercase text-slate-950">Your kit</h2><span className="font-mono-brand text-[10px] uppercase tracking-wider text-slate-500" data-testid="text-cart-item-count">{cart.reduce((sum, item) => sum + item.quantity, 0)} item(s)</span></div>
      {cart.length === 0 ? <div className="py-12 text-center"><ShoppingBag className="mx-auto text-slate-400" size={28} /><p className="mt-4 font-display text-2xl font-bold uppercase text-slate-950">Your kit is empty.</p><p className="mt-2 text-sm text-slate-500">Start with a clearer view of the road.</p><Link href="/product/roadview-4k-dual" className="mt-5 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white" data-testid="link-empty-cart-shop">Shop RoadView</Link></div> : <div className="divide-y divide-stone-200">{cart.map(item => <div className="flex gap-4 py-5" key={item.id} data-testid={`row-cart-item-${item.id}`}><div className="w-28 shrink-0"><ProductVisual compact /></div><div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><div><p className="font-display text-xl font-bold uppercase leading-none text-slate-950">{item.name}</p><p className="mt-1 font-mono-brand text-[10px] text-slate-500">$329.00 / unit</p></div><button onClick={() => removeItem(item.id)} className="text-slate-400 hover:text-red-700" data-testid={`button-remove-cart-item-${item.id}`} aria-label={`Remove ${item.name}`}><Trash2 size={16} /></button></div><div className="mt-4 flex items-center justify-between"><div className="flex h-9 items-center rounded-full border border-stone-300"><button onClick={() => updateQuantity(item.id, -1)} className="grid h-9 w-8 place-items-center" data-testid={`button-decrease-cart-item-${item.id}`} aria-label="Decrease quantity"><Minus size={13} /></button><span className="w-7 text-center font-mono-brand text-xs" data-testid={`text-cart-item-quantity-${item.id}`}>{item.quantity}</span><button onClick={() => updateQuantity(item.id, 1)} className="grid h-9 w-8 place-items-center" data-testid={`button-increase-cart-item-${item.id}`} aria-label="Increase quantity"><Plus size={13} /></button></div><span className="font-mono-brand text-sm text-slate-950" data-testid={`text-cart-item-total-${item.id}`}>${(item.price * item.quantity).toFixed(2)}</span></div></div></div>)}</div>}
      <div className="mt-5 space-y-3 border-t border-stone-300 pt-5 text-sm"><div className="flex justify-between text-slate-600"><span>Subtotal</span><span className="font-mono-brand text-slate-950" data-testid="text-cart-subtotal">${subtotal.toFixed(2)}</span></div><div className="flex justify-between text-slate-600"><span>Shipping</span><span className="font-mono-brand text-slate-950" data-testid="text-cart-shipping">{shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`}</span></div><div className="flex justify-between pt-2 text-base font-bold text-slate-950"><span>Total</span><span className="font-mono-brand" data-testid="text-cart-total">${(subtotal + shipping).toFixed(2)}</span></div></div>
    </div>
  );
}

function CheckoutPage({ cart, updateQuantity, removeItem, clearCart }: { cart: CartItem[]; updateQuantity: (id: string, amount: number) => void; removeItem: (id: string) => void; clearCart: () => void }) {
  const [card, setCard] = useState({ name: '', number: '', expiry: '', cvc: '' });
  const [submitted, setSubmitted] = useState(false);
  const setField = (field: keyof typeof card, value: string) => setCard(previous => ({ ...previous, [field]: value }));
  const useDemoCard = () => setCard({ name: 'Demo Driver', number: '4242 4242 4242 4242', expiry: '12/30', cvc: '123' });
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!card.name || !card.number || !card.expiry || !card.cvc) return; setSubmitted(true); setCard({ name: '', number: '', expiry: '', cvc: '' }); clearCart(); };
  if (submitted) return <main className="grid min-h-[72vh] place-items-center bg-[#f4f0e7] px-5 py-20"><div className="w-full max-w-lg rounded-[1.8rem] border border-stone-300 bg-white/65 p-8 text-center sm:p-12"><div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-amber-300 text-slate-950"><Check size={30} /></div><p className="mt-7 font-mono-brand text-[10px] uppercase tracking-[0.2em] text-teal-700">Demo order confirmed</p><h1 className="mt-3 font-display text-6xl font-bold uppercase leading-[.85] text-slate-950">You’re<br />road ready.</h1><p className="mx-auto mt-5 max-w-sm text-sm leading-6 text-slate-600">This was a simulated checkout. No payment was processed and no card details were saved.</p><Link href="/" className="mt-8 inline-flex items-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white" data-testid="link-success-store">Return to store <ArrowRight size={16} /></Link></div></main>;
  return (
    <main className="bg-[#f4f0e7] px-5 py-10 lg:px-8 lg:py-16">
      <div className="mx-auto max-w-7xl"><div className="mb-8 flex items-end justify-between"><div><p className="font-mono-brand text-[10px] uppercase tracking-[0.2em] text-teal-700">Secure demo checkout</p><h1 className="mt-2 font-display text-6xl font-bold uppercase leading-[.85] text-slate-950">Check out.</h1></div><Link href="/" className="hidden items-center gap-2 font-mono-brand text-[10px] uppercase tracking-wider text-slate-500 hover:text-teal-700 sm:flex" data-testid="link-continue-shopping"><ChevronLeft size={14} /> Continue shopping</Link></div>
        <div className="grid gap-7 lg:grid-cols-[1.05fr_.95fr]"><CartSummary cart={cart} updateQuantity={updateQuantity} removeItem={removeItem} /><div className="rounded-[1.5rem] bg-slate-950 p-5 text-slate-100 sm:p-7"><div className="flex items-center gap-3 border-b border-slate-700 pb-5"><CreditCard className="text-amber-300" size={21} /><h2 className="font-display text-3xl font-bold uppercase">Card details</h2></div><div className="mt-5 rounded-xl border border-amber-300/45 bg-amber-300/10 p-4 text-sm leading-5 text-amber-100" data-testid="notice-demo-payment"><strong className="text-amber-300">Demo only.</strong> Do not enter real card details. Use the demo card button to fill safe test values; nothing is sent or saved.</div><button onClick={useDemoCard} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-amber-300/60 px-4 py-3 text-sm font-bold text-amber-300 transition-colors hover:bg-amber-300 hover:text-slate-950" data-testid="button-use-demo-card"><Zap size={16} /> Use demo card</button><form onSubmit={submit} className="mt-6 space-y-4"><label className="block text-xs font-semibold text-slate-300">Name on card<input required value={card.name} onChange={e => setField('name', e.target.value)} className="mt-2 h-11 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm outline-none focus:border-amber-300" data-testid="input-card-name" /></label><label className="block text-xs font-semibold text-slate-300">Card number<input required inputMode="numeric" value={card.number} onChange={e => setField('number', e.target.value)} className="mt-2 h-11 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 font-mono-brand text-sm outline-none focus:border-amber-300" data-testid="input-card-number" /></label><div className="grid grid-cols-2 gap-3"><label className="block text-xs font-semibold text-slate-300">Expiry<input required value={card.expiry} onChange={e => setField('expiry', e.target.value)} placeholder="MM/YY" className="mt-2 h-11 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 font-mono-brand text-sm outline-none focus:border-amber-300" data-testid="input-card-expiry" /></label><label className="block text-xs font-semibold text-slate-300">CVC<input required inputMode="numeric" value={card.cvc} onChange={e => setField('cvc', e.target.value)} className="mt-2 h-11 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 font-mono-brand text-sm outline-none focus:border-amber-300" data-testid="input-card-cvc" /></label></div><button type="submit" disabled={cart.length === 0} className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-amber-300 text-sm font-bold text-slate-950 transition-colors hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-40" data-testid="button-submit-checkout">Simulate secure payment <LockKeyhole size={16} /></button><p className="flex items-center justify-center gap-2 pt-2 text-center font-mono-brand text-[9px] uppercase tracking-wider text-slate-500"><LockKeyhole size={12} /> No network calls · demo only</p></form></div></div>
      </div>
    </main>
  );
}

function Footer() {
  return <footer className="bg-slate-950 px-5 py-10 text-slate-400 lg:px-8"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-7 border-t border-slate-800 pt-7 sm:flex-row sm:items-end"><div><Logo /><p className="mt-4 max-w-xs text-xs leading-5 text-slate-500">Practical gear for clearer miles and calmer conversations.</p></div><div className="font-mono-brand text-[9px] uppercase tracking-[0.17em] text-slate-500"><p>DriveGuard / Sample storefront</p><p className="mt-2">© 2025 · Evidence for the road ahead</p></div></div></footer>;
}

function StoreShell({ children, cart }: { children: ReactNode; cart: CartItem[] }) {
  return <div className="min-h-[100dvh] bg-[#f4f0e7]"><Header cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)} />{children}</div>;
}

function Router({ cart, onAdd, updateQuantity, removeItem, clearCart }: { cart: CartItem[]; onAdd: (quantity: number) => void; updateQuantity: (id: string, amount: number) => void; removeItem: (id: string) => void; clearCart: () => void }) {
  const [location] = useLocation();
  return <StoreShell cart={cart}><ErrorBoundary resetKey={location}><Switch><Route path="/" component={HomePage} /><Route path="/product/roadview-4k-dual"><ProductPage onAdd={onAdd} /></Route><Route path="/checkout"><CheckoutPage cart={cart} updateQuantity={updateQuantity} removeItem={removeItem} clearCart={clearCart} /></Route><Route component={NotFound} /></Switch></ErrorBoundary></StoreShell>;
}

function App() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const addToCart = (quantity: number) => setCart(items => {
    const found = items.find(item => item.id === PRODUCT.id);
    return found ? items.map(item => item.id === PRODUCT.id ? { ...item, quantity: item.quantity + quantity } : item) : [{ ...PRODUCT, quantity }];
  });
  const updateQuantity = (id: string, amount: number) => setCart(items => items.flatMap(item => item.id === id ? (item.quantity + amount > 0 ? [{ ...item, quantity: item.quantity + amount }] : []) : [item]));
  const removeItem = (id: string) => setCart(items => items.filter(item => item.id !== id));
  const clearCart = () => setCart([]);
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router cart={cart} onAdd={addToCart} updateQuantity={updateQuantity} removeItem={removeItem} clearCart={clearCart} /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;