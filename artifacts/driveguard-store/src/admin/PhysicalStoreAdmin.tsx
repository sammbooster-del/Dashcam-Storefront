import { type ChangeEvent, type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetShopAdminQueryKey,
  useCreateAdminProductImageUploadUrl,
  useCreateShopCategory,
  useCreateShopProduct,
  useDeleteShopCategory,
  useDeleteShopDomain,
  useDeleteShopProduct,
  useGetShopAdmin,
  useSaveShopDomain,
  useSaveShopSettings,
  useUpdateShopCategory,
  useUpdateShopOrder,
  useUpdateShopProduct,
} from '@workspace/api-client-react';
import type {
  ShopAdmin, ShopAdminOrder, ShopCategory, ShopCategoryInput, ShopDomainInput, ShopOrder, ShopOrderUpdate, ShopProduct, ShopProductInput, ShopSettings, ShopVariantInput,
} from '@workspace/api-client-react';
import './PhysicalStoreAdmin.css';

type Tab = 'overview' | 'settings' | 'categories' | 'products' | 'orders' | 'domains';
const TABS: [Tab, string][] = [['overview', 'Overview'], ['settings', 'Settings'], ['categories', 'Categories'], ['products', 'Products'], ['orders', 'Orders'], ['domains', 'Domains']];
const money = (c: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(c / 100);
const toCents = (v: string) => Math.round(Number(v) * 100);
const dollars = (c: number) => (c / 100).toFixed(2);
const errText = (e: unknown) => e instanceof Error && e.message ? e.message : 'Something went wrong. Please try again.';
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100);
const show = (u: string) => (u.startsWith('/objects/') ? `/api/storage${u}` : u);
const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_BYTES = 10 * 1024 * 1024;
const label = (s: string) => s.replace(/^simulated_/, '').replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());

function Modal({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return <div className={`psa-modal${wide ? ' wide' : ''}`} role="dialog" aria-modal="true"><div>{children}</div></div>;
}
function Confirm({ text, onYes, onNo, busy }: { text: string; onYes: () => void; onNo: () => void; busy?: boolean }) {
  return <Modal><h3>Confirm deletion</h3><p>{text}</p><div className="psa-row"><button className="psa-btn danger" disabled={busy} onClick={onYes} data-testid="psa-confirm-yes">{busy ? 'Deleting' : 'Delete'}</button><button className="psa-btn ghost" onClick={onNo} data-testid="psa-confirm-no">Cancel</button></div></Modal>;
}

/** Image URL field with presigned upload (PNG/JPEG/WebP, <10MB). Value is a URL or an object path, never base64. */
function UploadButton({ onUploaded, onError }: { onUploaded: (url: string) => void; onError: (m: string) => void }) {
  const mut = useCreateAdminProductImageUploadUrl();
  const mutRef = useRef(mut.mutateAsync); mutRef.current = mut.mutateAsync;
  const [progress, setProgress] = useState<number | null>(null);
  const pick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    if (!ALLOWED.has(file.type)) return onError(`${file.name}: choose a PNG, JPEG or WebP file.`);
    if (file.size > MAX_BYTES) return onError(`${file.name}: images must be under 10 MB.`);
    try {
      setProgress(0);
      const r = await mutRef.current({ data: { name: file.name, size: file.size, contentType: file.type as 'image/png' | 'image/jpeg' | 'image/webp' } });
      if (!r.uploadURL || !r.objectPath?.startsWith('/')) throw new Error('The upload service returned an invalid image location.');
      await new Promise<void>((resolve, reject) => {
        const x = new XMLHttpRequest(); x.open('PUT', r.uploadURL); x.setRequestHeader('Content-Type', file.type);
        x.upload.onprogress = ev => { if (ev.lengthComputable) setProgress(Math.min(99, Math.round(ev.loaded / ev.total * 100))); };
        x.onload = () => x.status >= 200 && x.status < 300 ? resolve() : reject(new Error(`Upload failed (${x.status}).`));
        x.onerror = () => reject(new Error('Network error during upload.'));
        x.send(file);
      });
      onUploaded(r.objectPath); onError('');
    } catch (err) { onError(errText(err)); } finally { setProgress(null); }
  };
  return <label className="psa-btn ghost sm" style={{ cursor: 'pointer', color: 'inherit', display: 'inline-block', width: 'auto', marginTop: 0 }}>{progress === null ? 'Upload image' : `Uploading ${progress}%`}<input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={pick} disabled={progress !== null} data-testid="psa-upload-input" /></label>;
}

