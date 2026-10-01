import { type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getGetStorefrontQueryKey, useGetStorefront, type Product, type StoreSettings } from '@workspace/api-client-react';
import { DemoCardCheckout } from '@/components/DemoCardCheckout';
import { AcceptedCards } from '@/components/AcceptedCards';
import { AdminAccess, SignInPage, SignUpPage, StoreClerkProvider } from '@/admin/Auth';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { ArrowRight, Check, ChevronDown, ChevronLeft, ChevronRight, CreditCard, Headphones, LockKeyhole, Menu, Minus, Package, Plus, Search, ShieldCheck, ShoppingBag, Trash2, Truck, Video, X } from 'lucide-react';
import { Link, Route, Router as WouterRouter, Switch, useLocation } from 'wouter';

type CartLine = { productId: number; quantity: number };
type Collection = 'all' | 'front' | 'dual';
const CART_STORAGE_KEY = 'driveguard-cart-v1';
const queryClient = new QueryClient();
const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const readCart = (): CartLine[] => {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) ?? '[]');
    if (!Array.isArray(value)) return [];
    return value.filter((line): line is CartLine => Boolean(line && Number.isInteger(line.productId) && line.productId > 0 && Number.isInteger(line.quantity) && line.quantity > 0));
  } catch {
    return [];
  }
};
const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Something went wrong. Please try again.';

function Logo({ brandName }: { brandName: string }) {
  return <Link href="/" className="inline-flex shrink-0 items-center gap-2" data-testid="link-home-logo">
    <span className="grid h-9 w-9 place-items-center rounded-sm bg-[#c92525] text-white"><ShieldCheck size={22} strokeWidth={2.2} /></span>
    <span className="text-[21px] font-extrabold tracking-[-.06em] text-[#212121] sm:text-[25px]">{brandName}</span>
  </Link>;
}

