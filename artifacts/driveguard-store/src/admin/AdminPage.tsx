import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetAdminOverviewQueryKey,
  getGetAdminSettingsQueryKey,
  getGetStorefrontQueryKey,
  getListAdminDemoDraftsQueryKey,
  getListAdminOrdersQueryKey,
  getListAdminProductsQueryKey,
  useCreateAdminProduct,
  useDeleteAdminOrder,
  useDeleteAdminProduct,
  useGetAdminOverview,
  useGetAdminSettings,
  useListAdminDemoDrafts,
  useListAdminOrders,
  useListAdminProducts,
  useUpdateAdminOrder,
  useUpdateAdminProduct,
  useUpdateAdminSettings,
} from '@workspace/api-client-react';
import type { DemoCheckoutDraft, DemoOrder, Product, ProductInput, StoreSettingsInput } from '@workspace/api-client-react';
import {
  ArrowDownRight, ArrowRight, Boxes, ChevronDown, ChevronRight,
  CircleAlert, ClipboardList, Eye, EyeOff, ImageOff, LayoutDashboard,
  Package, Pencil, Plus, RefreshCw, Search, Settings2, ShieldCheck,
  ShoppingBag, Trash2, X,
} from 'lucide-react';
import './AdminPage.css';

type Section = 'overview' | 'products' | 'orders' | 'settings';
type ProductDraft = Omit<ProductInput, 'priceCents' | 'stock'> & { price: string; stock: string };
type SettingsDraft = Omit<StoreSettingsInput, 'shippingThresholdCents' | 'shippingCents'> & { shippingThreshold: string; shipping: string };
type Deletion = { kind: 'product' | 'order'; id: number; name: string };
type Notice = { type: 'success' | 'error'; text: string };

const money = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
const toCents = (value: string) => Math.round(Number(value) * 100);
const dollars = (cents: number) => (cents / 100).toFixed(2);
const date = (value: string) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Something went wrong. Please try again.';
const blankProduct = (): ProductDraft => ({ name: '', slug: '', description: '', imageUrl: '', price: '', stock: '0', category: 'front', featured: false, active: true });
const productDraft = (product: Product): ProductDraft => ({
  name: product.name, slug: product.slug, description: product.description, imageUrl: product.imageUrl,
  price: dollars(product.priceCents), stock: String(product.stock), category: product.category,
  featured: product.featured, active: product.active,
});
const settingsDraft = (settings: StoreSettingsInput): SettingsDraft => ({
  brandName: settings.brandName, announcement: settings.announcement, heroTitle: settings.heroTitle,
  heroDescription: settings.heroDescription, heroImageUrl: settings.heroImageUrl,
  trustTitle: settings.trustTitle, trustDescription: settings.trustDescription,
  shippingThreshold: dollars(settings.shippingThresholdCents), shipping: dollars(settings.shippingCents),
  supportEmail: settings.supportEmail,
});
const orderLabel = (order: DemoOrder) => order.items.map(item => `${item.name} × ${item.quantity}`).join(', ');

function Field({ label, name, value, onChange, type = 'text', placeholder, required, maxLength, hint, min, step }: {
  label: string; name: string; value: string; onChange: (value: string) => void; type?: string;
  placeholder?: string; required?: boolean; maxLength?: number; hint?: string; min?: string; step?: string;
}) {
  return <label className="dg-field">{label}
    <input name={name} data-testid={`input-admin-${name}`} type={type} value={value} required={required} maxLength={maxLength}
      min={min} step={step} placeholder={placeholder} onChange={event => onChange(event.target.value)} />
    {hint && <small>{hint}</small>}
  </label>;
}

function MoneyField({ label, name, value, onChange, max }: { label: string; name: string; value: string; onChange: (value: string) => void; max?: number }) {
  return <label className="dg-field">{label}<span className="dg-money-field"><span>$</span>
    <input name={name} data-testid={`input-admin-${name}`} type="number" min="0" max={max} step="0.01" required value={value} onChange={event => onChange(event.target.value)} />
  </span></label>;
}

function Switch({ checked, onChange, label, detail, id, disabled }: { checked: boolean; onChange: () => void; label: string; detail: string; id: string; disabled?: boolean }) {
  return <div className="dg-switch-line"><div><strong>{label}</strong><small>{detail}</small></div>
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled}
      onClick={onChange} className="dg-switch" data-testid={`switch-admin-${id}`} /></div>;
}

function ProductImage({ url, name }: { url: string; name: string }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [url]);
  return <span className="dg-thumb">{url && !broken ? <img src={url} alt="" onError={() => setBroken(true)} /> : <ImageOff size={18} aria-label={`No image for ${name}`} />}</span>;
}