function SingleImage({ value, onChange, name }: { value: string; onChange: (v: string) => void; name: string }) {
  const [err, setErr] = useState('');
  return <div><label>{name}<input value={value} maxLength={2048} placeholder="https://... or upload" onChange={e => onChange(e.target.value)} /></label>
    <div className="psa-row" style={{ marginTop: 6 }}>{value && <img className="psa-thumb" src={show(value)} alt="" />}<UploadButton onUploaded={onChange} onError={setErr} />{value && <button type="button" className="psa-btn ghost sm" onClick={() => onChange('')}>Clear</button>}</div>{err && <p className="psa-err">{err}</p>}</div>;
}

export function PhysicalStoreAdmin({ initialTab = 'overview', onViewExistingOrders }: { initialTab?: 'overview' | 'orders'; onViewExistingOrders?: () => void }) {
  const q = useGetShopAdmin({ query: { queryKey: getGetShopAdminQueryKey(), refetchInterval: 3000 } });
  const [tab, setTab] = useState<Tab>(initialTab);
  const d = q.data;
  return (
    <div className="psa" data-testid="physical-store-admin">
      <div className="psa-between" style={{ marginBottom: 14 }}><h2>Physical store</h2><button className="psa-btn ghost sm" onClick={() => q.refetch()} data-testid="psa-refresh">Refresh</button></div>
      <div className="psa-tabs" role="tablist">{TABS.map(([k, n]) => <button key={k} role="tab" aria-selected={tab === k} className="psa-tab" onClick={() => setTab(k)} data-testid={`psa-tab-${k}`}>{n}</button>)}</div>
      {q.isLoading && <div className="psa-card">Loading store data</div>}
      {q.isError && <div className="psa-card"><p className="psa-err">{errText(q.error)}</p><button className="psa-btn" onClick={() => q.refetch()}>Retry</button></div>}
      {d && <>
        {tab === 'overview' && <Overview d={d} />}
        {tab === 'settings' && <SettingsForm settings={d.settings} />}
        {tab === 'categories' && <Categories cats={d.categories} products={d.products} />}
        {tab === 'products' && <Products products={d.products} cats={d.categories} />}
        {tab === 'orders' && <Orders orders={d.orders} domains={d.domains.map(x => x.hostname)} onViewExistingOrders={onViewExistingOrders} />}
        {tab === 'domains' && <Domains domains={d.domains} />}
      </>}
    </div>
  );
}

function useRefresh() { const qc = useQueryClient(); return () => qc.invalidateQueries({ queryKey: getGetShopAdminQueryKey() }); }

function Overview({ d }: { d: ShopAdmin }) {
  const s = d.summary;
  const items: [string, string][] = [['Products', String(s.productCount)], ['Active products', String(s.activeProductCount)], ['Pending orders', String(s.pendingOrders)], ['Confirmed orders', String(s.confirmedOrders)], ['Approved order value', money(s.simulatedSalesCents)]];
  return <div className="psa-grid">{items.map(([n, v]) => <div className="psa-card psa-stat" key={n} data-testid={`psa-stat-${n.toLowerCase().replace(/ /g, '-')}`}>{n}<b>{v}</b></div>)}</div>;
}

