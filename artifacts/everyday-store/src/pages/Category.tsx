import { useMemo, useState } from 'react';
import { Link, useParams } from 'wouter';
import { useGetShopCatalog } from '@workspace/api-client-react';
import { EmptyBlock, ErrorBlock, Skeletons } from '@/components/Layout';
import { ProductCard } from '@/components/ProductCard';
import { minPrice } from '@/lib/shop';

export default function Category() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading, isError, error, refetch } = useGetShopCatalog();
  const [sort, setSort] = useState('featured');
  const [q, setQ] = useState('');
  const cat = data?.categories.find(c => c.slug === slug && c.active);
  const list = useMemo(() => {
    let l = (data?.products ?? []).filter(p => p.active && cat && p.categoryId === cat.id && p.name.toLowerCase().includes(q.trim().toLowerCase()));
    if (sort === 'low') l = [...l].sort((a, b) => minPrice(a) - minPrice(b));
    else if (sort === 'high') l = [...l].sort((a, b) => minPrice(b) - minPrice(a));
    else l = [...l].sort((a, b) => Number(b.featured) - Number(a.featured));
    return l;
  }, [data, cat, sort, q]);
  if (isLoading) return <div className="mx-auto max-w-6xl px-4 py-10"><Skeletons /></div>;
  if (isError) return <div className="px-4 py-16"><ErrorBlock message={error instanceof Error ? error.message : 'Could not load.'} onRetry={() => refetch()} /></div>;
  if (!cat) return <div className="px-4 py-16"><EmptyBlock title="No such category" text="It may have been hidden or renamed."><Link href="/" className="btn" data-testid="link-back-home">Browse everything</Link></EmptyBlock></div>;
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="display text-5xl font-semibold" data-testid="text-category-name">{cat.name}</h1>
      {cat.description && <p className="mt-3 max-w-xl text-muted-foreground">{cat.description}</p>}
      <div className="my-8 flex flex-wrap gap-3">
        <input className="field max-w-xs" type="search" placeholder={`Search in ${cat.name}`} value={q} onChange={e => setQ(e.target.value)} data-testid="input-category-search" />
        <select className="field max-w-[200px]" value={sort} onChange={e => setSort(e.target.value)} data-testid="select-sort">
          <option value="featured">Featured first</option><option value="low">Price, low to high</option><option value="high">Price, high to low</option>
        </select>
      </div>
      {list.length === 0 ? <EmptyBlock title="Nothing here yet" text="No products match in this category right now." /> :
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">{list.map((p, i) => <ProductCard key={p.id} p={p} i={i} />)}</div>}
    </div>
  );
}