function ProductEditor({ product, onClose, onSave, pending }: {
  product: Product | null; onClose: () => void; onSave: (draft: ProductInput) => Promise<void>; pending: boolean;
}) {
  const [draft, setDraft] = useState<ProductDraft>(() => product ? productDraft(product) : blankProduct());
  const [error, setError] = useState('');
  const set = <K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) => setDraft(previous => ({ ...previous, [key]: value }));
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    const stock = Number(draft.stock);
    if (!Number.isInteger(stock) || stock < 0) { setError('Stock must be a whole number of zero or more.'); return; }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.slug)) { setError('Slug must use lowercase letters, numbers and hyphens.'); return; }
    try {
      await onSave({
        name: draft.name.trim(), slug: draft.slug.trim(), description: draft.description.trim(),
        imageUrl: draft.imageUrl.trim(), priceCents: toCents(draft.price), stock,
        category: draft.category, featured: draft.featured, active: draft.active,
      });
    } catch (reason) { setError(errorMessage(reason)); }
  };
  return <div className="dg-overlay" onMouseDown={event => { if (event.target === event.currentTarget && !pending) onClose(); }}>
    <aside className="dg-drawer" role="dialog" aria-modal="true" aria-labelledby="dg-product-editor-title">
      <div className="dg-drawer-head"><div><p className="dg-eyebrow">Catalog / {product ? 'Edit listing' : 'New listing'}</p><h2 id="dg-product-editor-title">{product ? 'Edit product' : 'Add a product'}</h2><p>{product ? 'Update the details customers see in the store.' : 'Create a new camera listing for the catalog.'}</p></div>
        <button type="button" className="dg-icon-button" aria-label="Close editor" data-testid="button-admin-close-product" onClick={onClose} disabled={pending}><X size={19} /></button>
      </div>
      <form className="dg-drawer-form" onSubmit={submit}>
        {error && <div className="dg-notice" role="alert" data-testid="status-admin-product-error">{error}<button type="button" aria-label="Dismiss error" onClick={() => setError('')}><X size={14} /></button></div>}
        <div className="dg-fields">
          <Field label="Product name" name="product-name" value={draft.name} onChange={value => set('name', value)} required maxLength={150} placeholder="e.g. RoadView 4K Dual" />
          <Field label="URL slug" name="product-slug" value={draft.slug} onChange={value => set('slug', value.toLowerCase().replace(/\s+/g, '-'))} required maxLength={100} placeholder="roadview-4k-dual" hint="Lowercase letters, numbers and hyphens only." />
          <label className="dg-field">Description<textarea name="description" data-testid="input-admin-product-description" value={draft.description} maxLength={3000} onChange={event => set('description', event.target.value)} placeholder="Tell customers what makes this camera useful." /></label>
          <Field label="Image URL" name="product-image" value={draft.imageUrl} onChange={value => set('imageUrl', value)} maxLength={2048} placeholder="https://..." type="url" hint="Use a direct image link. Leave blank if photography is not ready." />
        </div>
        <div className="dg-fields two">
          <MoneyField label="Price" name="product-price" value={draft.price} onChange={value => set('price', value)} max={1000000} />
          <Field label="Units in stock" name="product-stock" value={draft.stock} onChange={value => set('stock', value)} type="number" required min="0" step="1" />
        </div>
        <label className="dg-field">Category
          <select name="category" data-testid="select-admin-product-category" value={draft.category} onChange={event => set('category', event.target.value as ProductInput['category'])}>
            <option value="front">Front camera</option><option value="dual">Dual-channel camera</option>
          </select>
        </label>
        <div>
          <Switch id="product-active" label="Visible in store" detail="Hidden products are not shown to shoppers." checked={draft.active} onChange={() => set('active', !draft.active)} />
          <Switch id="product-featured" label="Featured product" detail="Give this camera priority in featured placements." checked={draft.featured} onChange={() => set('featured', !draft.featured)} />
        </div>
        <div className="dg-form-footer"><button type="button" className="dg-secondary" onClick={onClose} disabled={pending} data-testid="button-admin-cancel-product">Cancel</button>
          <button type="submit" className="dg-primary" disabled={pending} data-testid="button-admin-save-product">{pending ? 'Saving…' : product ? 'Save changes' : 'Create product'} <ArrowRight size={15} /></button></div>
      </form>
    </aside>
  </div>;
}