function SettingsForm({ settings }: { settings: ShopSettings }) {
  const refresh = useRefresh(); const save = useSaveShopSettings();
  const [f, setF] = useState(() => ({ ...settings, ship: dollars(settings.shippingCents), thr: dollars(settings.shippingThresholdCents) }));
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF(p => ({ ...p, [k]: v }));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const { ship, thr, ...rest } = f;
    const body: ShopSettings = { ...rest, shippingCents: toCents(ship), shippingThresholdCents: toCents(thr), discountPercent: Number(rest.discountPercent) };
    save.mutate({ data: body }, { onSuccess: () => { setMsg({ ok: true, t: 'Settings saved.' }); refresh(); }, onError: er => setMsg({ ok: false, t: errText(er) }) });
  };
  return <form className="psa-card" onSubmit={submit} data-testid="psa-settings-form">
    <div className="psa-grid">
      <label>Brand name<input required maxLength={80} value={f.brandName} onChange={e => set('brandName', e.target.value)} data-testid="psa-brand" /></label>
      <label>Accent color<input type="color" value={/^#[0-9a-fA-F]{6}$/.test(f.accentColor) ? f.accentColor : '#c8472f'} onChange={e => set('accentColor', e.target.value)} style={{ height: 38, padding: 2 }} /></label>
      <label>Hero title<input maxLength={150} value={f.heroTitle} onChange={e => set('heroTitle', e.target.value)} /></label>
      <label>Support email<input type="email" maxLength={254} value={f.supportEmail} onChange={e => set('supportEmail', e.target.value)} /></label>
      <label>Shipping ($)<input type="number" min="0" max="10000" step="0.01" value={f.ship} onChange={e => set('ship', e.target.value)} /></label>
      <label>Free shipping over ($)<input type="number" min="0" step="0.01" value={f.thr} onChange={e => set('thr', e.target.value)} /></label>
      <label>Discount code<input maxLength={40} value={f.discountCode} onChange={e => set('discountCode', e.target.value)} /></label>
      <label>Discount percent (0-90)<input type="number" min="0" max="90" value={f.discountPercent} onChange={e => set('discountPercent', Number(e.target.value))} /></label>
    </div>
    <label style={{ marginTop: 12 }}>Description<textarea rows={3} maxLength={1000} value={f.description} onChange={e => set('description', e.target.value)} /></label>
    <div className="psa-grid" style={{ marginTop: 12 }}><SingleImage name="Logo" value={f.logoUrl} onChange={v => set('logoUrl', v)} /><SingleImage name="Hero image" value={f.heroImageUrl} onChange={v => set('heroImageUrl', v)} /></div>
    {msg && <p className={msg.ok ? 'psa-ok' : 'psa-err'} role="status">{msg.t}</p>}
    <button className="psa-btn" disabled={save.isPending} data-testid="psa-save-settings">{save.isPending ? 'Saving' : 'Save settings'}</button>
  </form>;
}

function Categories({ cats, products }: { cats: ShopCategory[]; products: ShopProduct[] }) {
  const refresh = useRefresh(); const create = useCreateShopCategory(); const update = useUpdateShopCategory(); const del = useDeleteShopCategory();
  const [edit, setEdit] = useState<{ id?: number; f: ShopCategoryInput } | null>(null);
  const [gone, setGone] = useState<ShopCategory | null>(null);
  const [err, setErr] = useState('');
  const blank: ShopCategoryInput = { name: '', slug: '', description: '', imageUrl: '', active: true };
  const toInput = (c: ShopCategory): ShopCategoryInput => ({ name: c.name, slug: c.slug, description: c.description, imageUrl: c.imageUrl, active: c.active });
  const put = (id: number, f: ShopCategoryInput) => update.mutate({ id, data: f }, { onSuccess: refresh, onError: e => setErr(errText(e)) });
  const submit = (e: FormEvent) => {
    e.preventDefault(); if (!edit) return; setErr('');
    const done = { onSuccess: () => { setEdit(null); refresh(); }, onError: (er: unknown) => setErr(errText(er)) };
    if (edit.id !== undefined) update.mutate({ id: edit.id, data: edit.f }, done); else create.mutate({ data: edit.f }, done);
  };
  return <div>
    <div className="psa-between" style={{ marginBottom: 12 }}><h3>{cats.length} categories</h3><button className="psa-btn" onClick={() => { setErr(''); setEdit({ f: blank }); }} data-testid="psa-new-category">New category</button></div>
    {err && !edit && <p className="psa-err">{err}</p>}
    {cats.length === 0 && <div className="psa-card">No categories yet. Create one to group products.</div>}
    {cats.map(c => <div className="psa-card psa-between" key={c.id} data-testid={`psa-category-${c.id}`}>
      <div className="psa-row">{c.imageUrl && <img className="psa-thumb" src={show(c.imageUrl)} alt="" />}<div><b>{c.name}</b> <span className="psa-chip">{c.slug}</span> {!c.active && <span className="psa-chip warn">Hidden</span>}<div>{products.filter(p => p.categoryId === c.id).length} products</div></div></div>
      <div className="psa-row"><button className="psa-btn ghost sm" onClick={() => put(c.id, { ...toInput(c), active: !c.active })} data-testid={`psa-toggle-category-${c.id}`}>{c.active ? 'Hide' : 'Show'}</button><button className="psa-btn ghost sm" onClick={() => { setErr(''); setEdit({ id: c.id, f: toInput(c) }); }}>Edit</button><button className="psa-btn danger sm" onClick={() => setGone(c)} data-testid={`psa-delete-category-${c.id}`}>Delete</button></div>
    </div>)}
    {edit && <Modal><form onSubmit={submit} data-testid="psa-category-form"><h3>{edit.id !== undefined ? 'Edit category' : 'New category'}</h3>
      <label>Name<input required maxLength={100} value={edit.f.name} onChange={e => { const name = e.target.value; setEdit(p => p && { ...p, f: { ...p.f, name, slug: p.id === undefined && (!p.f.slug || p.f.slug === slugify(p.f.name)) ? slugify(name) : p.f.slug } }); }} data-testid="psa-category-name" /></label>
      <label>Slug<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={100} value={edit.f.slug} onChange={e => setEdit(p => p && { ...p, f: { ...p.f, slug: e.target.value } })} /></label>
      <label>Description<textarea rows={2} maxLength={1000} value={edit.f.description} onChange={e => setEdit(p => p && { ...p, f: { ...p.f, description: e.target.value } })} /></label>
      <SingleImage name="Image" value={edit.f.imageUrl} onChange={v => setEdit(p => p && { ...p, f: { ...p.f, imageUrl: v } })} />
      <label className="psa-row" style={{ marginTop: 8 }}><input type="checkbox" checked={edit.f.active} onChange={e => setEdit(p => p && { ...p, f: { ...p.f, active: e.target.checked } })} style={{ width: 'auto' }} />Visible in store</label>
      {err && <p className="psa-err">{err}</p>}
      <div className="psa-row" style={{ marginTop: 12 }}><button className="psa-btn" disabled={create.isPending || update.isPending} data-testid="psa-save-category">Save</button><button type="button" className="psa-btn ghost" onClick={() => setEdit(null)}>Cancel</button></div></form></Modal>}
    {gone && <Confirm text={`Delete category "${gone.name}"? Products in it will need a new category.`} busy={del.isPending} onNo={() => setGone(null)} onYes={() => del.mutate({ id: gone.id }, { onSuccess: () => { setGone(null); refresh(); }, onError: e => { setErr(errText(e)); setGone(null); } })} />}
  </div>;
}

