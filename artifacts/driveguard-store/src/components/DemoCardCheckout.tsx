import { type FormEvent, useRef, useState } from 'react';
import { useCreateDemoOrder, useSaveDemoDraft, type DemoCheckoutDraftInput, type Product } from '@workspace/api-client-react';
import { Check, CreditCard, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react';

type DemoBrand = 'visa' | 'mastercard';
type CardType = 'credit' | 'debit';
const demoNumbers: Record<DemoBrand, string> = {
  visa: '4242 4242 4242 4242',
  mastercard: '5555 5555 5555 4444',
};
const fieldClass = 'mt-2 block h-[52px] w-full rounded-xl border border-[#d8dce2] bg-white px-4 text-[14px] text-[#17212f] outline-none transition placeholder:text-[#a8afb8] focus:border-[#c92525] focus:ring-4 focus:ring-[#c92525]/10';
const validName = (name: string) => /^[\p{L}\p{M} .'-]+$/u.test(name.trim()) && name.trim().length <= 80;
const validNumber = (number: string) => Object.values(demoNumbers).some(demo => number.replace(/[\s-]/g, '') === demo.replace(/\s/g, ''));

function BrandLogo({ brand, light = false }: { brand: DemoBrand; light?: boolean }) {
  return brand === 'visa'
    ? <svg viewBox="0 0 24 24" width="47" height="30" fill={light ? '#fff' : '#1A1F71'} aria-hidden="true"><path d="M9.112 8.262L5.97 15.758H3.92L2.374 9.775c-.094-.368-.175-.503-.461-.658C1.447 8.864.677 8.627 0 8.479l.046-.217h3.3a.904.904 0 01.894.764l.817 4.338 2.018-5.102zm8.033 5.049c.008-1.979-2.736-2.088-2.717-2.972.006-.269.262-.555.822-.628a3.66 3.66 0 011.913.336l.34-1.59a5.207 5.207 0 00-1.814-.333c-1.917 0-3.266 1.02-3.278 2.479-.012 1.079.963 1.68 1.698 2.04.756.367 1.01.603 1.006.931-.005.504-.602.725-1.16.734-.975.015-1.54-.263-1.992-.473l-.351 1.642c.453.208 1.289.39 2.156.398 2.037 0 3.37-1.006 3.377-2.564m5.061 2.447H24l-1.565-7.496h-1.656a.883.883 0 00-.826.55l-2.909 6.946h2.036l.405-1.12h2.488zm-2.163-2.656l1.02-2.815.588 2.815zm-8.16-4.84l-1.603 7.496H8.34l1.605-7.496z"/></svg>
    : <svg viewBox="0 0 44 28" width="46" height="29" aria-hidden="true"><circle cx="17" cy="14" r="11" fill="#EB001B"/><circle cx="27" cy="14" r="11" fill="#F79E1B"/><path d="M22 4.2a11 11 0 010 19.6 11 11 0 010-19.6" fill="#FF5F00"/></svg>;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

export function DemoCardCheckout({
  cart, clearCart, onSubmitted,
}: {
  cart: { product: Product; quantity: number }[];
  clearCart: () => void;
  onSubmitted: (type: CardType) => void;
}) {
  const [cardType, setCardType] = useState<CardType>('credit');
  const [brand, setBrand] = useState<DemoBrand>('visa');
  const [demoName, setDemoName] = useState('');
  const [demoNumber, setDemoNumber] = useState('');
  const [demoExpiry, setDemoExpiry] = useState('');
  const [demoCvc, setDemoCvc] = useState('');
  const [draftError, setDraftError] = useState('');
  const [liveSaved, setLiveSaved] = useState(false);
  const [formError, setFormError] = useState('');
  const [draftId] = useState(() => crypto.randomUUID());
  const completedRef = useRef<DemoCheckoutDraftInput['completedFields']>([]);
  const pendingDraft = useRef<Promise<unknown>>(Promise.resolve());
  const draftSequence = useRef(0);
  const order = useCreateDemoOrder();
  const saveDemoDraft = useSaveDemoDraft();

  const queueDraft = (name: string, type: CardType, completedFields: DemoCheckoutDraftInput['completedFields']) => {
    const sequence = ++draftSequence.current;
    setLiveSaved(false);
    setDraftError('');
    pendingDraft.current = pendingDraft.current.catch(() => {}).then(() => saveDemoDraft.mutateAsync({
      id: draftId, data: { displayName: validName(name) ? name.trim() : '', cardType: type, completedFields },
    }));
    void pendingDraft.current.then(
      () => { if (sequence === draftSequence.current) setLiveSaved(true); },
      () => { if (sequence === draftSequence.current) setDraftError('Live admin preview is unavailable. You can still submit your demo order.'); },
    );
  };
  const completeField = (field: DemoCheckoutDraftInput['completedFields'][number], valid: boolean) => {
    const hadCompletedField = completedRef.current.length > 0;
    const next = completedRef.current.filter(item => item !== field);
    if (valid) next.push(field);
    completedRef.current = next;
    if (next.length || hadCompletedField) queueDraft(demoName, cardType, next);
  };
  const chooseBrand = (nextBrand: DemoBrand) => {
    setBrand(nextBrand);
    setDemoNumber(demoNumbers[nextBrand]);
    completeField('number', true);
  };
  const fillDemo = () => {
    const name = validName(demoName) ? demoName.trim() : 'Demo Driver';
    setDemoName(name);
    setDemoNumber(demoNumbers[brand]);
    setDemoExpiry('12/30');
    setDemoCvc('123');
    setFormError('');
    completedRef.current = ['name', 'number', 'expiry', 'cvc'];
    queueDraft(name, cardType, completedRef.current);
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!cart.length || cart.some(line => line.product.stock < line.quantity)) return;
    if (!validName(demoName) || !validNumber(demoNumber) || demoExpiry.trim() !== '12/30' || demoCvc.trim() !== '123') {
      setFormError('Use a demo name and one of the preset demo card numbers, expiry, and CVC shown below.');
      return;
    }
    setFormError('');
    try {
      completedRef.current = ['name', 'number', 'expiry', 'cvc'];
      queueDraft(demoName, cardType, completedRef.current);
      await pendingDraft.current.catch(() => {});
      await order.mutateAsync({ data: { cardType, draftId, items: cart.map(({ product, quantity }) => ({ productId: product.id, quantity })) } });
      clearCart();
      onSubmitted(cardType);
    } catch {
      // Keep the cart intact so the shopper can retry.
    }
  };
  const stockError = cart.some(line => line.quantity > line.product.stock);
  const digits = demoNumber.replace(/[\s-]/g, '');
  const displayedBrand: DemoBrand = digits.startsWith('5') ? 'mastercard' : brand;
  const matchingNumber = digits === demoNumbers[displayedBrand].replace(/\s/g, '');

  return <section className="overflow-hidden rounded-[22px] border border-[#e3e6ea] bg-white p-5 shadow-[0_22px_70px_-48px_rgba(23,33,47,.35)] sm:p-7" data-testid="panel-demo-card-checkout">
    <header className="flex items-start justify-between gap-3">
      <div><p className="mb-1 text-[11px] font-bold uppercase tracking-[.18em] text-[#c92525]">DriveGuard checkout</p><h2 className="text-[24px] font-extrabold tracking-[-.04em] text-[#17212f]">Demo card details</h2><p className="mt-1 text-[12px] text-[#737d8c]">A checkout preview, not a payment form.</p></div>
      <span className="shrink-0 rounded-full border border-[#ffd9d9] bg-[#fff3f3] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.1em] text-[#b82222]">Demo only</span>
    </header>
    <div className="relative mt-6 overflow-hidden rounded-[19px] bg-[linear-gradient(130deg,#111d2d_0%,#26334a_57%,#3d252d_100%)] px-6 py-5 text-white shadow-[0_16px_32px_-19px_rgba(15,29,46,.65)]">
      <div className="pointer-events-none absolute -right-14 -top-28 h-64 w-64 rounded-full border border-white/10" />
      <div className="pointer-events-none absolute -right-3 -top-16 h-52 w-52 rounded-full border border-white/10" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-24 w-full bg-[linear-gradient(0deg,rgba(196,40,48,.14),transparent)]" />
      <div className="relative flex items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-[13px] font-bold tracking-[-.02em]"><ShieldCheck size={17} className="text-[#ff7979]" /> DriveGuard</div><div className="mt-1 text-[10px] font-semibold uppercase tracking-[.17em] text-white/55">Simulation card</div></div><BrandLogo brand={displayedBrand} light /></div>
      <div className="relative mt-6 h-7 w-9 rounded-[5px] border border-[#eee1bb]/65 bg-[linear-gradient(135deg,#f9e9c7,#b0a074)]"><span className="absolute inset-x-0 top-1/2 h-px bg-[#786b53]/50"/><span className="absolute bottom-0 left-1/2 top-0 w-px bg-[#786b53]/50"/></div>
      <div className="relative mt-5 text-[19px] font-semibold tracking-[.22em] tabular-nums sm:text-[21px]">•••• &nbsp;•••• &nbsp;•••• &nbsp;{matchingNumber ? (displayedBrand === 'visa' ? '4242' : '4444') : '••••'}</div>
      <div className="relative mt-5 flex items-end justify-between gap-3"><div><div className="text-[9px] font-semibold uppercase tracking-[.17em] text-white/50">Demo cardholder</div><div className="mt-1 max-w-[220px] truncate text-[12px] font-semibold uppercase tracking-[.09em]">{validName(demoName) ? demoName.trim() : 'YOUR NAME'}</div></div><div className="text-right"><div className="text-[9px] font-semibold uppercase tracking-[.17em] text-white/50">Expires</div><div className="mt-1 text-[12px] font-semibold tracking-[.09em]">{demoExpiry.trim() === '12/30' ? '12/30' : 'MM/YY'}</div></div></div>
    </div>
    <div className="mt-5 rounded-xl border border-[#f4dedc] bg-[#fff8f7] px-4 py-3 text-[12px] leading-[1.55] text-[#673b39]" data-testid="notice-demo-payment"><strong className="text-[#9e2424]">Demo only — never enter a real card.</strong> Use the preset values below. No payment is processed or stock reserved. Card details are never sent or stored; admin receives the demo name and field progress only.</div>
    <div className="mt-6 flex items-center justify-between gap-3"><span className="text-[12px] font-bold text-[#243040]">Choose a demo brand</span><button type="button" onClick={fillDemo} className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#b82424] hover:underline" data-testid="button-use-demo-card"><Sparkles size={14} /> Fill demo details</button></div>
    <div className="mt-2 grid grid-cols-2 gap-2.5" role="group" aria-label="Choose a demo card brand">
      {(['visa', 'mastercard'] as const).map(item => <button key={item} type="button" onClick={() => chooseBrand(item)} aria-label={`Use ${item === 'visa' ? 'Visa' : 'Mastercard'} demo number ending ${item === 'visa' ? '4242' : '4444'}`} aria-pressed={brand === item} className={`flex h-[48px] items-center justify-between rounded-xl border px-3.5 transition ${brand === item ? 'border-[#c92525] bg-[#fff8f8] shadow-[0_0_0_2px_rgba(201,37,37,.07)]' : 'border-[#dce0e5] bg-white hover:border-[#aeb6c0]'}`} data-testid={`button-demo-brand-${item}`}><BrandLogo brand={item} /><span className="text-[11px] font-semibold text-[#6e7785]">{item === 'visa' ? '4242' : '4444'}</span></button>)}
    </div>
    <div className="mt-5 rounded-xl bg-[#f3f5f7] p-1" role="group" aria-label="Simulated card type"><div className="grid grid-cols-2 gap-1">{(['credit', 'debit'] as const).map(type => <button key={type} type="button" aria-pressed={cardType === type} onClick={() => { setCardType(type); if (completedRef.current.length) queueDraft(demoName, type, completedRef.current); }} className={`rounded-lg py-2.5 text-[12px] font-bold capitalize transition ${cardType === type ? 'bg-white text-[#1e293b] shadow-sm' : 'text-[#748090] hover:text-[#243040]'}`} data-testid={`button-card-type-${type}`}>{type} card</button>)}</div></div>
    <form onSubmit={submit} autoComplete="off" className="mt-6 space-y-4">
      <label className="block text-[12px] font-bold text-[#344255]">Demo name<input required maxLength={80} autoComplete="off" value={demoName} onChange={event => setDemoName(event.target.value)} onBlur={() => completeField('name', validName(demoName))} className={fieldClass} data-testid="input-card-name" placeholder="Demo Driver" /></label>
      <label className="block text-[12px] font-bold text-[#344255]">Preset demo number<span className="relative block"><input required maxLength={19} inputMode="numeric" autoComplete="off" value={demoNumber} onChange={event => { setDemoNumber(event.target.value); const inputDigits = event.target.value.replace(/\D/g, ''); if (inputDigits.startsWith('4')) setBrand('visa'); else if (inputDigits.startsWith('5')) setBrand('mastercard'); }} onBlur={() => completeField('number', validNumber(demoNumber))} className={`${fieldClass} pr-20 font-medium tracking-[.06em] tabular-nums`} data-testid="input-card-number" placeholder={demoNumbers[brand]} /><span className="pointer-events-none absolute right-4 top-1/2 -translate-y-[31%] opacity-90"><BrandLogo brand={displayedBrand}/></span></span></label>
      <div className="grid grid-cols-2 gap-3"><label className="block text-[12px] font-bold text-[#344255]">Demo expiry<input required maxLength={5} autoComplete="off" placeholder="12/30" value={demoExpiry} onChange={event => setDemoExpiry(event.target.value)} onBlur={() => completeField('expiry', demoExpiry.trim() === '12/30')} className={`${fieldClass} tabular-nums`} data-testid="input-card-expiry" /></label><label className="block text-[12px] font-bold text-[#344255]">Demo CVC<input required maxLength={3} type="password" inputMode="numeric" autoComplete="off" placeholder="123" value={demoCvc} onChange={event => setDemoCvc(event.target.value)} onBlur={() => completeField('cvc', demoCvc.trim() === '123')} className={`${fieldClass} tabular-nums`} data-testid="input-card-cvc" /></label></div>
      <p className="text-[11px] leading-5 text-[#798390]">Preset only: Visa 4242 4242 4242 4242 or Mastercard 5555 5555 5555 4444 · expiry 12/30 · CVC 123.</p>
      {formError && <p role="alert" className="text-[12px] font-semibold text-[#a61c1c]">{formError}</p>}
      {draftError && <p role="status" className="text-[12px] text-[#a61c1c]">{draftError}</p>}
      {liveSaved && !draftError && <p role="status" className="flex items-center gap-1.5 text-[11px] font-semibold text-[#42674c]"><Check size={13} /> Demo progress visible in admin.</p>}
      {order.isError && <p role="alert" className="text-[12px] font-semibold text-[#a61c1c]" data-testid="text-checkout-error">We couldn’t create your demo order: {errorMessage(order.error)} Your cart is unchanged; please try again.</p>}
      {stockError && <p role="alert" className="text-[12px] text-[#a61c1c]">One or more items exceed current availability. Update your cart before checkout.</p>}
      <button type="submit" disabled={!cart.length || order.isPending || stockError} className="mt-1 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#c92525] px-4 text-[14px] font-bold text-white transition hover:bg-[#ac1b1b] disabled:cursor-not-allowed disabled:opacity-50" data-testid="button-submit-checkout"><CreditCard size={17} /> {order.isPending ? 'Creating demo order…' : 'Simulate order'}</button>
      <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-[#818b97]"><LockKeyhole size={13} /> Demo only · no payment processed</p>
    </form>
  </section>;
}