import { type FormEvent, type ReactNode, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { ArrowRight, Check, ChevronDown, ChevronLeft, CreditCard, Headphones, LockKeyhole, Menu, Minus, Package, Plus, Search, ShieldCheck, ShoppingBag, Trash2, Truck, UserRound, Video, X } from 'lucide-react';
import { Link, Route, Router as WouterRouter, Switch, useLocation } from 'wouter';

type CartItem = { id: string; name: string; price: number; quantity: number };
type Collection = 'all' | 'front' | 'dual';
const PRODUCT = { id: 'roadview-4k-dual', name: 'RoadView 4K Dual Dash Cam', price: 329 };
const queryClient = new QueryClient();
const money = (value: number) => `$${value.toFixed(2)}`;

function Logo() {
  return <Link href="/" className="inline-flex shrink-0 items-center gap-2" data-testid="link-home-logo">
    <span className="grid h-9 w-9 place-items-center rounded-sm bg-[#c92525] text-white"><ShieldCheck size={22} strokeWidth={2.2} /></span>
    <span className="text-[21px] font-extrabold tracking-[-.06em] text-[#212121] sm:text-[25px]">Drive<span className="text-[#c92525]">Guard</span></span>
  </Link>;
}

function Header({ cartCount, onCollection }: { cartCount: number; onCollection: (value: Collection) => void }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [, navigate] = useLocation();
  const matches = /road|view|4k|dual|dash|cam|camera|front|rear|driveguard/i.test(search);
  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setSearchOpen(true);
    if (search.trim() && matches) { navigate('/product/roadview-4k-dual'); setSearchOpen(false); }
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
        <div className="flex items-center gap-2 whitespace-nowrap"><Truck size={16} strokeWidth={1.8} /><span>Free shipping on orders over $100</span></div>
        <div className="hidden text-center font-semibold tracking-[.01em] md:block">The road changes. Your confidence doesn't have to.</div>
        <a href="#support" className="hidden items-center gap-2 whitespace-nowrap hover:underline sm:flex" data-testid="link-utility-support"><Headphones size={16} strokeWidth={1.8} /> Help &amp; support</a>
      </div>
    </div>
    <div className="container-store flex min-h-[82px] items-center gap-5 py-3 lg:gap-12">
      <Logo />
      <form onSubmit={submitSearch} className="relative mx-auto hidden w-full max-w-[780px] md:flex" role="search">
        <input type="search" value={search} onChange={event => { setSearch(event.target.value); setSearchOpen(Boolean(event.target.value.trim())); }} onFocus={() => setSearchOpen(Boolean(search.trim()))} placeholder="Search dash cams, features, and more" className="h-[45px] w-full border border-[#d8d8d8] bg-[#fafafa] px-4 pr-14 text-[13px] outline-none focus:border-[#999]" data-testid="input-search-products" aria-label="Search catalog" />
        <button type="submit" className="absolute right-0 top-0 grid h-[45px] w-[50px] place-items-center bg-[#c92525] text-white hover:bg-[#ad1b1b]" data-testid="button-search-products" aria-label="Search"><Search size={20} /></button>
        {searchOpen && search.trim() && <div className="absolute left-0 right-0 top-[49px] z-50 border border-[#dedede] bg-white p-3 shadow-lg" data-testid="search-results">
          {matches ? <Link href="/product/roadview-4k-dual" onClick={() => setSearchOpen(false)} className="flex items-center justify-between gap-4 px-2 py-3 text-sm hover:bg-[#f7f7f7]" data-testid="link-search-result-roadview"><span>RoadView 4K Dual Dash Cam <small className="ml-2 text-[#777]">Sample listing</small></span><span className="font-bold">$329.00</span></Link> : <div className="px-2 py-3 text-sm text-[#666]" data-testid="text-search-empty">No products match “{search}”. Try “RoadView” or “dash cam”.</div>}
        </div>}
      </form>
      <div className="ml-auto flex shrink-0 items-center gap-4 lg:gap-7">
        <a href="#support" className="hidden items-center gap-2 text-[13px] font-semibold hover:text-[#c92525] lg:flex" data-testid="link-header-support"><Headphones size={20} strokeWidth={1.7} /> Support</a>
        <div className="relative hidden lg:block">
          <button type="button" onClick={() => setAccountOpen(!accountOpen)} className="flex items-center gap-2 text-[13px] font-semibold hover:text-[#c92525]" data-testid="button-account-menu" aria-expanded={accountOpen}><UserRound size={21} strokeWidth={1.7} /> Account</button>
          {accountOpen && <div className="absolute right-0 top-9 z-50 w-64 border border-[#ddd] bg-white p-4 text-[13px] leading-5 shadow-lg" data-testid="status-account-demo"><strong>Sample storefront</strong><p className="mt-2 text-[#666]">Accounts are not available in this demo. You can still explore the camera and try the demo checkout.</p><button type="button" onClick={() => setAccountOpen(false)} className="mt-3 font-bold text-[#c92525]" data-testid="button-close-account-menu">Close</button></div>}
        </div>
        <Link href="/checkout" className="relative flex items-center gap-2 text-[13px] font-semibold hover:text-[#c92525]" data-testid="link-cart"><ShoppingBag size={22} strokeWidth={1.8} /><span className="hidden sm:inline">Cart</span>{cartCount > 0 && <span className="absolute -right-2 -top-3 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-[#c92525] px-1 text-[10px] font-bold text-white" data-testid="text-cart-count">{cartCount}</span>}</Link>
        <button type="button" className="p-1 md:hidden" onClick={() => setMobileOpen(!mobileOpen)} data-testid="button-mobile-menu" aria-label={mobileOpen ? 'Close menu' : 'Open menu'}>{mobileOpen ? <X size={24} /> : <Menu size={24} />}</button>
      </div>
    </div>
    <nav className="hidden border-y border-[#e6e6e6] md:block">
      <div className="container-store flex min-h-[50px] items-center gap-8 text-[13px] font-bold lg:gap-12">
        <button type="button" onClick={() => selectCollection('all')} className="flex items-center gap-1 hover:text-[#c92525]" data-testid="button-nav-all-cameras">Shop all cameras <ChevronDown size={14} /></button>
        <button type="button" onClick={() => selectCollection('front')} className="hover:text-[#c92525]" data-testid="button-nav-front-cameras">Front cameras</button>
        <button type="button" onClick={() => selectCollection('dual')} className="hover:text-[#c92525]" data-testid="button-nav-dual-cameras">Dual-channel cameras</button>
        <Link href="/product/roadview-4k-dual" className="hover:text-[#c92525]" data-testid="link-nav-featured">Featured camera</Link>
        <button type="button" onClick={() => goToSection('why-driveguard')} className="hover:text-[#c92525]" data-testid="button-nav-about">Why DriveGuard</button>
      </div>
    </nav>
    {mobileOpen && <div className="border-t border-[#eee] bg-white px-4 pb-5 md:hidden">
      <form onSubmit={submitSearch} className="mt-4 flex"><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search the store" aria-label="Search catalog" className="field-input" data-testid="input-mobile-search" /><button type="submit" className="grid w-12 shrink-0 place-items-center bg-[#c92525] text-white" data-testid="button-mobile-search" aria-label="Search"><Search size={19} /></button></form>
      {search.trim() && <div className="border border-[#eee] p-3 text-sm" data-testid="mobile-search-results">{matches ? <Link href="/product/roadview-4k-dual" onClick={() => setMobileOpen(false)} data-testid="link-mobile-search-result">RoadView 4K Dual Dash Cam — $329.00</Link> : <span data-testid="text-mobile-search-empty">No products match “{search}”.</span>}</div>}
      <div className="mt-4 grid gap-1 text-sm font-semibold">{([['all', 'Shop all cameras'], ['front', 'Front cameras'], ['dual', 'Dual-channel cameras']] as const).map(([value, label]) => <button type="button" key={value} onClick={() => selectCollection(value)} className="border-b border-[#eee] py-3 text-left" data-testid={`button-mobile-nav-${value}`}>{label}</button>)}<Link href="/product/roadview-4k-dual" onClick={() => setMobileOpen(false)} className="py-3" data-testid="link-mobile-featured">Featured camera</Link></div>
    </div>}
  </header>;
}

function PhotoCard({ small = false }: { small?: boolean }) {
  return <div className={`relative flex items-center justify-center overflow-hidden bg-[#f8f8f8] ${small ? 'h-24 w-28 shrink-0' : 'h-[320px] w-full sm:h-[430px]'}`} data-testid={small ? 'img-cart-product' : 'img-product-sample'}>
    <img src={`${import.meta.env.BASE_URL}images/roadview-sample.jpg`} alt="Illustrative sample dash camera kit, not the actual product" className="h-full w-full object-contain" />
    {!small && <div className="absolute bottom-5 left-5 bg-white px-3 py-2 text-[11px] font-bold uppercase tracking-[.08em] text-[#333]">Illustrative sample image · not the actual product</div>}
  </div>;
}

function HomePage({ collection, onCollection }: { collection: Collection; onCollection: (value: Collection) => void }) {
  return <main>
    <section className="hero-road flex min-h-[635px] items-start text-white" data-testid="section-hero">
      <div className="container-store py-16 sm:pb-14 sm:pt-[80px]">
        <div className="max-w-[690px]">
          <h1 className="max-w-[675px] text-[44px] font-extrabold leading-[1.1] tracking-[-.045em] sm:text-[62px] lg:text-[67px]" data-testid="text-hero-title">Ready for the road<br />ahead.</h1>
          <p className="mt-6 max-w-[635px] text-[17px] leading-[1.55] text-white/90">From changing weather to everyday commutes, the right dash cam helps you keep the details. Find the camera setup that fits the way you drive.</p>
          <div className="hero-actions mt-8 grid max-w-[675px] grid-cols-2 gap-3">
            <a href="#shop" className="red-button" data-testid="link-hero-shop-all">Shop all cameras <ArrowRight size={17} /></a>
            <button type="button" onClick={() => { onCollection('dual'); document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' }); }} className="red-button" data-testid="button-hero-dual">Shop dual cameras <ArrowRight size={17} /></button>
            <Link href="/product/roadview-4k-dual" className="red-button" data-testid="link-hero-featured">Explore RoadView <ArrowRight size={17} /></Link>
            <a href="#why-driveguard" className="red-button" data-testid="link-hero-why">Why DriveGuard <ArrowRight size={17} /></a>
          </div>
          <div className="mt-7 max-w-[675px] border-t border-white/25 pt-5 text-[14px] text-white/85">Not sure where to start? <Link href="/product/roadview-4k-dual" className="ml-2 font-bold text-white underline underline-offset-4" data-testid="link-hero-guide">See our sample camera <ArrowRight size={15} className="inline" /></Link></div>
        </div>
      </div>
    </section>

    <section id="why-driveguard" className="bg-white pb-16 pt-14">
      <div className="container-store">
        <div className="mx-auto max-w-[850px] text-center">
          <p className="text-[12px] font-bold uppercase tracking-[.15em] text-[#c92525]">The DriveGuard difference</p>
          <h2 className="mt-3 text-[29px] font-extrabold tracking-[-.035em] sm:text-[36px]">Be ready for the road ahead.</h2>
          <p className="mx-auto mt-3 max-w-[650px] text-[15px] leading-7 text-[#666]">The right recording gear makes it easier to understand what happened. We keep the selection focused and the buying process straightforward.</p>
        </div>
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            [Video, 'Clearer context', 'See more of the moments that matter.'],
            [ShieldCheck, 'Thoughtful selection', 'A focused catalog, not endless options.'],
            [Truck, 'Easy shipping', 'Free shipping on orders over $100.'],
            [Headphones, 'Straight answers', 'Helpful guidance when choosing gear.'],
            [Package, 'Simple setup', 'Made to fit into your daily drive.'],
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
          <div><p className="text-[12px] font-bold uppercase tracking-[.14em] text-[#c92525]">Shop DriveGuard</p><h2 className="mt-2 text-[30px] font-extrabold tracking-[-.04em] sm:text-[38px]">A focused camera collection</h2></div>
          <div className="flex gap-2 text-[12px] font-bold" aria-label="Filter cameras">
            {([['all', 'All'], ['front', 'Front recording'], ['dual', 'Dual channel']] as const).map(([value, label]) => <button type="button" key={value} onClick={() => onCollection(value)} className={`border px-3 py-2 ${collection === value ? 'border-[#c92525] bg-[#c92525] text-white' : 'border-[#d8d8d8] bg-white hover:border-[#888]'}`} data-testid={`button-filter-${value}`}>{label}</button>)}
          </div>
        </div>
        <p className="mt-3 text-[13px] text-[#777]" data-testid="text-collection-count">Showing 1 camera {collection !== 'all' ? `in ${collection === 'front' ? 'front recording' : 'dual channel'}` : ''}</p>
        <article className="mt-7 grid overflow-hidden border border-[#dedede] bg-white lg:grid-cols-[1fr_1fr]" data-testid="card-product-roadview-4k-dual">
          <div className="flex min-h-[320px] items-center justify-center bg-[#f8f8f8] p-6 lg:min-h-[435px]" data-testid="img-catalog-product"><img src={`${import.meta.env.BASE_URL}images/roadview-sample.jpg`} alt="Illustrative sample dash camera kit, not the actual product" className="max-h-[385px] w-full object-contain" /></div>
          <div className="flex flex-col justify-center p-7 sm:p-10 lg:p-14">
            <span className="w-fit bg-[#f6ebeb] px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-[.08em] text-[#a61c1c]">Sample listing · replace with your actual SKU</span>
            <h3 className="mt-5 text-[27px] font-extrabold tracking-[-.035em] sm:text-[34px]" data-testid="text-product-name">RoadView 4K Dual Dash Cam</h3>
            <p className="mt-3 max-w-[500px] text-[15px] leading-7 text-[#666]">A front-and-rear recording option for drivers who want a fuller picture of the road. This is a sample product while your actual SKU is being prepared.</p>
            <div className="mt-6 flex items-center gap-3"><span className="text-[24px] font-extrabold" data-testid="text-product-price">$329.00</span><span className="text-[12px] text-[#666]">Sample price</span></div>
            <Link href="/product/roadview-4k-dual" className="red-button mt-6 w-fit" data-testid="link-view-product">View camera <ArrowRight size={17} /></Link>
          </div>
        </article>
      </div>
    </section>
    <section className="bg-[#f5f5f5] py-16"><div className="container-store grid items-center gap-8 md:grid-cols-[1fr_1fr]">
      <div><p className="text-[12px] font-bold uppercase tracking-[.14em] text-[#c92525]">A better view</p><h2 className="mt-3 max-w-[500px] text-[33px] font-extrabold leading-[1.15] tracking-[-.04em] sm:text-[42px]">Less second-guessing when the unexpected happens.</h2><p className="mt-5 max-w-[510px] text-[15px] leading-7 text-[#606060]">From a close call on the commute to a question in the parking lot, a dependable recording gives you something concrete to look back on.</p><Link href="/product/roadview-4k-dual" className="outline-button mt-7" data-testid="link-bottom-product">Explore the RoadView <ArrowRight size={17} /></Link></div>
      <div className="photo-panel min-h-[280px] md:min-h-[350px]" aria-label="Scenic road seen through a windshield" data-testid="img-story-road" />
    </div></section>
    <Footer />
  </main>;
}

function ProductPage({ onAdd }: { onAdd: (quantity: number) => void }) {
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'box'>('overview');
  const [added, setAdded] = useState(false);
  const add = () => { onAdd(quantity); setAdded(true); window.setTimeout(() => setAdded(false), 2200); };
  return <main className="bg-white">
    <div className="container-store py-7">
      <div className="mb-7 text-[12px] text-[#777]"><Link href="/" className="hover:text-[#c92525]" data-testid="link-breadcrumb-home">Home</Link><span className="mx-2">/</span><span data-testid="text-breadcrumb-product">RoadView 4K Dual Dash Cam</span></div>
      <div className="grid gap-9 lg:grid-cols-[1.07fr_.93fr] lg:gap-14">
        <div><PhotoCard /><div className="mt-3 flex gap-3"><div className="h-16 w-20 border-2 border-[#c92525]"><img src={`${import.meta.env.BASE_URL}images/roadview-sample.jpg`} alt="" className="h-full w-full object-contain" /></div><div className="flex h-16 w-20 items-center justify-center border border-[#ddd] bg-[#f5f5f5] text-center text-[10px] font-semibold text-[#666]">Sample<br />listing</div></div><p className="mt-3 text-[12px] text-[#777]">Illustrative sample image. Replace with actual product photography when your SKU is available.</p></div>
        <div className="lg:py-3">
          <span className="inline-block bg-[#f7eaea] px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-[.08em] text-[#ab2020]" data-testid="text-sample-status">Sample listing · replace with your actual SKU</span>
          <h1 className="mt-4 text-[34px] font-extrabold leading-[1.13] tracking-[-.04em] sm:text-[45px]" data-testid="text-detail-name">RoadView 4K Dual Dash Cam</h1>
          <p className="mt-4 text-[27px] font-extrabold" data-testid="text-detail-price">$329.00</p>
          <p className="mt-1 text-[12px] text-[#777]">Sample price</p>
          <div className="my-6 border-t border-[#e7e7e7]" />
          <p className="max-w-[570px] text-[15px] leading-7 text-[#555]">A clear view of the road ahead and behind. RoadView is our sample dual-channel camera listing, shown here to demonstrate the shopping experience until your actual product details arrive.</p>
          <div className="mt-7 grid grid-cols-3 gap-2 border-y border-[#e7e7e7] py-5 text-center text-[12px] font-semibold"><span>Front + rear view</span><span>4K front capture</span><span>Everyday recording</span></div>
          <div className="mt-7"><label className="mb-2 block text-[13px] font-bold">Quantity</label><div className="flex flex-wrap gap-3">
            <div className="flex h-[52px] items-center border border-[#d6d6d6]"><button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="grid h-full w-11 place-items-center hover:bg-[#f5f5f5]" data-testid="button-decrease-product-quantity" aria-label="Decrease quantity"><Minus size={16} /></button><span className="w-8 text-center text-sm font-bold" data-testid="text-product-quantity">{quantity}</span><button type="button" onClick={() => setQuantity(quantity + 1)} className="grid h-full w-11 place-items-center hover:bg-[#f5f5f5]" data-testid="button-increase-product-quantity" aria-label="Increase quantity"><Plus size={16} /></button></div>
            <button type="button" onClick={add} className="red-button min-w-[220px] flex-1" data-testid="button-add-to-cart">{added ? <><Check size={18} /> Added to cart</> : <><ShoppingBag size={18} /> Add to cart</>}</button>
          </div></div>
          <p className="mt-5 flex items-center gap-2 text-[12px] text-[#666]"><Truck size={16} /> Free shipping on orders over $100</p>
          <Link href="/checkout" className="mt-5 inline-flex items-center gap-2 text-[13px] font-bold text-[#c92525] hover:underline" data-testid="link-product-view-cart">View cart <ArrowRight size={15} /></Link>
        </div>
      </div>
      <div className="mt-16 border-t border-[#ddd]">
        <div className="flex gap-7 overflow-x-auto border-b border-[#ddd]">{([['overview', 'Overview'], ['details', 'Specifications'], ['box', 'What’s included']] as const).map(([value, label]) => <button type="button" key={value} onClick={() => setActiveTab(value)} className={`shrink-0 border-b-2 py-5 text-[13px] font-bold ${activeTab === value ? 'border-[#c92525] text-[#c92525]' : 'border-transparent text-[#666]'}`} data-testid={`button-product-tab-${value}`}>{label}</button>)}</div>
        <div className="max-w-[760px] py-9 text-[15px] leading-7 text-[#555]" data-testid={`text-product-tab-${activeTab}`}>{activeTab === 'overview' ? 'RoadView 4K Dual Dash Cam is a sample listing for a front-and-rear recording setup. Replace this content with the verified capabilities of your actual SKU before selling.' : activeTab === 'details' ? 'Sample specifications: 4K front recording, dual-channel coverage. Technical specifications should be confirmed against the final product before launch.' : 'Sample listing contents have not been verified. The final in-box accessories will be listed when the actual SKU is provided.'}</div>
      </div>
    </div><Footer />
  </main>;
}

function CartSummary({ cart, updateQuantity, removeItem }: { cart: CartItem[]; updateQuantity: (id: string, amount: number) => void; removeItem: (id: string) => void }) {
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal >= 100 || !subtotal ? 0 : 12;
  return <div className="border border-[#dedede] bg-white p-5 sm:p-7">
    <div className="flex items-center justify-between border-b border-[#e8e8e8] pb-5"><h2 className="text-[22px] font-extrabold">Your cart</h2><span className="text-[12px] text-[#666]" data-testid="text-cart-item-count">{cart.reduce((sum, item) => sum + item.quantity, 0)} item(s)</span></div>
    {cart.length ? cart.map(item => <div key={item.id} className="flex gap-4 border-b border-[#e8e8e8] py-6" data-testid={`row-cart-item-${item.id}`}><PhotoCard small /><div className="min-w-0 flex-1"><div className="flex justify-between gap-3"><div><Link href="/product/roadview-4k-dual" className="text-[14px] font-bold hover:text-[#c92525]" data-testid={`link-cart-product-${item.id}`}>{item.name}</Link><p className="mt-1 text-[11px] text-[#777]">Sample listing</p></div><button type="button" onClick={() => removeItem(item.id)} className="self-start text-[#777] hover:text-[#c92525]" aria-label={`Remove ${item.name}`} data-testid={`button-remove-cart-item-${item.id}`}><Trash2 size={17} /></button></div><div className="mt-4 flex items-center justify-between gap-2"><div className="flex h-8 items-center border border-[#ddd]"><button type="button" onClick={() => updateQuantity(item.id, -1)} className="grid h-full w-8 place-items-center" aria-label="Decrease quantity" data-testid={`button-decrease-cart-item-${item.id}`}><Minus size={13} /></button><span className="w-7 text-center text-xs font-bold" data-testid={`text-cart-item-quantity-${item.id}`}>{item.quantity}</span><button type="button" onClick={() => updateQuantity(item.id, 1)} className="grid h-full w-8 place-items-center" aria-label="Increase quantity" data-testid={`button-increase-cart-item-${item.id}`}><Plus size={13} /></button></div><strong className="text-[14px]" data-testid={`text-cart-item-total-${item.id}`}>{money(item.price * item.quantity)}</strong></div></div></div>) : <div className="py-12 text-center" data-testid="text-empty-cart"><ShoppingBag className="mx-auto text-[#777]" size={33} /><h3 className="mt-4 text-[21px] font-bold">Your cart is empty</h3><p className="mt-2 text-[13px] text-[#666]">Explore our sample camera to get started.</p><Link href="/product/roadview-4k-dual" className="red-button mt-6" data-testid="link-empty-cart-shop">Shop RoadView</Link></div>}
    <div className="space-y-3 pt-6 text-[14px]"><div className="flex justify-between"><span className="text-[#666]">Subtotal</span><span data-testid="text-cart-subtotal">{money(subtotal)}</span></div><div className="flex justify-between"><span className="text-[#666]">Shipping</span><span data-testid="text-cart-shipping">{shipping ? money(shipping) : 'Free'}</span></div><div className="flex justify-between border-t border-[#ddd] pt-4 text-[18px] font-extrabold"><span>Total</span><span data-testid="text-cart-total">{money(subtotal + shipping)}</span></div></div>
  </div>;
}

function CheckoutPage({ cart, updateQuantity, removeItem, clearCart }: { cart: CartItem[]; updateQuantity: (id: string, amount: number) => void; removeItem: (id: string) => void; clearCart: () => void }) {
  const [card, setCard] = useState({ name: '', number: '', expiry: '', cvc: '' });
  const [cardType, setCardType] = useState<'credit' | 'debit'>('credit');
  const [submitted, setSubmitted] = useState(false);
  const useDemoCard = () => setCard({ name: 'Demo Driver', number: '4242 4242 4242 4242', expiry: '12/30', cvc: '123' });
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!cart.length || !card.name || !card.number || !card.expiry || !card.cvc) return;
    setCard({ name: '', number: '', expiry: '', cvc: '' });
    clearCart();
    setSubmitted(true);
  };
  if (submitted) return <><main className="min-h-[60dvh] bg-[#f7f7f7] py-20"><div className="container-store"><div className="mx-auto max-w-[600px] border border-[#ddd] bg-white p-8 text-center sm:p-12" data-testid="status-demo-success"><div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#c92525] text-white"><Check size={28} /></div><p className="mt-5 text-[12px] font-bold uppercase tracking-[.14em] text-[#c92525]">Simulated confirmation</p><h1 className="mt-3 text-[34px] font-extrabold tracking-[-.04em]">Demo order complete</h1><p className="mt-4 text-[14px] leading-7 text-[#666]">This was a simulated {cardType} card checkout. No payment was processed, and no card information was saved or sent.</p><Link href="/" className="red-button mt-7" data-testid="link-success-store">Continue shopping <ArrowRight size={17} /></Link></div></div></main><Footer /></>;
  return <main className="bg-[#f7f7f7] py-9 sm:py-14"><div className="container-store">
    <Link href="/" className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#666] hover:text-[#c92525]" data-testid="link-continue-shopping"><ChevronLeft size={15} /> Continue shopping</Link>
    <h1 className="mt-5 text-[35px] font-extrabold tracking-[-.04em] sm:text-[43px]">Cart &amp; checkout</h1>
    <p className="mt-2 text-[14px] text-[#666]">Review your kit and try the demo checkout.</p>
    <div className="mt-8 grid items-start gap-7 lg:grid-cols-[1fr_.85fr]">
      <CartSummary cart={cart} updateQuantity={updateQuantity} removeItem={removeItem} />
      <div className="border border-[#dedede] bg-white p-5 sm:p-7"><div className="flex items-center gap-2 border-b border-[#e8e8e8] pb-5"><CreditCard size={22} className="text-[#c92525]" /><h2 className="text-[22px] font-extrabold">Demo card checkout</h2></div>
        <div className="mt-5 border-l-4 border-[#c92525] bg-[#fff2f2] p-4 text-[13px] leading-6 text-[#4a2424]" data-testid="notice-demo-payment"><strong>Demo only — real card details cannot be entered.</strong><br />Choose credit or debit, then use the demo card button. No payment is processed, no network request is made, and card details are never stored.</div>
        <div className="mt-5 grid grid-cols-2 gap-2" aria-label="Simulated card type">
          {(['credit', 'debit'] as const).map(type => <button key={type} type="button" onClick={() => setCardType(type)} aria-pressed={cardType === type} className={`border px-4 py-3 text-[13px] font-bold capitalize ${cardType === type ? 'border-[#c92525] bg-[#fff2f2] text-[#a61c1c]' : 'border-[#ddd] bg-white text-[#555]'}`} data-testid={`button-card-type-${type}`}>{type} card</button>)}
        </div>
        <button type="button" onClick={useDemoCard} className="outline-button mt-5 w-full" data-testid="button-use-demo-card">Use demo card</button>
        <form onSubmit={submit} autoComplete="off" className="mt-6 space-y-4">
          <label className="block text-[12px] font-bold">Name on card<input required readOnly autoComplete="off" value={card.name} className="field-input mt-2" data-testid="input-card-name" /></label>
          <label className="block text-[12px] font-bold">Card number<input required readOnly autoComplete="off" value={card.number} className="field-input mt-2" data-testid="input-card-number" /></label>
          <div className="grid grid-cols-2 gap-3"><label className="block text-[12px] font-bold">Expiry<input required readOnly autoComplete="off" placeholder="MM/YY" value={card.expiry} className="field-input mt-2" data-testid="input-card-expiry" /></label><label className="block text-[12px] font-bold">CVC<input required readOnly autoComplete="off" value={card.cvc} className="field-input mt-2" data-testid="input-card-cvc" /></label></div>
          <button type="submit" disabled={!cart.length} className="red-button mt-2 w-full disabled:opacity-50" data-testid="button-submit-checkout">Simulate order <LockKeyhole size={16} /></button>
          <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-[#777]"><LockKeyhole size={13} /> Demo only · no real payment</p>
        </form>
      </div>
    </div>
  </div><Footer /></main>;
}

function Footer() {
  return <footer id="support" className="bg-[#252525] py-11 text-white"><div className="container-store grid gap-9 sm:grid-cols-[1.2fr_1fr_1fr]"><div><div className="text-[24px] font-extrabold tracking-[-.06em]">Drive<span className="text-[#e04444]">Guard</span></div><p className="mt-3 max-w-[320px] text-[13px] leading-6 text-[#bbb]">A focused storefront for drivers who want more clarity and less uncertainty on the road.</p></div><div><h2 className="text-[13px] font-bold">Explore</h2><div className="mt-3 grid gap-2 text-[13px] text-[#bbb]"><Link href="/" data-testid="link-footer-home" className="hover:text-white">Shop cameras</Link><Link href="/product/roadview-4k-dual" data-testid="link-footer-product" className="hover:text-white">RoadView sample listing</Link><Link href="/checkout" data-testid="link-footer-checkout" className="hover:text-white">Cart &amp; checkout</Link></div></div><div><h2 className="text-[13px] font-bold">Good to know</h2><p className="mt-3 text-[13px] leading-6 text-[#bbb]">This storefront currently displays a sample product. Product details and checkout are for demonstration.</p></div></div><div className="container-store mt-9 border-t border-[#555] pt-5 text-[11px] text-[#aaa]">© DriveGuard. An original sample storefront.</div></footer>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Store({ cart, add, updateQuantity, removeItem, clearCart }: { cart: CartItem[]; add: (quantity: number) => void; updateQuantity: (id: string, amount: number) => void; removeItem: (id: string) => void; clearCart: () => void }) {
  const [collection, setCollection] = useState<Collection>('all');
  const [location] = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [location]);
  return <div className="min-h-[100dvh] bg-white"><Header cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)} onCollection={setCollection} /><RoutedErrorBoundary><Switch><Route path="/"><HomePage collection={collection} onCollection={setCollection} /></Route><Route path="/product/roadview-4k-dual"><ProductPage onAdd={add} /></Route><Route path="/checkout"><CheckoutPage cart={cart} updateQuantity={updateQuantity} removeItem={removeItem} clearCart={clearCart} /></Route><Route component={NotFound} /></Switch></RoutedErrorBoundary></div>;
}

function App() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const add = (quantity: number) => setCart(items => {
    const found = items.find(item => item.id === PRODUCT.id);
    return found ? items.map(item => item.id === PRODUCT.id ? { ...item, quantity: item.quantity + quantity } : item) : [{ ...PRODUCT, quantity }];
  });
  const updateQuantity = (id: string, amount: number) => setCart(items => items.flatMap(item => item.id === id ? (item.quantity + amount > 0 ? [{ ...item, quantity: item.quantity + amount }] : []) : [item]));
  const removeItem = (id: string) => setCart(items => items.filter(item => item.id !== id));
  const clearCart = () => setCart([]);
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Store cart={cart} add={add} updateQuantity={updateQuantity} removeItem={removeItem} clearCart={clearCart} /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;