type VDraft = { id?: number; label: string; sku: string; price: string; stock: string; active: boolean };
type PDraft = { name: string; slug: string; description: string; categoryId: string; imageUrls: string[]; active: boolean; featured: boolean; variants: VDraft[] };
const blankP = (): PDraft => ({ name: '', slug: '', description: '', categoryId: '', imageUrls: [], active: true, featured: false, variants: [{ label: 'Default', sku: '', price: '', stock: '0', active: true }] });
const draftOf = (p: ShopProduct): PDraft => ({ name: p.name, slug: p.slug, description: p.description, categoryId: p.categoryId === null ? '' : String(p.categoryId), imageUrls: [...p.imageUrls], active: p.active, featured: p.featured, variants: p.variants.map(v => ({ id: v.id, label: v.label, sku: v.sku, price: dollars(v.priceCents), stock: String(v.stock), active: v.active })) });
const inputOf = (d: PDraft): ShopProductInput => ({
  name: d.name.trim(), slug: d.slug.trim(), description: d.description, categoryId: d.categoryId === '' ? null : Number(d.categoryId),
  imageUrls: d.imageUrls.map(u => u.trim()).filter(Boolean), active: d.active, featured: d.featured,
  variants: d.variants.map((v): ShopVariantInput => ({ ...(v.id !== undefined ? { id: v.id } : {}), label: v.label.trim(), sku: v.sku.trim(), priceCents: toCents(v.price), stock: Math.max(0, Math.floor(Number(v.stock) || 0)), active: v.active })),
});