function SettingsEditor({ initial, onSave, pending }: { initial: StoreSettingsInput; onSave: (data: StoreSettingsInput) => Promise<void>; pending: boolean }) {
  const [draft, setDraft] = useState<SettingsDraft>(() => settingsDraft(initial));
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const set = <K extends keyof SettingsDraft>(key: K, value: SettingsDraft[K]) => { setDraft(previous => ({ ...previous, [key]: value })); setSaved(false); };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError('');
    try {
      await onSave({
        brandName: draft.brandName.trim(), announcement: draft.announcement.trim(),
        heroTitle: draft.heroTitle.trim(), heroDescription: draft.heroDescription.trim(),
        heroImageUrl: draft.heroImageUrl.trim(), trustTitle: draft.trustTitle.trim(),
        trustDescription: draft.trustDescription.trim(), shippingThresholdCents: toCents(draft.shippingThreshold),
        shippingCents: toCents(draft.shipping), supportEmail: draft.supportEmail.trim(),
      });
      setSaved(true);
    } catch (reason) { setError(errorMessage(reason)); }
  };
  return <form onSubmit={submit} className="dg-settings">
    <div className="dg-settings-stack">
      {error && <div className="dg-notice" role="alert" data-testid="status-admin-settings-error">{error}<button type="button" aria-label="Dismiss error" onClick={() => setError('')}><X size={14} /></button></div>}
      <section className="dg-panel dg-form-section"><h2>Brand & announcement</h2><p>The name and message customers see first.</p>
        <div className="dg-fields"><Field label="Store name" name="brand-name" value={draft.brandName} onChange={value => set('brandName', value)} required maxLength={80} />
          <Field label="Announcement bar" name="announcement" value={draft.announcement} onChange={value => set('announcement', value)} maxLength={180} placeholder="A short message above the storefront" />
        </div>
      </section>
      <section className="dg-panel dg-form-section"><h2>Homepage story</h2><p>The hero and reassurance copy that introduce your collection.</p>
        <div className="dg-fields">
          <Field label="Hero headline" name="hero-title" value={draft.heroTitle} onChange={value => set('heroTitle', value)} required maxLength={130} />
          <label className="dg-field">Hero description<textarea name="hero-description" data-testid="input-admin-hero-description" maxLength={500} value={draft.heroDescription} onChange={event => set('heroDescription', event.target.value)} /></label>
          <Field label="Hero image URL" name="hero-image" value={draft.heroImageUrl} onChange={value => set('heroImageUrl', value)} maxLength={2048} type="url" placeholder="https://..." />
          <Field label="Trust section title" name="trust-title" value={draft.trustTitle} onChange={value => set('trustTitle', value)} maxLength={130} />
          <label className="dg-field">Trust section description<textarea name="trust-description" data-testid="input-admin-trust-description" maxLength={500} value={draft.trustDescription} onChange={event => set('trustDescription', event.target.value)} /></label>
        </div>
      </section>
      <section className="dg-panel dg-form-section"><h2>Shipping & support</h2><p>Amounts are in US dollars. Free shipping starts at the threshold.</p>
        <div className="dg-fields two">
          <MoneyField label="Free shipping from" name="shipping-threshold" value={draft.shippingThreshold} onChange={value => set('shippingThreshold', value)} max={1000000} />
          <MoneyField label="Standard shipping" name="shipping-cost" value={draft.shipping} onChange={value => set('shipping', value)} max={100000} />
        </div>
        <div style={{ marginTop: 16 }}><Field label="Support email" name="support-email" value={draft.supportEmail} onChange={value => set('supportEmail', value)} type="email" maxLength={254} placeholder="help@yourstore.com" /></div>
      </section>
      <div className="dg-form-footer"><span data-testid="status-admin-settings-saved">{saved ? 'Changes saved.' : 'Review your changes before saving.'}</span><button className="dg-primary" type="submit" disabled={pending} data-testid="button-admin-save-settings">{pending ? 'Saving…' : 'Save store settings'} <ArrowRight size={15} /></button></div>
    </div>
    <aside className="dg-settings-stack">
      <div className="dg-panel dg-preview"><div className="dg-preview-label">Hero copy preview</div><div className="dg-preview-image">
        {draft.heroImageUrl && <img src={draft.heroImageUrl} alt="" />}
        <div className="dg-preview-copy"><strong>{draft.heroTitle || 'Your headline goes here'}</strong><p>{draft.heroDescription || 'Add a description to see a preview.'}</p></div>
      </div><p className="dg-preview-note">Copy preview only. Save to update store data.</p></div>
      <div className="dg-panel dg-form-section"><h2>Shipping at a glance</h2><p>Based on the values in this form.</p>
        <div className="dg-watch-row"><span>Standard delivery</span><strong>{money(toCents(draft.shipping) || 0)}</strong></div>
        <div className="dg-watch-row"><span>Free delivery from</span><strong>{money(toCents(draft.shippingThreshold) || 0)}</strong></div>
      </div>
    </aside>
  </form>;
}

