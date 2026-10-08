import { useEffect, useRef, useState } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, ArrowRight, CreditCard } from 'lucide-react';
import { useCreateShopOrder, useGetShopCatalog, useQuoteShopCart } from '@workspace/api-client-react';
import type { OrderAddress, ShopOrder, ShopOrderInput, ShopQuote } from '@workspace/api-client-react';
import { AcceptedCards, detectCardBrand } from '@/components/AcceptedCards';
import { CheckoutAddressFields, emptyAddress } from '@/components/CheckoutAddressFields';
import { CheckoutProgress, type CheckoutStep } from '@/components/CheckoutProgress';
import { ExpressPaymentOptions } from '@/components/ExpressPaymentOptions';
import { VerificationPanel } from '@/components/VerificationPanel';
import { EmptyBlock } from '@/components/Layout';
import { clearPending, errMsg, loadPending, money, newPending, saveOrder, savePending, useCart, type Pending } from '@/lib/shop';

export default function Checkout() {
  const cart = useCart();
  const { data } = useGetShopCatalog();
  const quoteM = useQuoteShopCart();
  const quoteRef = useRef(quoteM.mutateAsync); quoteRef.current = quoteM.mutateAsync;
  const createM = useCreateShopOrder();
  const [step, setStep] = useState<CheckoutStep | 'verify'>('delivery');
  const [email, setEmail] = useState(''); const [phone, setPhone] = useState('');
  const [ship, setShip] = useState<OrderAddress>(emptyAddress());
  const [bill, setBill] = useState<OrderAddress>(emptyAddress());
  const [same, setSame] = useState(true);
  const [method, setMethod] = useState(false);
  const [cardType, setCardType] = useState<'credit' | 'debit'>('credit');
  const [holder, setHolder] = useState(''); const [number, setNumber] = useState(''); const [expiry, setExpiry] = useState(''); const [cvc, setCvc] = useState('');
  const [quote, setQuote] = useState<ShopQuote | null>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState<Pending | null>(() => loadPending());
  const [final, setFinal] = useState<ShopOrder | null>(null);
  const [terminal, setTerminal] = useState<ShopOrder | null>(null);

  // Resume an in-flight order from this browser.
  useEffect(() => { if (pending?.orderId && step !== 'verify') setStep('verify'); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  const key = JSON.stringify([cart.lines, cart.coupon]);
  useEffect(() => {
    if (!cart.lines.length || pending?.orderId) return;
    quoteRef.current({ data: { items: cart.lines, ...(cart.coupon ? { discountCode: cart.coupon } : {}) } }).then(q => { setQuote(q); setError(''); }).catch(e => setError(errMsg(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (final) return <div className="px-4 py-16"><EmptyBlock title={`Order #${final.id} confirmed`} text="You can track your order privately on this browser."><Link href="/orders" className="btn btn-brand" data-testid="link-view-orders">View my orders</Link></EmptyBlock></div>;
  if (!cart.lines.length && !pending?.orderId) return <div className="px-4 py-16"><EmptyBlock title="Nothing to check out" text="Your cart is empty."><Link href="/" className="btn">Browse the shop</Link></EmptyBlock></div>;

  const digits = number.replace(/\D/g, '');
  const brand = detectCardBrand(number);
  const place = async () => {
    setError('');
    try {
      const fresh = await quoteRef.current({ data: { items: cart.lines, ...(cart.coupon ? { discountCode: cart.coupon } : {}) } });
      if (quote && fresh.totalCents !== quote.totalCents) { setQuote(fresh); setError(`Prices or availability changed. The new total is ${money(fresh.totalCents)}. Review it and place the order again.`); return; }
      setQuote(fresh);
      const p = pending ?? newPending();
      savePending(p); setPending(p);
      const body: ShopOrderInput = {
        items: cart.lines, ...(cart.coupon ? { discountCode: cart.coupon } : {}),
        requestKey: p.requestKey, accessToken: p.accessToken,
        contactEmail: email.trim(), contactPhone: phone.trim(),
        shippingAddress: ship, billingAddress: same ? { ...ship } : bill,
        cardType, cardholderName: holder.trim(), cardLast4: digits.slice(-4),
      };
      const receipt = await createM.mutateAsync({ data: body });
      const next = { ...p, orderId: receipt.order.id };
      savePending(next); setPending(next); saveOrder({ id: receipt.order.id, accessToken: p.accessToken });
      setTerminal(null); setStep('verify');
    } catch (e) { setError(errMsg(e)); }
  };
  const onVerify = (o: ShopOrder) => {
    // Resume the saved, server-priced order snapshot, not a fresh cart quote
    // (its units have already been reserved and may no longer be available).
    setQuote(o);
    if (o.status === 'confirmed' || o.status === 'fulfilled' || o.verificationState === 'approved') { clearPending(); cart.clear(); setFinal(o); }
    else if (['declined', 'cancelled', 'expired'].includes(o.verificationState) || ['cancelled', 'expired'].includes(o.status)) { clearPending(); setPending(null); setTerminal(o); }
  };
  const backToCard = () => { setTerminal(null); setStep('payment'); };
  const s = data?.settings;

  return (
    <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 md:grid-cols-[1fr_320px]">
      <div>
        <h1 className="text-4xl font-semibold">Checkout</h1>
        {step !== 'verify' && <CheckoutProgress step={step} />}
        <div className="mt-8">
          {step === 'delivery' && (
            <form className="space-y-5" onSubmit={e => { e.preventDefault(); setError(''); setStep('method'); }} data-testid="form-delivery">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="lbl">Email<input className="field mt-1.5" type="email" required maxLength={254} autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} data-testid="input-email" /></label>
                <label className="lbl">Phone<input className="field mt-1.5" type="tel" required maxLength={30} minLength={7} autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} data-testid="input-phone" /></label>
              </div>
              <h2 className="text-xl font-semibold">Delivery address</h2>
              <CheckoutAddressFields kind="shipping" value={ship} onChange={setShip} />
              <button className="btn btn-brand" data-testid="button-delivery-next">Continue to payment method<ArrowRight size={16} /></button>
            </form>)}
          {step === 'method' && (
            <form className="space-y-6" onSubmit={e => { e.preventDefault(); if (method) setStep('payment'); }} data-testid="form-payment-method">
              <button type="button" className="inline-flex items-center gap-1.5 text-sm font-semibold" onClick={() => setStep('delivery')} data-testid="button-back-delivery"><ArrowLeft size={16} />Back to delivery</button>
              <h2 className="text-2xl font-semibold">Choose how to pay</h2>
              <ExpressPaymentOptions />
              <label className={`block max-w-[540px] cursor-pointer rounded-2xl border-2 p-5 ${method ? 'bg-card' : 'bg-card/50'}`} style={method ? { borderColor: 'var(--brand)' } : undefined}>
                <div className="flex items-center gap-3"><input type="radio" name="pm" checked={method} onChange={() => setMethod(true)} className="h-5 w-5" data-testid="radio-payment-card" /><CreditCard size={22} /><span className="font-bold">Credit or debit card</span></div>
                <div className="mt-4 pl-8"><AcceptedCards location="payment-method" /></div>
              </label>
              <p className="text-xs text-muted-foreground">{method ? 'Card selected. Click Next to enter card and billing details.' : 'Select credit or debit card to continue.'}</p>
              <button className="btn btn-brand" disabled={!method} data-testid="button-method-next">Next<ArrowRight size={16} /></button>
            </form>)}
          {step === 'payment' && (
            <form className="space-y-5" onSubmit={e => { e.preventDefault(); place(); }} data-testid="form-card">
              <button type="button" className="inline-flex items-center gap-1.5 text-sm font-semibold" onClick={() => setStep('method')} data-testid="button-back-method"><ArrowLeft size={16} />Back to payment method</button>
              <h2 className="text-2xl font-semibold">Card and billing</h2>
              <p className="text-xs text-muted-foreground">Card fields stay in this browser. Only the last 4 digits are sent with the order.</p>
              <div className="flex gap-2">{(['credit', 'debit'] as const).map(t => <button key={t} type="button" className={`btn btn-sm ${cardType === t ? '' : 'btn-ghost'}`} onClick={() => setCardType(t)} data-testid={`button-type-${t}`}>{t === 'credit' ? 'Credit' : 'Debit'}</button>)}</div>
              <label className="lbl">Name on card<input className="field mt-1.5" required maxLength={100} autoComplete="off" value={holder} onChange={e => setHolder(e.target.value)} data-testid="input-cardholder" /></label>
              <label className="lbl">Card number{brand ? ` (${brand})` : ''}<input className="field mt-1.5 font-mono" required inputMode="numeric" autoComplete="off" pattern="[0-9 ]{13,23}" maxLength={23} value={number} onChange={e => setNumber(e.target.value.replace(/[^\d ]/g, ''))} data-testid="input-card-number" /></label>
              <div className="grid grid-cols-2 gap-4">
                <label className="lbl">Expiry (MM/YY)<input className="field mt-1.5 font-mono" required autoComplete="off" pattern="(0[1-9]|1[0-2])/[0-9]{2}" placeholder="MM/YY" maxLength={5} value={expiry} onChange={e => { let v = e.target.value.replace(/[^\d/]/g, ''); if (/^\d{3}$/.test(v)) v = v.slice(0, 2) + '/' + v.slice(2); setExpiry(v); }} data-testid="input-expiry" /></label>
                <label className="lbl">CVC<input className="field mt-1.5 font-mono" required autoComplete="off" inputMode="numeric" pattern="[0-9]{3,4}" maxLength={4} value={cvc} onChange={e => setCvc(e.target.value.replace(/\D/g, ''))} data-testid="input-cvc" /></label>
              </div>
              <h2 className="pt-2 text-xl font-semibold">Billing address</h2>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={same} onChange={e => setSame(e.target.checked)} data-testid="checkbox-same-billing" />Same as delivery address</label>
              {!same && <CheckoutAddressFields kind="billing" value={bill} onChange={setBill} />}
              {terminal && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive" data-testid="text-terminal">{terminal.verificationState === 'declined' ? 'The store declined that verification.' : terminal.status === 'expired' || terminal.verificationState === 'expired' ? 'Verification expired.' : 'The order was cancelled.'} Your details are still here. Review them and try again.</p>}
              {error && <p role="alert" className="text-sm text-destructive" data-testid="text-checkout-error">{error}</p>}
              <button className="btn btn-brand w-full sm:w-auto" disabled={createM.isPending || quoteM.isPending || digits.length < 13} data-testid="button-place-order">{createM.isPending ? 'Placing order' : `Place order${quote ? ` - ${money(quote.totalCents)}` : ''}`}</button>
            </form>)}
          {step === 'verify' && pending?.orderId && (
            <div className="space-y-4">
              <VerificationPanel orderId={pending.orderId} accessToken={pending.accessToken} onUpdate={onVerify} />
              <Link href="/orders" className="text-sm underline" data-testid="link-orders-from-verify">Track in My orders</Link>
            </div>)}
          {step === 'verify' && !pending?.orderId && (
            <div className="panel p-6"><p>This attempt ended.</p><button className="btn mt-4" onClick={backToCard} data-testid="button-back-card">Back to card details</button></div>)}
          {step === 'verify' && terminal && <button className="btn mt-4" onClick={backToCard} data-testid="button-back-card-2">Back to card details</button>}
        </div>
      </div>
      <aside className="panel h-fit p-6 md:sticky md:top-24">
        <h2 className="text-xl font-semibold">Your order</h2>
        {quote ? <>
          <ul className="mt-4 space-y-2 text-sm">{quote.items.map(i => <li key={i.variantId} className="flex justify-between gap-2"><span>{i.name}{i.variantLabel ? ` - ${i.variantLabel}` : ''} x {i.quantity}</span><span>{money(i.unitPriceCents * i.quantity)}</span></li>)}</ul>
          <dl className="mt-4 space-y-1 border-t pt-3 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{money(quote.subtotalCents)}</dd></div>
            {quote.discountCents > 0 && <div className="flex justify-between"><dt>Discount</dt><dd>-{money(quote.discountCents)}</dd></div>}
            <div className="flex justify-between"><dt>Shipping</dt><dd>{quote.shippingCents ? money(quote.shippingCents) : 'Free'}</dd></div>
            <div className="flex justify-between pt-2 text-lg font-semibold"><dt>Total</dt><dd data-testid="text-checkout-total">{money(quote.totalCents)}</dd></div>
          </dl></> : error && step !== 'payment' ? <p role="alert" className="mt-4 text-sm text-destructive">{error}</p> : <div className="mt-4 space-y-2"><div className="h-4 animate-pulse rounded bg-muted" /><div className="h-4 animate-pulse rounded bg-muted" /></div>}
        {s?.supportEmail && <p className="mt-4 text-xs text-muted-foreground">Help: {s.supportEmail}</p>}
      </aside>
    </div>
  );
}