function Products({ products, cats }: { products: ShopProduct[]; cats: ShopCategory[] }) {
  const refresh = useRefresh(); const create = useCreateShopProduct(); const update = useUpdateShopProduct(); const del = useDeleteShopProduct();
  const [edit, setEdit] = useState<{ id?: number; d: PDraft } | null>(null);
  const [gone, setGone] = useState<ShopProduct | null>(null);
  const [err, setErr] = useState(''); const [newUrl, setNewUrl] = useState('');
  const [search, setSearch] = useState('');
  const list = useMemo(() => products.filter(p => p.name.toLowerCase().includes(search.toLowerCase())), [products, search]);
  const setD = (patch: Partial<PDraft>) => setEdit(p => p && { ...p, d: { ...p.d, ...patch } });
  const setV = (i: number, patch: Partial<VDraft>) => setEdit(p => p && { ...p, d: { ...p.d, variants: p.d.variants.map((v, j) => j === i ? { ...v, ...patch } : v) } });
  const addUrl = (u: string) => { if (u.trim()) setEdit(p => p && p.d.imageUrls.length < 15 ? { ...p, d: { ...p.d, imageUrls: [...p.d.imageUrls, u.trim()] } } : p); };
  const submit = (e: FormEvent) => {
    e.preventDefault(); if (!edit) return; setErr('');
    if (edit.d.variants.length === 0) return setErr('A product needs at least one variant.');
    if (edit.d.variants.some(v => !Number.isFinite(Number(v.price)) || v.price === '')) return setErr('Every variant needs a price.');
    const done = { onSuccess: () => { setEdit(null); refresh(); }, onError: (er: unknown) => setErr(errText(er)) };
    const data = inputOf(edit.d);
    if (edit.id !== undefined) update.mutate({ id: edit.id, data }, done); else create.mutate({ data }, done);
  };
  const quick = (p: ShopProduct, patch: Partial<PDraft>) => update.mutate({ id: p.id, data: inputOf({ ...draftOf(p), ...patch }) }, { onSuccess: refresh, onError: e => setErr(errText(e)) });
  return <div>
    <div className="psa-between" style={{ marginBottom: 12 }}><input style={{ maxWidth: 260 }} placeholder="Search products" value={search} onChange={e => setSearch(e.target.value)} data-testid="psa-product-search" /><button className="psa-btn" onClick={() => { setErr(''); setEdit({ d: blankP() }); }} data-testid="psa-new-product">New product</button></div>
    {err && !edit && <p className="psa-err">{err}</p>}
    {list.length === 0 && <div className="psa-card">No products found.</div>}
    {list.map(p => <div className="psa-card psa-between" key={p.id} data-testid={`psa-product-${p.id}`}>
      <div className="psa-row">{p.imageUrls[0] ? <img className="psa-thumb" src={show(p.imageUrls[0])} alt="" /> : <div className="psa-thumb" />}<div><b>{p.name}</b> {!p.active && <span className="psa-chip warn">Hidden</span>} {p.featured && <span className="psa-chip">Featured</span>}<div>{cats.find(c => c.id === p.categoryId)?.name ?? 'Uncategorized'} - {p.variants.length} variants - {p.variants.reduce((s, v) => s + v.stock, 0)} in stock</div></div></div>
      <div className="psa-row"><button className="psa-btn ghost sm" onClick={() => quick(p, { active: !p.active })} data-testid={`psa-toggle-product-${p.id}`}>{p.active ? 'Hide' : 'Show'}</button><button className="psa-btn ghost sm" onClick={() => { setErr(''); setEdit({ id: p.id, d: draftOf(p) }); }} data-testid={`psa-edit-product-${p.id}`}>Edit</button><button className="psa-btn danger sm" onClick={() => setGone(p)} data-testid={`psa-delete-product-${p.id}`}>Delete</button></div>
    </div>)}
    {edit && <Modal wide><form onSubmit={submit} data-testid="psa-product-form"><h3>{edit.id !== undefined ? 'Edit product' : 'New product'}</h3>
      <div className="psa-grid">
        <label>Name<input required maxLength={150} value={edit.d.name} onChange={e => { const name = e.target.value; setEdit(p => p && { ...p, d: { ...p.d, name, slug: p.id === undefined && (!p.d.slug || p.d.slug === slugify(p.d.name)) ? slugify(name) : p.d.slug } }); }} data-testid="psa-product-name" /></label>
        <label>Slug<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={100} value={edit.d.slug} onChange={e => setD({ slug: e.target.value })} /></label>
        <label>Category<select value={edit.d.categoryId} onChange={e => setD({ categoryId: e.target.value })} data-testid="psa-product-category"><option value="">Uncategorized</option>{cats.map(c => <option key={c.id} value={c.id}>{c.name}{c.active ? '' : ' (hidden)'}</option>)}</select></label>
      </div>
      <label style={{ marginTop: 10 }}>Description<textarea rows={4} maxLength={5000} value={edit.d.description} onChange={e => setD({ description: e.target.value })} /></label>
      <div className="psa-row" style={{ marginTop: 10 }}><label className="psa-row"><input type="checkbox" checked={edit.d.active} onChange={e => setD({ active: e.target.checked })} style={{ width: 'auto' }} />Visible</label><label className="psa-row"><input type="checkbox" checked={edit.d.featured} onChange={e => setD({ featured: e.target.checked })} style={{ width: 'auto' }} />Featured</label></div>
      <h3 style={{ marginTop: 14 }}>Images ({edit.d.imageUrls.length}/15)</h3>
      <div className="psa-row" style={{ margin: '8px 0' }}>{edit.d.imageUrls.map((u, i) => <div key={i} style={{ textAlign: 'center' }}><img className="psa-thumb" src={show(u)} alt="" /><div className="psa-row" style={{ justifyContent: 'center' }}>{i > 0 && <button type="button" className="psa-btn ghost sm" onClick={() => setD({ imageUrls: edit.d.imageUrls.map((x, j, a) => j === i - 1 ? a[i] : j === i ? a[i - 1] : x) })}>Left</button>}<button type="button" className="psa-btn ghost sm" onClick={() => setD({ imageUrls: edit.d.imageUrls.filter((_, j) => j !== i) })}>Remove</button></div></div>)}</div>
      <div className="psa-row"><input style={{ flex: 1, minWidth: 180, marginTop: 0 }} placeholder="Image URL" value={newUrl} onChange={e => setNewUrl(e.target.value)} data-testid="psa-image-url" /><button type="button" className="psa-btn ghost sm" onClick={() => { addUrl(newUrl); setNewUrl(''); }}>Add URL</button><UploadButton onUploaded={addUrl} onError={setErr} /></div>
      <div className="psa-between" style={{ marginTop: 14 }}><h3>Variants</h3><button type="button" className="psa-btn ghost sm" onClick={() => setD({ variants: [...edit.d.variants, { label: '', sku: '', price: '', stock: '0', active: true }] })} data-testid="psa-add-variant">Add variant</button></div>
      {edit.d.variants.map((v, i) => <div className="psa-vrow" key={v.id ?? `n${i}`} data-testid={`psa-variant-${i}`}>
        <label>Label<input required maxLength={100} value={v.label} onChange={e => setV(i, { label: e.target.value })} /></label>
        <label>SKU<input maxLength={100} value={v.sku} onChange={e => setV(i, { sku: e.target.value })} /></label>
        <label>Price ($)<input required type="number" min="0" step="0.01" value={v.price} onChange={e => setV(i, { price: e.target.value })} /></label>
        <label>Stock<input required type="number" min="0" max="1000000" step="1" value={v.stock} onChange={e => setV(i, { stock: e.target.value })} /></label>
        <label className="psa-row"><input type="checkbox" checked={v.active} onChange={e => setV(i, { active: e.target.checked })} style={{ width: 'auto' }} />Active</label>
        <button type="button" className="psa-btn danger sm" disabled={edit.d.variants.length <= 1} onClick={() => setD({ variants: edit.d.variants.filter((_, j) => j !== i) })}>Remove</button>
      </div>)}
      {err && <p className="psa-err" role="alert">{err}</p>}
      <div className="psa-row" style={{ marginTop: 14 }}><button className="psa-btn" disabled={create.isPending || update.isPending} data-testid="psa-save-product">{create.isPending || update.isPending ? 'Saving' : 'Save product'}</button><button type="button" className="psa-btn ghost" onClick={() => setEdit(null)}>Cancel</button></div></form></Modal>}
    {gone && <Confirm text={`Delete "${gone.name}" and its variants? This cannot be undone.`} busy={del.isPending} onNo={() => setGone(null)} onYes={() => del.mutate({ id: gone.id }, { onSuccess: () => { setGone(null); refresh(); }, onError: e => { setErr(errText(e)); setGone(null); } })} />}
  </div>;
}