function Header({ cartCount, onCollection, products, settings }: { cartCount: number; onCollection: (value: Collection) => void; products: Product[]; settings: StoreSettings }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [, navigate] = useLocation();
  const featured = products.find(product => product.featured) ?? products[0];
  const matches = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return query ? products.filter(product => `${product.name} ${product.description} ${product.category} ${product.slug}`.toLocaleLowerCase().includes(query)) : [];
  }, [products, search]);
  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    if (matches[0]) {
      navigate(`/product/${matches[0].slug}`);
      setSearchOpen(false);
    } else setSearchOpen(true);
  };
  const selectCollection = (value: Collection) => {
    onCollection(value);
    setMobileOpen(false);
    navigate('/');
    window.setTimeout(() => document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' }), 50);
  };
  const goToSection = (section: string) => {
    navigate('/');
    window.setTimeout(() => document.getElementById(section)?.scrollIntoView({ behavior: 'smooth' }), 50);
  };
  return <header className="relative z-30 bg-white">
    <div className="bg-[#262626] text-white">
      <div className="container-store flex min-h-14 items-center justify-between gap-4 text-[12px]">
        <div className="flex items-center gap-2"><Truck size={16} strokeWidth={1.8} /><span>{settings.announcement || `Shipping ${money(settings.shippingCents)} on orders under ${money(settings.shippingThresholdCents)}`}</span></div>
        <div className="hidden text-center font-semibold tracking-[.01em] md:block">{settings.trustTitle}</div>
        <a href="#support" className="hidden items-center gap-2 whitespace-nowrap hover:underline sm:flex" data-testid="link-utility-support"><Headphones size={16} strokeWidth={1.8} /> Help &amp; support</a>
      </div>
    </div>
    <div className="container-store flex min-h-[82px] items-center gap-5 py-3 lg:gap-12">
      <Logo brandName={settings.brandName} />
      <form onSubmit={submitSearch} className="relative mx-auto hidden w-full max-w-[780px] md:flex" role="search">
        <input type="search" value={search} onChange={event => { setSearch(event.target.value); setSearchOpen(Boolean(event.target.value.trim())); }} onFocus={() => setSearchOpen(Boolean(search.trim()))} placeholder="Search products and features" className="h-[45px] w-full border border-[#d8d8d8] bg-[#fafafa] px-4 pr-14 text-[13px] outline-none focus:border-[#999]" data-testid="input-search-products" aria-label="Search catalog" />
        <button type="submit" className="absolute right-0 top-0 grid h-[45px] w-[50px] place-items-center bg-[#c92525] text-white hover:bg-[#ad1b1b]" data-testid="button-search-products" aria-label="Search"><Search size={20} /></button>
        {searchOpen && search.trim() && <div className="absolute left-0 right-0 top-[49px] z-50 max-h-96 overflow-auto border border-[#dedede] bg-white p-3 shadow-lg" data-testid="search-results">
          {matches.length ? matches.map(product => <Link key={product.id} href={`/product/${product.slug}`} onClick={() => setSearchOpen(false)} className="flex items-center justify-between gap-4 px-2 py-3 text-sm hover:bg-[#f7f7f7]" data-testid="link-search-result"><span>{product.name}</span><span className="font-bold">{money(product.priceCents)}</span></Link>) : <div className="px-2 py-3 text-sm text-[#666]" data-testid="text-search-empty">No products match “{search}”.</div>}
        </div>}
      </form>
      <div className="ml-auto flex shrink-0 items-center gap-4 lg:gap-7">
        <a href="#support" className="hidden items-center gap-2 text-[13px] font-semibold hover:text-[#c92525] lg:flex" data-testid="link-header-support"><Headphones size={20} strokeWidth={1.7} /> Support</a>
        <Link href="/checkout" className="relative flex items-center gap-2 text-[13px] font-semibold hover:text-[#c92525]" data-testid="link-cart"><ShoppingBag size={22} strokeWidth={1.8} /><span className="hidden sm:inline">Cart</span>{cartCount > 0 && <span className="absolute -right-2 -top-3 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-[#c92525] px-1 text-[10px] font-bold text-white" data-testid="text-cart-count">{cartCount}</span>}</Link>
        <button type="button" className="grid h-11 w-11 place-items-center md:hidden" onClick={() => setMobileOpen(!mobileOpen)} data-testid="button-mobile-menu" aria-label={mobileOpen ? 'Close menu' : 'Open menu'} aria-expanded={mobileOpen} aria-controls="store-mobile-menu">{mobileOpen ? <X size={24} /> : <Menu size={24} />}</button>
      </div>
    </div>
    <nav className="hidden border-y border-[#e6e6e6] md:block">
      <div className="container-store flex min-h-[50px] items-center gap-8 text-[13px] font-bold lg:gap-12">
        <button type="button" onClick={() => selectCollection('all')} className="flex items-center gap-1 hover:text-[#c92525]" data-testid="button-nav-all-cameras">Shop all cameras <ChevronDown size={14} /></button>
        <button type="button" onClick={() => selectCollection('front')} className="hover:text-[#c92525]" data-testid="button-nav-front-cameras">Front cameras</button>
        <button type="button" onClick={() => selectCollection('dual')} className="hover:text-[#c92525]" data-testid="button-nav-dual-cameras">Dual-channel cameras</button>
        {featured && <Link href={`/product/${featured.slug}`} className="hover:text-[#c92525]" data-testid="link-nav-featured">Featured camera</Link>}
        <button type="button" onClick={() => goToSection('why-driveguard')} className="hover:text-[#c92525]" data-testid="button-nav-about">Why {settings.brandName}</button>
      </div>
    </nav>
    {mobileOpen && <div id="store-mobile-menu" className="border-t border-[#eee] bg-white px-4 pb-5 md:hidden">
      <form onSubmit={submitSearch} className="mt-4 flex"><input type="search" value={search} onChange={event => { setSearch(event.target.value); setSearchOpen(Boolean(event.target.value.trim())); }} placeholder="Search the store" aria-label="Search catalog" className="field-input" data-testid="input-mobile-search" /><button type="submit" className="grid w-12 shrink-0 place-items-center bg-[#c92525] text-white" data-testid="button-mobile-search" aria-label="Search"><Search size={19} /></button></form>
      {search.trim() && <div className="border border-[#eee] p-3 text-sm" data-testid="mobile-search-results">{matches.length ? matches.map(product => <Link key={product.id} href={`/product/${product.slug}`} onClick={() => setMobileOpen(false)} className="block py-2">{product.name} — {money(product.priceCents)}</Link>) : <span data-testid="text-mobile-search-empty">No products match “{search}”.</span>}</div>}
       <div className="mt-4 grid gap-1 text-sm font-semibold">{([['all', 'Shop all cameras'], ['front', 'Front cameras'], ['dual', 'Dual-channel cameras']] as const).map(([value, label]) => <button type="button" key={value} onClick={() => selectCollection(value)} className="min-h-11 border-b border-[#eee] py-3 text-left" data-testid={`button-mobile-nav-${value}`}>{label}</button>)}{featured && <Link href={`/product/${featured.slug}`} onClick={() => setMobileOpen(false)} className="flex min-h-11 items-center border-b border-[#eee] py-3" data-testid="link-mobile-featured">Featured camera</Link>}<Link href="/checkout" onClick={() => setMobileOpen(false)} className="flex min-h-11 items-center border-b border-[#eee] py-3">Cart &amp; checkout</Link><button type="button" onClick={() => { setMobileOpen(false); document.getElementById('support')?.scrollIntoView({ behavior: 'smooth' }); }} className="min-h-11 py-3 text-left">Help &amp; support</button></div>
    </div>}
  </header>;
}

