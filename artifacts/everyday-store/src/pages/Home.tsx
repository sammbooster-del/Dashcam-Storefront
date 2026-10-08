import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { Search } from 'lucide-react';
import { useGetShopCatalog } from '@workspace/api-client-react';
import { EmptyBlock, ErrorBlock, Skeletons } from '@/components/Layout';
import { ProductCard } from '@/components/ProductCard';
import { imgUrl } from '@/lib/shop';

export default function Home() {
  const { data, isLoading, isError, error, refetch } = useGetShopCatalog();
  const [q, setQ] = useState('');
  const products = useMemo(() => (data?.products ?? []).filter(p => p.active), [data]);
  const cats = (data?.categories ?? []).filter(c => c.active);
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return products;
    return products.filter(p => (p.name + ' ' + p.description + ' ' + p.variants.map(v => v.label + v.sku).join(' ') + ' ' + (cats.find(c => c.id === p.categoryId)?.name ?? '')).toLowerCase().includes(t));
  }, [products, q, cats]);
  const s = data?.settings;
  return (
    <div>
      <section className="mx-auto grid max-w-6xl items-center gap-8 px-4 pb-10 pt-10 md:grid-cols-2 md:pt-16">
        <div className="rise">
          <p className="chip mb-5">Practical things, picked daily</p>
          <h1 className="display text-5xl font-semibold leading-[1.02] md:text-7xl" data-testid="text-hero-title">{s?.heroTitle || 'Small things that make the day easier.'}</h1>
          <p className="mt-5 max-w-md text-lg text-muted-foreground">{s?.description || 'Patches, totes, notebooks and bottles. The practical stuff you reach for every day.'}</p>
          <div className="relative mt-8 max-w-md">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input className="field" style={{ paddingLeft: 44 }} type="search" placeholder="Search products, variants, categories" value={q} onChange={e => setQ(e.target.value)} data-testid="input-search" />
          </div>
        </div>
        <div className="rise overflow-hidden rounded-[2rem] bg-muted" style={{ animationDelay: '120ms' }}>
          <img src={imgUrl(s?.heroImageUrl || '/images/hero.jpg')} alt="" className="aspect-[4/3] w-full object-cover" />
        </div>
      </section>
      {cats.length > 0 && <section className="mx-auto flex max-w-6xl flex-wrap gap-2 px-4 pb-8">{cats.map(c => <Link key={c.id} href={`/category/${c.slug}`} className="btn btn-ghost btn-sm" data-testid={`link-category-${c.slug}`}>{c.name}</Link>)}</section>}
      <section className="mx-auto max-w-6xl px-4">
        <h2 className="mb-6 text-3xl font-semibold">{q ? `Results for "${q}"` : 'Everything in stock'}</h2>
        {isLoading ? <Skeletons /> : isError ? <ErrorBlock message={error instanceof Error ? error.message : 'Could not load the catalog.'} onRetry={() => refetch()} /> :
          shown.length === 0 ? <EmptyBlock title={q ? 'Nothing matches that' : 'The shelves are empty'} text={q ? 'Try a shorter word or browse a category.' : 'Products will appear here once the store adds them.'}>{q && <button className="btn btn-ghost" onClick={() => setQ('')} data-testid="button-clear-search">Clear search</button>}</EmptyBlock> :
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">{shown.map((p, i) => <ProductCard key={p.id} p={p} i={i} />)}</div>}
      </section>
    </div>
  );
}