function Orders({ orders, domains, onViewExistingOrders }: { orders: ShopAdminOrder[]; domains: string[]; onViewExistingOrders?: () => void }) {
  const refresh = useRefresh(); const upd = useUpdateShopOrder();
  const [fd, setFd] = useState(''); const [fp, setFp] = useState(''); const [fs, setFs] = useState(''); const [fw, setFw] = useState(''); const [s, setS] = useState('');
  const [err, setErr] = useState('');
  const list = orders.filter(o => (!fd || o.domain === fd) && (!fp || o.paymentStatus === fp) && (!fs || o.shippingStatus === fs) && (!fw || o.website === fw) && (!s || `${o.id} ${o.contactEmail} ${o.cardholderName}`.toLowerCase().includes(s.toLowerCase())));
  const run = (id: number, data: ShopOrderUpdate) => { setErr(''); upd.mutate({ id, data }, { onSuccess: refresh, onError: e => setErr(errText(e)) }); };
  const dset = Array.from(new Set([...domains, ...orders.map(o => o.domain).filter(Boolean)]));
  return <div>
    <div className="psa-card psa-grid">
      <label>Search<input value={s} onChange={e => setS(e.target.value)} placeholder="ID, email, name" data-testid="psa-order-search" /></label>
      <label>Website<select value="physical-store" onChange={e => { if (e.target.value === 'existing') onViewExistingOrders?.(); else setFw(e.target.value); }} data-testid="psa-filter-website"><option value="physical-store">Physical-product store</option>{onViewExistingOrders && <option value="existing">Existing website — DriveGuard</option>}</select></label>
      <label>Domain<select value={fd} onChange={e => setFd(e.target.value)} data-testid="psa-filter-domain"><option value="">All</option>{dset.map(x => <option key={x}>{x}</option>)}</select></label>
      <label>Payment<select value={fp} onChange={e => setFp(e.target.value)} data-testid="psa-filter-payment"><option value="">All</option>{['simulated_pending', 'simulated_approved', 'simulated_declined', 'cancelled', 'expired'].map(x => <option key={x} value={x}>{label(x)}</option>)}</select></label>
      <label>Shipping<select value={fs} onChange={e => setFs(e.target.value)} data-testid="psa-filter-shipping"><option value="">All</option>{['unfulfilled', 'preparing', 'shipped', 'delivered'].map(x => <option key={x} value={x}>{label(x)}</option>)}</select></label>
    </div>
    {err && <p className="psa-err" role="alert">{err}</p>}
    {list.length === 0 && <div className="psa-card">{orders.length ? 'No orders match these filters.' : 'No orders yet.'}</div>}
    {list.map(o => <OrderCard key={o.id} o={o} run={run} busy={upd.isPending} />)}
  </div>;
}