function LiveDrafts({ drafts, loading, error }: { drafts: DemoCheckoutDraft[]; loading: boolean; error: boolean }) {
  return <section className="dg-panel dg-live-drafts" data-testid="panel-admin-live-drafts">
    <div className="dg-panel-head"><div><h2>Live demo checkouts <span className="dg-live-dot" aria-hidden="true" /></h2><p>Updates as shoppers finish each field. Only a demo name and field progress are received.</p></div><span className="dg-subtle">{drafts.length} active</span></div>
    {error ? <div className="dg-draft-empty" role="alert">Could not load live checkouts. They will retry automatically.</div>
      : loading && !drafts.length ? <div className="dg-draft-empty">Checking for active demos…</div>
      : drafts.length ? <div className="dg-draft-grid">{drafts.map(draft => <div className="dg-draft-card" key={draft.id} data-testid={`card-admin-draft-${draft.id}`}>
        <div className="dg-draft-card-head"><strong>{draft.displayName || 'Demo shopper'}</strong><span>{draft.cardType} demo · {new Date(draft.updatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span></div>
        <div className="dg-draft-fields">
          <span className={draft.completedFields.includes('name') ? 'complete' : ''}>Name: {draft.completedFields.includes('name') ? draft.displayName : 'waiting'}</span>
          <span className={draft.completedFields.includes('number') ? 'complete' : ''}>Demo number: {draft.completedFields.includes('number') ? 'preset entered' : 'waiting'}</span>
          <span className={draft.completedFields.includes('expiry') ? 'complete' : ''}>Demo expiry: {draft.completedFields.includes('expiry') ? '12/30' : 'waiting'}</span>
          <span className={draft.completedFields.includes('cvc') ? 'complete' : ''}>Demo CVC: {draft.completedFields.includes('cvc') ? 'completed (not stored)' : 'waiting'}</span>
        </div>
      </div>)}</div> : <div className="dg-draft-empty">No active demo checkouts. A shopper’s progress will appear here after leaving the first field.</div>}
  </section>;
}

export default function AdminPage() {
  const queryClient = useQueryClient();
  const [section, setSection] = useState<Section>('overview');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [editor, setEditor] = useState<Product | null | undefined>(undefined);
  const [deletion, setDeletion] = useState<Deletion | null>(null);
  const [search, setSearch] = useState('');
  const [productFilter, setProductFilter] = useState<'all' | 'live' | 'hidden'>('all');
  const [orderFilter, setOrderFilter] = useState<'all' | 'new' | 'fulfilled' | 'cancelled'>('all');
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const overview = useGetAdminOverview({ query: { queryKey: getGetAdminOverviewQueryKey(), refetchInterval: 3000 } });
  const products = useListAdminProducts();
  const orders = useListAdminOrders({ query: { queryKey: getListAdminOrdersQueryKey(), refetchInterval: 2000 } });
  const drafts = useListAdminDemoDrafts({ query: { queryKey: getListAdminDemoDraftsQueryKey(), refetchInterval: 1500, refetchOnWindowFocus: 'always' } });
  const settings = useGetAdminSettings();
  const createProduct = useCreateAdminProduct();
  const updateProduct = useUpdateAdminProduct();
  const deleteProduct = useDeleteAdminProduct();
  const updateOrder = useUpdateAdminOrder();
  const deleteOrder = useDeleteAdminOrder();
  const updateSettings = useUpdateAdminSettings();
  const refreshing = overview.isFetching || products.isFetching || orders.isFetching || settings.isFetching;
  const invalidate = async (resource: 'products' | 'orders' | 'settings') => {
    const keys: (readonly string[])[] = [getGetAdminOverviewQueryKey(), getGetStorefrontQueryKey()];
    if (resource === 'products') keys.push(getListAdminProductsQueryKey());
    if (resource === 'orders') keys.push(getListAdminOrdersQueryKey());
    if (resource === 'settings') keys.push(getGetAdminSettingsQueryKey());
    await Promise.all(keys.map(queryKey => queryClient.invalidateQueries({ queryKey })));
  };
  const refresh = () => Promise.all([
    overview.refetch(), products.refetch(), orders.refetch(), drafts.refetch(), settings.refetch(),
  ]);
  const saveProduct = async (data: ProductInput) => {
    if (editor) await updateProduct.mutateAsync({ id: editor.id, data });
    else await createProduct.mutateAsync({ data });
    setEditor(undefined);
    setNotice({ type: 'success', text: editor ? 'Product updated.' : 'Product created.' });
    await invalidate('products');
  };
  const toggleProduct = async (product: Product, field: 'active' | 'featured') => {
    try {
      await updateProduct.mutateAsync({ id: product.id, data: { [field]: !product[field] } });
      setNotice({ type: 'success', text: `${product.name} ${field === 'active' ? (product.active ? 'hidden from the store' : 'made visible') : (product.featured ? 'removed from featured' : 'marked as featured')}.` });
      await invalidate('products');
    } catch (error) { setNotice({ type: 'error', text: errorMessage(error) }); }
  };
  const changeOrderStatus = async (id: number, status: DemoOrder['status']) => {
    try {
      await updateOrder.mutateAsync({ id, data: { status } });
      setNotice({ type: 'success', text: `Order #${id} marked ${status}.` });
      await invalidate('orders');
    } catch (error) { setNotice({ type: 'error', text: errorMessage(error) }); }
  };
  const confirmDelete = async () => {
    if (!deletion) return;
    try {
      if (deletion.kind === 'product') { await deleteProduct.mutateAsync({ id: deletion.id }); await invalidate('products'); }
      else { await deleteOrder.mutateAsync({ id: deletion.id }); await invalidate('orders'); }
      setNotice({ type: 'success', text: `${deletion.kind === 'product' ? 'Product' : 'Order'} deleted.` });
      setDeletion(null);
    } catch (error) { setNotice({ type: 'error', text: errorMessage(error) }); setDeletion(null); }
  };
  const visibleProducts = useMemo(() => (products.data ?? []).filter(product =>
    (productFilter === 'all' || (productFilter === 'live' ? product.active : !product.active)) &&
    `${product.name} ${product.slug} ${product.category}`.toLowerCase().includes(search.toLowerCase().trim())
  ), [products.data, productFilter, search]);
  const visibleOrders = useMemo(() => (orders.data ?? []).filter(order => orderFilter === 'all' || order.status === orderFilter), [orders.data, orderFilter]);
  const newOrders = (orders.data ?? []).filter(order => order.status === 'new').length;
  const lowStock = (products.data ?? []).filter(product => product.active && product.stock < 5).length;
  const pageTitle = { overview: 'Overview', products: 'Products', orders: 'Orders', settings: 'Store settings' }[section];
  const pageSub = {
    overview: 'A clear view of what is happening in your store.',
    products: 'Manage the cameras, prices, and availability shoppers see.',
    orders: 'Track and manage simulated checkout activity.',
    settings: 'Shape the storefront experience and shipping details.',
  }[section];
  const pendingDelete = deleteProduct.isPending || deleteOrder.isPending;
  const failure = section === 'overview' ? overview.isError : section === 'products' ? products.isError : section === 'orders' ? orders.isError : settings.isError;
  const loading = section === 'overview' ? overview.isLoading : section === 'products' ? products.isLoading : section === 'orders' ? orders.isLoading : settings.isLoading;

  return <div className="dg-admin" data-testid="page-admin">
    <aside className="dg-sidebar">
      <div className="dg-brand"><span className="dg-brand-mark"><ShieldCheck size={22} strokeWidth={2.2} /></span><span>Drive<b>Guard</b></span></div>
      <div className="dg-sidebar-label">Workspace</div>
      <nav className="dg-nav" aria-label="Admin sections">
        {([
          ['overview', LayoutDashboard, 'Overview'],
          ['products', Boxes, 'Products'],
          ['orders', ShoppingBag, 'Orders'],
          ['settings', Settings2, 'Store settings'],
        ] as const).map(([key, Icon, label]) =>
          <button key={key} type="button" aria-current={section === key ? 'page' : undefined} onClick={() => { setSection(key); setNotice(null); }}
            data-testid={`button-admin-nav-${key}`}><Icon size={17} strokeWidth={1.8} />{label}{key === 'orders' && newOrders > 0 && <span>{newOrders}</span>}</button>
        )}
      </nav>
      <div className="dg-sidebar-bottom"><strong>Store control</strong>Changes to catalog and settings are saved to your store data. Orders here are simulated.</div>
    </aside>
    <main className="dg-main">
      <header className="dg-topbar"><div className="dg-breadcrumb"><span>Store admin</span><ChevronRight size={13} /><strong>{pageTitle}</strong></div>
        <div className="dg-top-right"><span className="dg-live-dot" /> Management workspace <span className="dg-avatar">DG</span></div>
      </header>
      <div className="dg-content">
        <div className="dg-page-heading"><div><p className="dg-eyebrow">DriveGuard / Management</p><h1>{pageTitle}</h1><p>{pageSub}</p></div>
          {section === 'products' ? <button className="dg-primary" type="button" onClick={() => setEditor(null)} data-testid="button-admin-add-product"><Plus size={16} /> Add product</button>
            : section === 'overview' ? <button type="button" className="dg-secondary" onClick={() => { setNotice(null); void refresh(); }} disabled={refreshing} data-testid="button-admin-refresh"><RefreshCw size={15} /> {refreshing ? 'Refreshing…' : 'Refresh data'}</button> : null}
        </div>
        {notice && <div className={`dg-notice ${notice.type === 'success' ? 'success' : ''}`} role={notice.type === 'error' ? 'alert' : 'status'} data-testid="status-admin-notice"><span>{notice.text}</span><button type="button" onClick={() => setNotice(null)} aria-label="Dismiss message" data-testid="button-admin-dismiss-notice"><X size={15} /></button></div>}
        {loading ? <div className="dg-panel" style={{ padding: 25 }} aria-label="Loading admin data" data-testid="status-admin-loading"><div className="dg-skeleton" style={{ width: '30%', height: 25, marginBottom: 25 }} /><div className="dg-skeleton" style={{ height: 64, marginBottom: 12 }} /><div className="dg-skeleton" style={{ height: 64, marginBottom: 12 }} /><div className="dg-skeleton" style={{ height: 64 }} /></div>
          : failure ? <div className="dg-panel dg-empty" role="alert" data-testid="status-admin-load-error"><CircleAlert size={28} /><strong>We couldn't load {pageTitle.toLowerCase()}.</strong><p>Check your connection and try again. Your changes have not been lost.</p><button type="button" className="dg-secondary" onClick={() => { void refresh(); }} data-testid="button-admin-retry"><RefreshCw size={14} /> Try again</button></div>
          : section === 'overview' ? <>
            <LiveDrafts drafts={drafts.data ?? []} loading={drafts.isPending} error={drafts.isError} />
            <div className="dg-metrics">
              {([
                ['Total products', overview.data?.productCount ?? 0, 'Listings in the catalog', Package],
                ['Visible products', overview.data?.activeProductCount ?? 0, 'Currently shown to shoppers', Eye],
                ['Demo orders', overview.data?.totalOrders ?? 0, 'Simulated checkouts', ClipboardList],
                ['Demo revenue', money(overview.data?.simulatedRevenueCents ?? 0), 'No real payments collected', ArrowDownRight],
              ] as const).map(([label, value, foot, Icon]) => <div className="dg-metric" key={label}><div className="dg-metric-top"><span>{label}</span><Icon size={17} /></div><div><div className="dg-metric-value" data-testid={`text-admin-metric-${label.toLowerCase().replaceAll(' ', '-')}`}>{value}</div><div className="dg-metric-foot">{foot}</div></div></div>)}
            </div>
            <div className="dg-overview-grid">
              <section className="dg-panel"><div className="dg-panel-head"><div><h2>Recent demo orders</h2><p>The latest simulated purchases placed in your store.</p></div><button type="button" className="dg-quiet" onClick={() => setSection('orders')} data-testid="button-admin-view-orders">View all <ArrowRight size={14} /></button></div>
                {(orders.data ?? []).length ? <div className="dg-activity">{[...(orders.data ?? [])].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0,5).map(order =>
                  <div className="dg-activity-row" key={order.id}><span className="dg-activity-icon"><ShoppingBag size={16} /></span><div className="dg-activity-copy"><strong>Order #{order.id} · {orderLabel(order)}</strong><span>{date(order.createdAt)} · {order.status}</span></div><span className="dg-activity-amount">{money(order.totalCents)}</span></div>
                )}</div> : <div className="dg-empty"><ShoppingBag size={25} /><strong>No demo orders yet</strong><p>Simulated checkout activity will appear here when shoppers place an order.</p></div>}
              </section>
              <div className="dg-panel dg-watch"><h2>Needs your attention</h2>
                <div className="dg-watch-row"><span>New demo orders</span><strong>{newOrders}</strong></div>
                <div className="dg-watch-row"><span>Visible products low on stock</span><strong>{lowStock}</strong></div>
                <div className="dg-watch-row"><span>Hidden products</span><strong>{(products.data ?? []).filter(product => !product.active).length}</strong></div>
                <div className="dg-watch-note">Stock warning applies to visible listings with fewer than five units remaining.</div>
                <button type="button" className="dg-secondary" style={{ marginTop: 17, width: '100%' }} onClick={() => setSection('products')} data-testid="button-admin-manage-catalog">Manage catalog <ArrowRight size={14} /></button>
              </div>
            </div>
          </> : section === 'products' ? <>
            <div className="dg-toolbar"><div className="dg-search"><Search size={16} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search products or slug" aria-label="Search products" data-testid="input-admin-search-products" /></div>
              <div className="dg-filter" aria-label="Filter products">{(['all', 'live', 'hidden'] as const).map(value => <button type="button" key={value} aria-pressed={productFilter === value} onClick={() => setProductFilter(value)} data-testid={`button-admin-filter-${value}`}>{value === 'all' ? 'All products' : value === 'live' ? 'Visible' : 'Hidden'}</button>)}</div>
            </div>
            <section className="dg-panel"><div className="dg-panel-head"><div><h2>Product catalog</h2><p>Edit listings, stock, prices and visibility from one place.</p></div><span className="dg-subtle">{visibleProducts.length} of {(products.data ?? []).length}</span></div>
              {visibleProducts.length ? <div className="dg-table-wrap"><table className="dg-table"><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Visibility</th><th>Featured</th><th style={{ textAlign:'right' }}>Actions</th></tr></thead><tbody>
                {visibleProducts.map(product => <tr key={product.id} data-testid={`row-admin-product-${product.id}`}>
                  <td><div className="dg-product-cell"><ProductImage url={product.imageUrl} name={product.name} /><div><strong>{product.name}</strong><small>/{product.slug}</small></div></div></td>
                  <td>{product.category === 'dual' ? 'Dual-channel' : 'Front camera'}</td><td className="dg-mono">{money(product.priceCents)}</td>
                  <td className={product.stock < 5 ? 'dg-stock-low' : ''}>{product.stock} {product.stock < 5 ? '· Low' : ''}</td>
                  <td><span className={`dg-badge ${product.active ? 'live' : 'hidden'}`}>{product.active ? 'Visible' : 'Hidden'}</span></td>
                  <td><button type="button" className="dg-quiet" aria-label={`${product.featured ? 'Remove featured from' : 'Feature'} ${product.name}`} disabled={updateProduct.isPending} onClick={() => void toggleProduct(product, 'featured')} data-testid={`button-admin-feature-${product.id}`}>{product.featured ? 'Featured' : '—'}</button></td>
                  <td><div className="dg-row-actions"><button type="button" className="dg-icon-button" title={product.active ? 'Hide product' : 'Show product'} aria-label={`${product.active ? 'Hide' : 'Show'} ${product.name}`} disabled={updateProduct.isPending} onClick={() => void toggleProduct(product, 'active')} data-testid={`button-admin-visibility-${product.id}`}>{product.active ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                    <button type="button" className="dg-icon-button" title="Edit product" aria-label={`Edit ${product.name}`} onClick={() => setEditor(product)} data-testid={`button-admin-edit-product-${product.id}`}><Pencil size={16} /></button>
                    <button type="button" className="dg-icon-button dg-icon-danger" title="Delete product" aria-label={`Delete ${product.name}`} onClick={() => setDeletion({ kind:'product', id: product.id, name: product.name })} data-testid={`button-admin-delete-product-${product.id}`}><Trash2 size={16} /></button></div></td>
                </tr>)}
              </tbody></table></div> : <div className="dg-empty"><Boxes size={29} /><strong>{(products.data ?? []).length ? 'No matching products' : 'Your catalog is ready for its first product'}</strong><p>{(products.data ?? []).length ? 'Try a different search or visibility filter.' : 'Add a camera with its price, stock and imagery to get started.'}</p>{!(products.data ?? []).length && <button type="button" className="dg-primary" onClick={() => setEditor(null)} data-testid="button-admin-add-first-product"><Plus size={15} /> Add product</button>}</div>}
              <div className="dg-count">Showing {visibleProducts.length} product{visibleProducts.length === 1 ? '' : 's'}</div>
            </section>
          </> : section === 'orders' ? <>
            <LiveDrafts drafts={drafts.data ?? []} loading={drafts.isPending} error={drafts.isError} />
            <div className="dg-toolbar"><div className="dg-filter" aria-label="Filter orders">{(['all', 'new', 'fulfilled', 'cancelled'] as const).map(value => <button type="button" key={value} aria-pressed={orderFilter === value} onClick={() => setOrderFilter(value)} data-testid={`button-admin-order-filter-${value}`}>{value === 'all' ? 'All orders' : value.charAt(0).toUpperCase() + value.slice(1)}</button>)}</div></div>
            <section className="dg-panel"><div className="dg-panel-head"><div><h2>Simulated orders</h2><p>These are demo transactions. No actual payment is processed.</p></div><span className="dg-subtle">{visibleOrders.length} orders</span></div>
              {visibleOrders.length ? <div className="dg-table-wrap"><table className="dg-table"><thead><tr><th>Order</th><th>Date</th><th>Items</th><th>Payment type</th><th>Total</th><th>Status</th><th style={{ textAlign:'right' }}>Actions</th></tr></thead><tbody>
                {[...visibleOrders].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(order => <tr key={order.id} data-testid={`row-admin-order-${order.id}`}>
                  <td><button type="button" className="dg-quiet dg-mono" onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)} aria-expanded={expandedOrder === order.id} data-testid={`button-admin-expand-order-${order.id}`}>#{order.id} <ChevronDown size={13} /></button></td>
                  <td className="dg-mono">{date(order.createdAt)}</td>
                  <td><span title={orderLabel(order)}>{order.items.reduce((sum,item) => sum + item.quantity,0)} item{order.items.reduce((sum,item) => sum + item.quantity,0) === 1 ? '' : 's'}</span></td>
                  <td style={{ textTransform:'capitalize' }}>{order.cardType} · demo</td><td className="dg-mono">{money(order.totalCents)}</td>
                  <td><select className="dg-status-select" aria-label={`Status for order ${order.id}`} value={order.status} disabled={updateOrder.isPending} onChange={event => void changeOrderStatus(order.id, event.target.value as DemoOrder['status'])} data-testid={`select-admin-order-status-${order.id}`}><option value="new">New</option><option value="fulfilled">Fulfilled</option><option value="cancelled">Cancelled</option></select></td>
                  <td><div className="dg-row-actions"><button type="button" className="dg-icon-button dg-icon-danger" title="Delete order" aria-label={`Delete order ${order.id}`} onClick={() => setDeletion({ kind:'order', id:order.id, name:`Order #${order.id}` })} data-testid={`button-admin-delete-order-${order.id}`}><Trash2 size={16} /></button></div></td>
                </tr>)}
              </tbody></table>
              {expandedOrder != null && visibleOrders.some(order => order.id === expandedOrder) && (() => { const order = visibleOrders.find(item => item.id === expandedOrder)!; return <div className="dg-order-detail" data-testid={`panel-admin-order-${order.id}`}><div className="dg-order-detail-grid"><div><h4>Items in order #{order.id}</h4>{order.items.map((item,index) => <p key={`${item.productId}-${index}`}><span>{item.name} × {item.quantity}</span><strong>{money(item.unitPriceCents * item.quantity)}</strong></p>)}</div><div><h4>Order summary</h4><p><span>Subtotal</span><strong>{money(order.subtotalCents)}</strong></p><p><span>Shipping</span><strong>{money(order.shippingCents)}</strong></p><p><span>Total</span><strong>{money(order.totalCents)}</strong></p></div></div></div>; })()}
              </div> : <div className="dg-empty"><ClipboardList size={29} /><strong>{(orders.data ?? []).length ? 'No orders in this status' : 'No demo orders yet'}</strong><p>{(orders.data ?? []).length ? 'Choose another status filter to see more orders.' : 'Simulated purchases will appear here after a demo checkout.'}</p></div>}
              <div className="dg-count">Showing {visibleOrders.length} of {(orders.data ?? []).length} demo orders</div>
            </section>
          </> : settings.data ? <SettingsEditor initial={settings.data} pending={updateSettings.isPending} onSave={async data => { await updateSettings.mutateAsync({ data }); await invalidate('settings'); }} /> : null}
      </div>
    </main>
    {editor !== undefined && <ProductEditor product={editor} onClose={() => setEditor(undefined)} onSave={saveProduct} pending={createProduct.isPending || updateProduct.isPending} />}
    {deletion && <div className="dg-overlay dg-modal-overlay" onMouseDown={event => { if (event.target === event.currentTarget && !pendingDelete) setDeletion(null); }}><div className="dg-confirm" role="alertdialog" aria-modal="true" aria-labelledby="dg-delete-title" aria-describedby="dg-delete-description">
      <span className="dg-confirm-icon"><Trash2 size={19} /></span><h2 id="dg-delete-title">Delete {deletion.kind}?</h2>
      <p id="dg-delete-description">You’re about to permanently delete <strong>{deletion.name}</strong>. This cannot be undone.</p>
      <div className="dg-confirm-actions"><button type="button" className="dg-secondary" onClick={() => setDeletion(null)} disabled={pendingDelete} data-testid="button-admin-cancel-delete">Keep {deletion.kind}</button><button type="button" className="dg-danger" onClick={() => void confirmDelete()} disabled={pendingDelete} data-testid="button-admin-confirm-delete">{pendingDelete ? 'Deleting…' : 'Delete permanently'}</button></div>
    </div></div>}
  </div>;
}