function ProductImage({ product, small = false, src }: { product: Product; small?: boolean; src?: string }) {
  const imageUrl = src ?? product.imageUrl;
  return <div className={`relative flex items-center justify-center overflow-hidden bg-[#f8f8f8] ${small ? 'h-24 w-28 shrink-0' : 'h-[320px] w-full sm:h-[430px]'}`} data-testid={small ? 'img-cart-product' : 'img-product-sample'}>
    {imageUrl ? <img src={imageUrl} alt={product.name} className="h-full w-full object-contain" /> : <div className="px-4 text-center text-sm text-[#777]">Product image unavailable</div>}
  </div>;
}

function HomePage({ collection, onCollection, products, settings }: { collection: Collection; onCollection: (value: Collection) => void; products: Product[]; settings: StoreSettings }) {
  const visibleProducts = products.filter(product =>
    collection === 'all' || product.category === collection || (collection === 'front' && product.category === 'dual')
  );
  const featured = visibleProducts.find(product => product.featured) ?? visibleProducts[0];
  return <main>
    <section className="hero-road flex min-h-[635px] items-start text-white" style={settings.heroImageUrl ? { backgroundImage: `linear-gradient(90deg, rgba(9, 12, 16, .89) 0%, rgba(9, 12, 16, .67) 31%, rgba(9, 12, 16, .16) 68%, rgba(9, 12, 16, .07) 100%), url("${settings.heroImageUrl}")` } : undefined} data-testid="section-hero">
      <div className="container-store py-16 sm:pb-14 sm:pt-[80px]">
        <div className="max-w-[690px]">
          <h1 className="max-w-[675px] text-[44px] font-extrabold leading-[1.1] tracking-[-.045em] sm:text-[62px] lg:text-[67px]" data-testid="text-hero-title">{settings.heroTitle}</h1>
          <p className="mt-6 max-w-[635px] text-[17px] leading-[1.55] text-white/90">{settings.heroDescription}</p>
          <div className="hero-actions mt-8 grid max-w-[675px] grid-cols-2 gap-3">
            <a href="#shop" className="red-button" data-testid="link-hero-shop-all">Shop all cameras <ArrowRight size={17} /></a>
            <button type="button" onClick={() => { onCollection('dual'); document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' }); }} className="red-button" data-testid="button-hero-dual">Shop dual cameras <ArrowRight size={17} /></button>
            {featured && <Link href={`/product/${featured.slug}`} className="red-button" data-testid="link-hero-featured">Explore {featured.name} <ArrowRight size={17} /></Link>}
            <a href="#why-driveguard" className="red-button" data-testid="link-hero-why">Why {settings.brandName} <ArrowRight size={17} /></a>
          </div>
          {featured && <div className="mt-7 max-w-[675px] border-t border-white/25 pt-5 text-[14px] text-white/85">Not sure where to start? <Link href={`/product/${featured.slug}`} className="ml-2 font-bold text-white underline underline-offset-4" data-testid="link-hero-guide">Explore our featured camera <ArrowRight size={15} className="inline" /></Link></div>}
        </div>
      </div>
    </section>

    <section id="why-driveguard" className="bg-white pb-16 pt-14">
      <div className="container-store">
        <div className="mx-auto max-w-[850px] text-center">
          <p className="text-[12px] font-bold uppercase tracking-[.15em] text-[#c92525]">The {settings.brandName} difference</p>
          <h2 className="mt-3 text-[29px] font-extrabold tracking-[-.035em] sm:text-[36px]">{settings.trustTitle}</h2>
          <p className="mx-auto mt-3 max-w-[650px] text-[15px] leading-7 text-[#666]">{settings.trustDescription}</p>
        </div>
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            [Video, 'Clearer context', 'See more of the moments that matter.'],
            [ShieldCheck, 'Thoughtful selection', 'A focused catalog of driving cameras.'],
            [Truck, 'Straightforward shipping', settings.shippingThresholdCents === 0 ? 'Shipping is free on every order.' : `Shipping is free on orders over ${money(settings.shippingThresholdCents)}.`],
            [Headphones, 'Helpful support', settings.supportEmail],
            [Package, 'Simple shopping', 'Explore product details and current availability.'],
          ].map(([Icon, title, body], index) => {
            const BenefitIcon = Icon as typeof Video;
            return <div key={String(title)} className="flex min-h-[150px] flex-col items-start border border-[#e5e5e5] bg-[#fafafa] p-5" data-testid={`card-benefit-${index}`}><BenefitIcon size={24} strokeWidth={1.7} className="text-[#c92525]" /><h3 className="mt-4 text-[14px] font-extrabold">{String(title)}</h3><p className="mt-1 text-[12px] leading-5 text-[#666]">{String(body)}</p></div>;
          })}
        </div>
      </div>
    </section>

    <section id="shop" className="section-rule bg-white py-16">
      <div className="container-store">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-[12px] font-bold uppercase tracking-[.14em] text-[#c92525]">Shop {settings.brandName}</p><h2 className="mt-2 text-[30px] font-extrabold tracking-[-.04em] sm:text-[38px]">Explore our camera collection</h2></div>
          <div className="flex gap-2 text-[12px] font-bold" aria-label="Filter cameras">
            {([['all', 'All'], ['front', 'Front recording'], ['dual', 'Dual channel']] as const).map(([value, label]) => <button type="button" key={value} onClick={() => onCollection(value)} className={`border px-3 py-2 ${collection === value ? 'border-[#c92525] bg-[#c92525] text-white' : 'border-[#d8d8d8] bg-white hover:border-[#888]'}`} data-testid={`button-filter-${value}`}>{label}</button>)}
          </div>
        </div>
        <p className="mt-3 text-[13px] text-[#777]" data-testid="text-collection-count">Showing {visibleProducts.length} {visibleProducts.length === 1 ? 'camera' : 'cameras'}{collection !== 'all' ? ` in ${collection === 'front' ? 'front recording' : 'dual channel'}` : ''}</p>
        {visibleProducts.length ? <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{visibleProducts.map(product => <article key={product.id} className="overflow-hidden border border-[#dedede] bg-white" data-testid={`card-product-${product.slug}`}>
          <Link href={`/product/${product.slug}`} className="block"><div className="flex h-[280px] items-center justify-center bg-[#f8f8f8] p-5" data-testid="img-catalog-product"><img src={product.imageUrl} alt={product.name} className="max-h-full w-full object-contain" /></div></Link>
          <div className="p-6">
            <h3 className="mt-3 text-[22px] font-extrabold tracking-[-.035em]" data-testid="text-product-name">{product.name}</h3>
            <p className="mt-3 text-[14px] leading-6 text-[#666]">{product.description}</p>
            <div className="mt-5 flex items-center justify-between gap-3"><span className="text-[22px] font-extrabold" data-testid="text-product-price">{money(product.priceCents)}</span><span className={`text-[12px] font-semibold ${product.stock > 0 ? 'text-[#4e6a3b]' : 'text-[#a61c1c]'}`}>{product.stock > 0 ? `${product.stock} available` : 'Out of stock'}</span></div>
            <Link href={`/product/${product.slug}`} className="red-button mt-5 w-fit" data-testid="link-view-product">View camera <ArrowRight size={17} /></Link>
          </div>
        </article>)}</div> : <div className="mt-7 border border-dashed border-[#ccc] px-6 py-14 text-center" data-testid="text-empty-collection"><h3 className="text-xl font-bold">No cameras in this collection yet</h3><p className="mt-2 text-sm text-[#666]">Try another category or check back later.</p></div>}
      </div>
    </section>
    <section className="bg-[#f5f5f5] py-16"><div className="container-store grid items-center gap-8 md:grid-cols-[1fr_1fr]">
      <div><p className="text-[12px] font-bold uppercase tracking-[.14em] text-[#c92525]">A better view</p><h2 className="mt-3 max-w-[500px] text-[33px] font-extrabold leading-[1.15] tracking-[-.04em] sm:text-[42px]">{settings.trustTitle}</h2><p className="mt-5 max-w-[510px] text-[15px] leading-7 text-[#606060]">{settings.trustDescription}</p>{featured && <Link href={`/product/${featured.slug}`} className="outline-button mt-7" data-testid="link-bottom-product">Explore {featured.name} <ArrowRight size={17} /></Link>}</div>
      <div className="photo-panel min-h-[280px] md:min-h-[350px]" aria-label="Scenic road seen through a windshield" data-testid="img-story-road" />
    </div></section>
    <Footer settings={settings} featured={featured} />
  </main>;
}

function ProductPage({ product, settings, onAdd, onBuy }: { product: Product; settings: StoreSettings; onAdd: (product: Product, quantity: number) => void; onBuy: (product: Product, quantity: number) => void }) {
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'box'>('overview');
  const [added, setAdded] = useState(false);
  const [showMobileAdd, setShowMobileAdd] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);
  const mainAddRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { setQuantity(1); setAdded(false); setActiveImage(0); }, [product.id]);
  useEffect(() => {
    const button = mainAddRef.current;
    if (!button || typeof IntersectionObserver === 'undefined') return;
    const buttonObserver = new IntersectionObserver(([entry]) => setShowMobileAdd(!entry.isIntersecting), { threshold: 0.25 });
    buttonObserver.observe(button);
    const footer = document.getElementById('support');
    const footerObserver = new IntersectionObserver(([entry]) => setFooterVisible(entry.isIntersecting));
    if (footer) footerObserver.observe(footer);
    return () => { buttonObserver.disconnect(); footerObserver.disconnect(); };
  }, [product.id]);
  const add = () => { onAdd(product, quantity); setAdded(true); window.setTimeout(() => setAdded(false), 2200); };
  const images = product.imageUrls?.length ? product.imageUrls : product.imageUrl ? [product.imageUrl] : [];
  return <main className="bg-white">
    <div className="container-store py-7">
      <div className="mb-7 text-[12px] text-[#777]"><Link href="/" className="hover:text-[#c92525]" data-testid="link-breadcrumb-home">Home</Link><span className="mx-2">/</span><span data-testid="text-breadcrumb-product">{product.name}</span></div>
      <div className="grid gap-9 lg:grid-cols-[1.07fr_.93fr] lg:gap-14">
        <div>
          <div className="relative">
            <ProductImage product={product} src={images[activeImage] ?? images[0]} />
            {images.length > 1 && <div className="pointer-events-none absolute inset-x-3 top-1/2 flex -translate-y-1/2 justify-between">
              <button type="button" onClick={() => setActiveImage(index => (index - 1 + images.length) % images.length)} className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full border border-[#ddd] bg-white/95 shadow-sm hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#c92525]" aria-label="Previous product photo" data-testid="button-product-photo-previous"><ChevronLeft size={20} /></button>
              <button type="button" onClick={() => setActiveImage(index => (index + 1) % images.length)} className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full border border-[#ddd] bg-white/95 shadow-sm hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#c92525]" aria-label="Next product photo" data-testid="button-product-photo-next"><ChevronRight size={20} /></button>
            </div>}
          </div>
          {images.length > 1 && <div className="mt-3 flex gap-2 overflow-x-auto pb-2" role="group" aria-label="Product photos">
            {images.map((image, index) => <button key={`${image}-${index}`} type="button" onClick={() => setActiveImage(index)} aria-label={`View product photo ${index + 1} of ${images.length}`} aria-pressed={activeImage === index} className={`h-[72px] w-[72px] shrink-0 overflow-hidden rounded-sm border-2 bg-[#f8f8f8] p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c92525] ${activeImage === index ? 'border-[#c92525]' : 'border-[#e1e1e1] hover:border-[#888]'}`} data-testid={`button-product-photo-${index + 1}`}><img src={image} alt="" className="h-full w-full object-contain" /></button>)}
          </div>}
        </div>
        <div className="lg:py-3">
          <h1 className="mt-4 text-[34px] font-extrabold leading-[1.13] tracking-[-.04em] sm:text-[45px]" data-testid="text-detail-name">{product.name}</h1>
          <p className="mt-4 text-[27px] font-extrabold" data-testid="text-detail-price">{money(product.priceCents)}</p>
          <p className={`mt-1 text-[12px] ${product.stock > 0 ? 'text-[#4e6a3b]' : 'text-[#a61c1c]'}`} data-testid="text-product-availability">{product.stock > 0 ? `${product.stock} available` : 'Currently unavailable'}</p>
          <div className="my-6 border-t border-[#e7e7e7]" />
          <p className="max-w-[570px] text-[15px] leading-7 text-[#555]">{product.description}</p>
          <div className="mt-7 grid grid-cols-2 gap-2 border-y border-[#e7e7e7] py-5 text-center text-[12px] font-semibold"><span>{product.category === 'dual' ? 'Front + rear recording' : 'Front recording'}</span><span>Current product listing</span></div>
          <div className="mt-7"><label className="mb-2 block text-[13px] font-bold">Quantity</label><div className="flex flex-wrap gap-3">
            <div className="flex h-[52px] items-center border border-[#d6d6d6]"><button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="grid h-full w-11 place-items-center hover:bg-[#f5f5f5]" data-testid="button-decrease-product-quantity" aria-label="Decrease quantity"><Minus size={16} /></button><span className="w-8 text-center text-sm font-bold" data-testid="text-product-quantity">{quantity}</span><button type="button" disabled={quantity >= product.stock} onClick={() => setQuantity(Math.min(product.stock, quantity + 1))} className="grid h-full w-11 place-items-center hover:bg-[#f5f5f5] disabled:opacity-40" data-testid="button-increase-product-quantity" aria-label="Increase quantity"><Plus size={16} /></button></div>
            <button ref={mainAddRef} type="button" onClick={add} disabled={product.stock < 1} className="outline-button min-w-[220px] flex-1 disabled:opacity-50" data-testid="button-add-to-cart">{added ? <><Check size={18} /> Added to cart</> : <><ShoppingBag size={18} /> {product.stock ? 'Add to cart' : 'Out of stock'}</>}</button>
          </div></div>
          <button type="button" onClick={() => onBuy(product, quantity)} disabled={product.stock < 1} className="red-button mt-3 w-full disabled:opacity-50" data-testid="button-buy-now">Buy now <ArrowRight size={18} /></button>
          <p className="mt-5 flex items-center gap-2 text-[12px] text-[#666]"><Truck size={16} /> {settings.shippingThresholdCents === 0 ? 'Free shipping on all orders' : `Free shipping on orders over ${money(settings.shippingThresholdCents)}`}</p>
          <div className="mt-5 border-t border-[#e7e7e7] pt-5"><AcceptedCards location="product" /></div>
          <Link href="/checkout" className="mt-5 inline-flex items-center gap-2 text-[13px] font-bold text-[#c92525] hover:underline" data-testid="link-product-view-cart">View cart <ArrowRight size={15} /></Link>
        </div>
      </div>
      <div className="mt-16 border-t border-[#ddd]">
        <div className="flex gap-7 overflow-x-auto border-b border-[#ddd]">{([['overview', 'Overview'], ['details', 'Specifications'], ['box', 'What’s included']] as const).map(([value, label]) => <button type="button" key={value} onClick={() => setActiveTab(value)} className={`shrink-0 border-b-2 py-5 text-[13px] font-bold ${activeTab === value ? 'border-[#c92525] text-[#c92525]' : 'border-transparent text-[#666]'}`} data-testid={`button-product-tab-${value}`}>{label}</button>)}</div>
        <div className="max-w-[760px] py-9 text-[15px] leading-7 text-[#555]" data-testid={`text-product-tab-${activeTab}`}>{activeTab === 'overview' ? product.description : activeTab === 'details' ? `${product.category === 'dual' ? 'Dual-channel' : 'Front-channel'} dash camera. See the product description for available details.` : 'Refer to the product listing for included accessories and package details.'}</div>
      </div>
    </div>
    {showMobileAdd && !footerVisible && product.stock > 0 && <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-4 border-t border-[#dedede] bg-white/95 px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 shadow-[0_-6px_24px_rgba(0,0,0,.12)] backdrop-blur-sm md:hidden" data-testid="mobile-product-buy-bar">
      <strong className="shrink-0 text-[18px]">{money(product.priceCents)}</strong>
      <button type="button" onClick={() => onBuy(product, quantity)} className="red-button flex-1" data-testid="button-mobile-buy-now">Buy now <ArrowRight size={16} /></button>
    </div>}
    <Footer settings={settings} featured={product} />
  </main>;
}

function CartSummary({ cart, updateQuantity, removeItem, settings }: { cart: { product: Product; quantity: number }[]; updateQuantity: (id: number, amount: number) => void; removeItem: (id: number) => void; settings: StoreSettings }) {
  const subtotal = cart.reduce((sum, item) => sum + item.product.priceCents * item.quantity, 0);
  const shipping = !subtotal || subtotal >= settings.shippingThresholdCents ? 0 : settings.shippingCents;
  return <div className="border border-[#dedede] bg-white p-4 sm:p-7">
    <div className="flex items-center justify-between border-b border-[#e8e8e8] pb-4 sm:pb-5"><h2 className="text-[22px] font-extrabold">Your cart</h2><span className="text-[12px] text-[#666]" data-testid="text-cart-item-count">{cart.reduce((sum, item) => sum + item.quantity, 0)} item(s)</span></div>
    {cart.length ? cart.map(({ product, quantity }) => <div key={product.id} className="flex gap-3 border-b border-[#e8e8e8] py-4 sm:gap-4 sm:py-6" data-testid={`row-cart-item-${product.id}`}><ProductImage product={product} small /><div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><div className="min-w-0"><Link href={`/product/${product.slug}`} className="text-[14px] font-bold hover:text-[#c92525]" data-testid={`link-cart-product-${product.id}`}>{product.name}</Link><p className="mt-1 text-[11px] text-[#777]">{product.stock} available · {money(product.priceCents)} each</p></div><button type="button" onClick={() => removeItem(product.id)} className="grid h-10 w-10 shrink-0 place-items-center self-start text-[#777] hover:text-[#c92525]" aria-label={`Remove ${product.name}`} data-testid={`button-remove-cart-item-${product.id}`}><Trash2 size={17} /></button></div><div className="mt-3 flex flex-wrap items-center justify-between gap-2"><div className="flex h-10 items-center border border-[#ddd]"><button type="button" onClick={() => updateQuantity(product.id, -1)} className="grid h-full w-10 place-items-center" aria-label="Decrease quantity" data-testid={`button-decrease-cart-item-${product.id}`}><Minus size={13} /></button><span className="w-7 text-center text-xs font-bold" data-testid={`text-cart-item-quantity-${product.id}`}>{quantity}</span><button type="button" disabled={quantity >= product.stock} onClick={() => updateQuantity(product.id, 1)} className="grid h-full w-10 place-items-center disabled:opacity-40" aria-label="Increase quantity" data-testid={`button-increase-cart-item-${product.id}`}><Plus size={13} /></button></div><strong className="text-[14px]" data-testid={`text-cart-item-total-${product.id}`}>{money(product.priceCents * quantity)}</strong></div></div></div>) : <div className="py-12 text-center" data-testid="text-empty-cart"><ShoppingBag className="mx-auto text-[#777]" size={33} /><h3 className="mt-4 text-[21px] font-bold">Your cart is empty</h3><p className="mt-2 text-[13px] text-[#666]">Explore the current camera collection to get started.</p><Link href="/" className="red-button mt-6" data-testid="link-empty-cart-shop">Shop cameras</Link></div>}
    {cart.length > 0 && <div className="space-y-3 pt-4 text-[14px] sm:pt-6"><div className="flex justify-between"><span className="text-[#666]">Subtotal</span><span data-testid="text-cart-subtotal">{money(subtotal)}</span></div><div className="flex justify-between"><span className="text-[#666]">Shipping</span><span data-testid="text-cart-shipping">{shipping ? money(shipping) : 'Free'}</span></div><div className="flex justify-between border-t border-[#ddd] pt-4 text-[18px] font-extrabold"><span>Total</span><span data-testid="text-cart-total">{money(subtotal + shipping)}</span></div></div>}
    {cart.length > 0 && <div className="mt-6 hidden border-t border-[#e8e8e8] pt-5 lg:block"><AcceptedCards location="cart" /></div>}
  </div>;
}

function CheckoutPage({ cart, updateQuantity, removeItem, clearCart, settings }: { cart: { product: Product; quantity: number }[]; updateQuantity: (id: number, amount: number) => void; removeItem: (id: number) => void; clearCart: () => void; settings: StoreSettings }) {
  const [submittedType, setSubmittedType] = useState<'credit' | 'debit' | null>(null);
  if (submittedType) return <><main className="min-h-[60dvh] bg-[#f7f7f7] py-20"><div className="container-store"><div className="mx-auto max-w-[600px] border border-[#ddd] bg-white p-8 text-center sm:p-12" data-testid="status-demo-success"><div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#c92525] text-white"><Check size={28} /></div><p className="mt-5 text-[12px] font-bold uppercase tracking-[.14em] text-[#c92525]">Order confirmation</p><h1 className="mt-3 text-[34px] font-extrabold tracking-[-.04em]">Order received</h1><p className="mt-4 text-[14px] leading-7 text-[#666]">Your order has been recorded.</p><Link href="/" className="red-button mt-7" data-testid="link-success-store">Continue shopping <ArrowRight size={17} /></Link></div></div></main><Footer settings={settings} featured={cart[0]?.product} /></>;
  const subtotal = cart.reduce((sum, item) => sum + item.product.priceCents * item.quantity, 0);
  const totalCents = subtotal + (subtotal > 0 && subtotal < settings.shippingThresholdCents ? settings.shippingCents : 0);
  return <main className="bg-[#f7f7f7] py-9 sm:py-14"><div className="container-store">
    <Link href="/" className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#666] hover:text-[#c92525]" data-testid="link-continue-shopping"><ChevronLeft size={15} /> Continue shopping</Link>
    <h1 className="mt-5 text-[35px] font-extrabold tracking-[-.04em] sm:text-[43px]">Cart &amp; checkout</h1>
    <p className="mt-2 text-[14px] text-[#666]">{cart.length ? 'Review your cart, add delivery details, then choose how to pay.' : 'Your cart is empty. Choose a camera to get started.'}</p>
    <div className={`${cart.length ? 'mt-6 grid items-start gap-7 lg:mt-8 lg:grid-cols-[1fr_.85fr]' : 'mx-auto mt-8 max-w-[700px]'}`}>
      <div>
        <CartSummary cart={cart} updateQuantity={updateQuantity} removeItem={removeItem} settings={settings} />
      </div>
      {cart.length > 0 && <DemoCardCheckout key={String(settings.fictionalDemoMode)} cart={cart} clearCart={clearCart} onSubmitted={setSubmittedType} totalCents={totalCents} fictionalDemoMode={settings.fictionalDemoMode} settings={settings} />}
    </div>
  </div><Footer settings={settings} /></main>;
}

function Footer({ settings, featured }: { settings: StoreSettings; featured?: Product }) {
  return <footer id="support" className="bg-[#252525] py-11 text-white"><div className="container-store grid gap-9 sm:grid-cols-[1.2fr_1fr_1fr]"><div><div className="text-[24px] font-extrabold tracking-[-.06em]">{settings.brandName}</div><p className="mt-3 max-w-[320px] text-[13px] leading-6 text-[#bbb]">{settings.trustDescription}</p>{settings.supportEmail && <a className="mt-3 inline-block text-[13px] text-[#ddd] hover:text-white" href={`mailto:${settings.supportEmail}`}>{settings.supportEmail}</a>}</div><div><h2 className="text-[13px] font-bold">Explore</h2><div className="mt-3 grid gap-2 text-[13px] text-[#bbb]"><Link href="/" data-testid="link-footer-home" className="hover:text-white">Shop cameras</Link>{featured && <Link href={`/product/${featured.slug}`} data-testid="link-footer-product" className="hover:text-white">{featured.name}</Link>}<Link href="/checkout" data-testid="link-footer-checkout" className="hover:text-white">Cart &amp; checkout</Link></div></div><div><h2 className="text-[13px] font-bold">Support</h2><p className="mt-3 text-[13px] leading-6 text-[#bbb]">Questions about your order? Get in touch with our team.</p>{settings.supportEmail && <a className="mt-2 inline-block text-[13px] text-[#ddd] hover:text-white" href={`mailto:${settings.supportEmail}`}>Contact support</a>}</div></div><div className="container-store mt-9 flex flex-wrap items-center justify-between gap-5 border-t border-[#555] pt-5"><span className="text-[11px] text-[#aaa]">© {settings.brandName}.</span><AcceptedCards location="footer" dark /></div></footer>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Store({ cart, add, updateQuantity, removeItem, clearCart }: { cart: CartLine[]; add: (product: Product, quantity: number) => void; updateQuantity: (id: number, amount: number) => void; removeItem: (id: number) => void; clearCart: () => void }) {
  const [collection, setCollection] = useState<Collection>('all');
  const [location, navigate] = useLocation();
  const directCheckoutRef = useRef(false);
  const storefront = useGetStorefront({ query: { queryKey: getGetStorefrontQueryKey(), refetchInterval: 5000 } });
  const products = storefront.data?.products.filter(product => product.active) ?? [];
  const settings = storefront.data?.settings;
  useEffect(() => {
    if (location === '/checkout' && directCheckoutRef.current) {
      directCheckoutRef.current = false;
      const frame = window.requestAnimationFrame(() => {
        document.getElementById('checkout-start')?.scrollIntoView({ block: 'start', behavior: 'auto' });
      });
      return () => window.cancelAnimationFrame(frame);
    }
    window.scrollTo(0, 0);
    return undefined;
  }, [location]);
  const buyNow = (product: Product, quantity: number) => {
    if (product.stock < 1) return;
    add(product, quantity);
    directCheckoutRef.current = true;
    navigate('/checkout');
  };
  useEffect(() => {
    if (storefront.isSuccess) {
      const availableIds = new Set(products.map(product => product.id));
      cart.forEach(line => { if (!availableIds.has(line.productId)) removeItem(line.productId); });
    }
  }, [storefront.isSuccess, storefront.data, cart, removeItem]);
  if (storefront.isError) return <div className="min-h-screen bg-white"><div className="container-store py-24 text-center"><h1 className="text-2xl font-extrabold">Store unavailable</h1><p className="mt-3 text-[#666]" role="alert">We couldn’t load the store data: {errorMessage(storefront.error)}</p><button type="button" onClick={() => void storefront.refetch()} className="red-button mt-6">Try again</button></div></div>;
  if (storefront.isPending || !settings) return <div className="min-h-screen bg-white"><div className="container-store py-24 text-center" role="status">Loading {storefront.data?.settings.brandName ?? 'store'}…</div></div>;
  const cartProducts = cart.flatMap(line => {
    const product = products.find(item => item.id === line.productId);
    return product ? [{ product, quantity: line.quantity }] : [];
  });
  return <div className="min-h-[100dvh] bg-white"><Header cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)} onCollection={setCollection} products={products} settings={settings} /><RoutedErrorBoundary><Switch>
    <Route path="/"><HomePage collection={collection} onCollection={setCollection} products={products} settings={settings} /></Route>
    <Route path="/product/:slug">{params => {
      const product = products.find(item => item.slug === params.slug);
      return product ? <ProductPage product={product} settings={settings} onAdd={add} onBuy={buyNow} /> : <NotFound />;
    }}</Route>
    <Route path="/checkout"><CheckoutPage cart={cartProducts} updateQuantity={updateQuantity} removeItem={removeItem} clearCart={clearCart} settings={settings} /></Route>
    <Route component={NotFound} />
  </Switch></RoutedErrorBoundary></div>;
}

function App() {
  const [cart, setCart] = useState<CartLine[]>(readCart);
  useEffect(() => { localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart)); }, [cart]);
  const add = (product: Product, quantity: number) => setCart(items => {
    const found = items.find(item => item.productId === product.id);
    const nextQuantity = Math.min(product.stock, (found?.quantity ?? 0) + quantity);
    return found ? items.map(item => item.productId === product.id ? { ...item, quantity: nextQuantity } : item) : [...items, { productId: product.id, quantity: nextQuantity }];
  });
  const updateQuantity = (id: number, amount: number) => setCart(items => items.flatMap(item => item.productId === id ? (item.quantity + amount > 0 ? [{ ...item, quantity: item.quantity + amount }] : []) : [item]));
  const removeItem = (id: number) => setCart(items => items.filter(item => item.productId !== id));
  const clearCart = () => setCart([]);
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><StoreClerkProvider><Switch>
    <Route path="/admin" component={AdminAccess} />
    <Route path="/sign-in/*?" component={SignInPage} />
    <Route path="/sign-up/*?" component={SignUpPage} />
    <Route><Store cart={cart} add={add} updateQuantity={updateQuantity} removeItem={removeItem} clearCart={clearCart} /></Route>
  </Switch></StoreClerkProvider></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;