function OrderCard({ o, run, busy }: { o: ShopAdminOrder; run: (id: number, d: ShopOrderUpdate) => void; busy: boolean }) {
  const [ship, setShip] = useState({ status: o.shippingStatus, carrier: o.carrier, num: o.trackingNumber, url: o.trackingUrl });
  useEffect(() => setShip({ status: o.shippingStatus, carrier: o.carrier, num: o.trackingNumber, url: o.trackingUrl }), [o.shippingStatus, o.carrier, o.trackingNumber, o.trackingUrl]);
  const v = o.verificationState; const pending = o.status === 'pending';
  const B = (text: string, action: ShopOrderUpdate['action'], on: boolean, danger?: boolean) => <button className={`psa-btn sm${danger ? ' danger' : ''}`} disabled={!on || busy} onClick={() => run(o.id, { action })} data-testid={`psa-order-${action}-${o.id}`}>{text}</button>;
  return <div className="psa-card" data-testid={`psa-order-${o.id}`}>
    <div className="psa-between"><b>Order #{o.id}</b><div className="psa-row"><span className="psa-chip">{o.website === 'physical-store' ? 'Physical store' : o.website}</span><span className="psa-chip">{o.domain || 'no domain'}</span><span className="psa-chip">{label(o.status)}</span><span className="psa-chip">{label(o.paymentStatus)}</span><span className="psa-chip">{label(o.shippingStatus)}</span></div></div>
    <p>{o.contactEmail} / {o.contactPhone} - {o.cardholderName} ({o.cardType} ending {o.cardLast4}) - {new Date(o.createdAt).toLocaleString()}</p>
    <p>{o.items.map(i => `${i.name}${i.variantLabel ? ` (${i.variantLabel})` : ''} x ${i.quantity}`).join(', ')} - <b>{money(o.totalCents)}</b> (shipping {money(o.shippingCents)}, discount {money(o.discountCents)})</p>
    <p>{o.shippingAddress.fullName}, {o.shippingAddress.line1} {o.shippingAddress.line2}, {o.shippingAddress.city}, {o.shippingAddress.region} {o.shippingAddress.postalCode}, {o.shippingAddress.country}</p>
    <p>Verification: <b>{label(v)}</b>{o.verificationMethod ? ` via ${o.verificationMethod}` : ''}{pending ? ` - expires ${new Date(o.expiresAt).toLocaleTimeString()}` : ''}</p>
    {o.testCode && <p>Submitted verification code: <strong data-testid={`psa-test-code-${o.id}`}>{o.testCode}</strong>. Check the shared code before approving.</p>}
    <div className="psa-row">{B('Request verification', 'request_verification', pending && v === 'waiting')}{B('Code shared', 'code_shared', pending && v === 'method_selected')}{B('Approve', 'approve', pending && v === 'code_submitted')}{B('Reject', 'decline', pending, true)}{B('Invalid code', 'invalid_code', pending && v === 'code_submitted')}{B('Cancel', 'cancel', (pending || o.status === 'confirmed') && !['shipped', 'delivered'].includes(o.shippingStatus), true)}{B('Expire', 'expire', pending, true)}{B('Mark fulfilled', 'fulfill', o.status === 'confirmed')}</div>
    <div className="psa-grid" style={{ marginTop: 10 }}>
      <label>Shipping status<select value={ship.status} onChange={e => setShip(p => ({ ...p, status: e.target.value as ShopOrder['shippingStatus'] }))}>{['unfulfilled', 'preparing', 'shipped', 'delivered'].map(x => <option key={x} value={x}>{label(x)}</option>)}</select></label>
      <label>Carrier<input maxLength={100} value={ship.carrier} onChange={e => setShip(p => ({ ...p, carrier: e.target.value }))} /></label>
      <label>Tracking number<input maxLength={150} value={ship.num} onChange={e => setShip(p => ({ ...p, num: e.target.value }))} /></label>
      <label>Tracking URL<input maxLength={2048} value={ship.url} onChange={e => setShip(p => ({ ...p, url: e.target.value }))} /></label>
    </div>
    <button className="psa-btn sm" style={{ marginTop: 8 }} disabled={busy || !['confirmed', 'fulfilled'].includes(o.status)} onClick={() => run(o.id, { action: 'update_shipping', shippingStatus: ship.status, carrier: ship.carrier, trackingNumber: ship.num, trackingUrl: ship.url })} data-testid={`psa-save-shipping-${o.id}`}>Save shipping</button>
  </div>;
}

function Domains({ domains }: { domains: { id: number; hostname: string; websiteType: ShopDomainInput['websiteType'] }[] }) {
  const refresh = useRefresh(); const save = useSaveShopDomain(); const del = useDeleteShopDomain();
  const [host, setHost] = useState(''); const [type, setType] = useState<ShopDomainInput['websiteType']>('physical-store');
  const [err, setErr] = useState(''); const [gone, setGone] = useState<{ id: number; hostname: string } | null>(null);
  const submit = (e: FormEvent) => {
    e.preventDefault(); setErr('');
    const hostname = host.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    save.mutate({ data: { hostname, websiteType: type } }, { onSuccess: () => { setHost(''); refresh(); }, onError: er => setErr(errText(er)) });
  };
  return <div>
    <div className="psa-note" style={{ marginBottom: 14 }} data-testid="psa-dns-note"><b>Saving a domain here does not connect DNS.</b> Add each hostname you map (for example both example.com and www.example.com) to Publishing Domains in Replit, then enter the generated A and TXT records at your domain provider. Keep the TXT record in place after the domain connects.</div>
    <form className="psa-card psa-row" onSubmit={submit} data-testid="psa-domain-form">
      <label style={{ flex: 1, minWidth: 200 }}>Hostname<input required minLength={3} maxLength={253} placeholder="shop.example.com" value={host} onChange={e => setHost(e.target.value)} data-testid="psa-domain-host" /></label>
      <label>Website<select value={type} onChange={e => setType(e.target.value as ShopDomainInput['websiteType'])} data-testid="psa-domain-type"><option value="physical-store">Physical store</option><option value="existing">Existing website</option></select></label>
      <button className="psa-btn" style={{ alignSelf: 'end' }} disabled={save.isPending} data-testid="psa-save-domain">{save.isPending ? 'Saving' : 'Save mapping'}</button>
    </form>
    {err && <p className="psa-err" role="alert">{err}</p>}
    {domains.length === 0 && <div className="psa-card">No domain mappings yet.</div>}
    {domains.map(d => <div className="psa-card psa-between" key={d.id} data-testid={`psa-domain-${d.id}`}><div><b>{d.hostname}</b> <span className="psa-chip">{d.websiteType === 'physical-store' ? 'Physical store' : 'Existing website'}</span></div><button className="psa-btn danger sm" onClick={() => setGone(d)}>Delete</button></div>)}
    {gone && <Confirm text={`Delete the mapping for ${gone.hostname}? DNS records at your provider are not changed.`} busy={del.isPending} onNo={() => setGone(null)} onYes={() => del.mutate({ id: gone.id }, { onSuccess: () => { setGone(null); refresh(); }, onError: e => { setErr(errText(e)); setGone(null); } })} />}
  </div>;
}

export default PhysicalStoreAdmin;
