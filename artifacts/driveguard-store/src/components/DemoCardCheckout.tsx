import { type FormEvent, useRef, useState } from 'react';
import { useCreateDemoOrder, useSaveDemoDraft, type DemoCheckoutDraftInput, type Product } from '@workspace/api-client-react';
import { ArrowRight, Check, CreditCard, LockKeyhole } from 'lucide-react';

type DemoBrand = 'visa' | 'mastercard';
type CardType = 'credit' | 'debit';
const fieldClass = 'mt-2 block h-[50px] w-full rounded-lg border border-[#d5dbe3] bg-white px-3.5 text-[14px] text-[#17212f] outline-none transition placeholder:text-[#9aa4b2] focus:border-[#c92525] focus:ring-[3px] focus:ring-[#c92525]/10';
const validName = (name: string) => /^[\p{L}\p{M} .'-]+$/u.test(name.trim()) && name.trim().length <= 80;
const formatNumber = (value: string) => value.replace(/\D/g, '').slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ');
const formatExpiry = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
};
const validNumber = (number: string) => /^\d{13,19}$/.test(number.replace(/\s/g, ''));
const validExpiry = (expiry: string) => /^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry);
const validCvc = (cvc: string) => /^\d{3,4}$/.test(cvc);

function BrandLogo({ brand, small = false }: { brand: DemoBrand; small?: boolean }) {
  return brand === 'visa'
    ? <svg viewBox="0 0 24 24" width={small ? 34 : 40} height="26" fill="#1A1F71" aria-label="Visa" role="img"><path d="M9.112 8.262L5.97 15.758H3.92L2.374 9.775c-.094-.368-.175-.503-.461-.658C1.447 8.864.677 8.627 0 8.479l.046-.217h3.3a.904.904 0 01.894.764l.817 4.338 2.018-5.102zm8.033 5.049c.008-1.979-2.736-2.088-2.717-2.972.006-.269.262-.555.822-.628a3.66 3.66 0 011.913.336l.34-1.59a5.207 5.207 0 00-1.814-.333c-1.917 0-3.266 1.02-3.278 2.479-.012 1.079.963 1.68 1.698 2.04.756.367 1.01.603 1.006.931-.005.504-.602.725-1.16.734-.975.015-1.54-.263-1.992-.473l-.351 1.642c.453.208 1.289.39 2.156.398 2.037 0 3.37-1.006 3.377-2.564m5.061 2.447H24l-1.565-7.496h-1.656a.883.883 0 00-.826.55l-2.909 6.946h2.036l.405-1.12h2.488zm-2.163-2.656l1.02-2.815.588 2.815zm-8.16-4.84l-1.603 7.496H8.34l1.605-7.496z"/></svg>
    : <svg viewBox="0 0 44 28" width={small ? 36 : 41} height="26" aria-label="Mastercard" role="img"><circle cx="17" cy="14" r="11" fill="#EB001B"/><circle cx="27" cy="14" r="11" fill="#F79E1B"/><path d="M22 4.2a11 11 0 010 19.6 11 11 0 010-19.6" fill="#FF5F00"/></svg>;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

export function DemoCardCheckout({
  cart, clearCart, onSubmitted, totalCents,
}: {
  cart: { product: Product; quantity: number }[];
  clearCart: () => void;
  onSubmitted: (type: CardType) => void;
  totalCents: number;
}) {
  const [cardType, setCardType] = useState<CardType>('credit');
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
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!cart.length || cart.some(line => line.product.stock < line.quantity)) return;
    if (!validName(demoName) || !validNumber(demoNumber) || !validExpiry(demoExpiry) || !validCvc(demoCvc)) {
      setFormError('Enter a demo name, 13–19 card digits, an MM/YY expiry, and a 3–4 digit CVC. Use made-up details only.');
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
  const firstDigit = demoNumber.charAt(0);
  const displayedBrand: DemoBrand | null = firstDigit === '4' ? 'visa' : firstDigit === '5' ? 'mastercard' : null;

  return <section className="rounded-xl border border-[#dfe3e8] bg-white p-5 shadow-[0_14px_36px_-30px_rgba(28,37,50,.3)] sm:p-7" data-testid="panel-demo-card-checkout">
    <header className="flex items-start justify-between gap-4 border-b border-[#edf0f2] pb-5">
      <div><p className="text-[11px] font-bold uppercase tracking-[.12em] text-[#a62020]">Checkout · Step 2 of 2</p><h2 className="mt-1 text-[23px] font-bold tracking-[-.035em] text-[#1c2734]">Payment details</h2><p className="mt-1 text-[13px] text-[#66717e]">Enter made-up card details to simulate an order.</p></div>
      <span className="shrink-0 rounded-md bg-[#fff1f0] px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[.09em] text-[#ad2626]">Demo mode</span>
    </header>
    <div className="mt-5 rounded-lg border border-[#f0d9d6] bg-[#fff8f7] px-3.5 py-3 text-[12px] leading-[1.5] text-[#764340]" data-testid="notice-demo-payment"><strong>Demo only — use made-up details.</strong> No payment is processed. Card number, expiry, and CVC are never sent or stored. Never enter a real card.</div>
    <div className="mt-6 flex items-center justify-between gap-2">
      <h3 className="text-[14px] font-bold text-[#263241]">Card</h3>
      <div className="flex items-center gap-1.5" aria-label="Card brands"><BrandLogo brand="visa" small /><BrandLogo brand="mastercard" small /></div>
    </div>
    <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-[#d7dde4] px-3.5 py-3">
      <span className="flex items-center gap-2.5 text-[13px] font-semibold text-[#263241]"><span className="grid h-[17px] w-[17px] place-items-center rounded-full border-[5px] border-[#c92525]" /> Credit or debit card</span>
      <CreditCard size={19} className="text-[#748090]" aria-hidden="true" />
    </div>
    <form onSubmit={submit} autoComplete="off" className="mt-5 space-y-4">
      <label className="block text-[12px] font-semibold text-[#344255]">Name on card<input required maxLength={80} autoComplete="off" value={demoName} onChange={event => setDemoName(event.target.value)} onBlur={() => completeField('name', validName(demoName))} className={fieldClass} data-testid="input-card-name" placeholder="Demo Driver" /></label>
      <div>
        <label htmlFor="demo-card-number" className="block text-[12px] font-semibold text-[#344255]">Card information</label>
        <div className="mt-2 overflow-hidden rounded-lg border border-[#d5dbe3] transition focus-within:border-[#c92525] focus-within:ring-[3px] focus-within:ring-[#c92525]/10">
          <div className="relative">
            <input id="demo-card-number" required maxLength={23} inputMode="numeric" autoComplete="off" value={demoNumber} onChange={event => setDemoNumber(formatNumber(event.target.value))} onBlur={() => completeField('number', validNumber(demoNumber))} className="h-[50px] w-full bg-transparent px-3.5 pr-[65px] text-[14px] tracking-[.02em] text-[#17212f] outline-none placeholder:text-[#9aa4b2]" data-testid="input-card-number" placeholder="Card number" />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">{displayedBrand ? <BrandLogo brand={displayedBrand} small /> : <CreditCard size={19} className="text-[#9aa4b2]" aria-hidden="true" />}</span>
          </div>
          <div className="grid grid-cols-2 border-t border-[#d5dbe3]">
            <label className="block border-r border-[#d5dbe3]"><span className="sr-only">Expiration date</span><input required maxLength={5} inputMode="numeric" autoComplete="off" placeholder="MM / YY" value={demoExpiry} onChange={event => setDemoExpiry(formatExpiry(event.target.value))} onBlur={() => completeField('expiry', validExpiry(demoExpiry))} className="h-[50px] w-full min-w-0 bg-transparent px-3.5 text-[14px] text-[#17212f] outline-none placeholder:text-[#9aa4b2]" data-testid="input-card-expiry" /></label>
            <label className="block"><span className="sr-only">Security code</span><input required maxLength={4} type="password" inputMode="numeric" autoComplete="off" placeholder="CVC" value={demoCvc} onChange={event => setDemoCvc(event.target.value.replace(/\D/g, '').slice(0, 4))} onBlur={() => completeField('cvc', validCvc(demoCvc))} className="h-[50px] w-full min-w-0 bg-transparent px-3.5 text-[14px] text-[#17212f] outline-none placeholder:text-[#9aa4b2]" data-testid="input-card-cvc" /></label>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[12px] font-semibold text-[#344255]">Card type</span>
        <div className="flex rounded-lg border border-[#d9dee5] bg-[#f7f8fa] p-0.5" role="group" aria-label="Simulated card type">
          {(['credit', 'debit'] as const).map(type => <button key={type} type="button" aria-pressed={cardType === type} onClick={() => { setCardType(type); if (completedRef.current.length) queueDraft(demoName, type, completedRef.current); }} className={`rounded-md px-3.5 py-1.5 text-[12px] font-semibold capitalize transition ${cardType === type ? 'bg-white text-[#263241] shadow-sm' : 'text-[#73808e] hover:text-[#263241]'}`} data-testid={`button-card-type-${type}`}>{type}</button>)}
        </div>
      </div>
      <p className="text-[11px] leading-5 text-[#697687]">Any made-up 13–19 digit number, MM/YY date, and 3–4 digit CVC will work. No card details leave this page.</p>
      {formError && <p role="alert" className="text-[12px] font-semibold text-[#a61c1c]">{formError}</p>}
      {draftError && <p role="status" className="text-[12px] text-[#a61c1c]">{draftError}</p>}
      {liveSaved && !draftError && <p role="status" className="flex items-center gap-1.5 text-[11px] font-semibold text-[#42674c]"><Check size={13} /> Demo progress visible in admin.</p>}
      {order.isError && <p role="alert" className="text-[12px] font-semibold text-[#a61c1c]" data-testid="text-checkout-error">We couldn’t create your demo order: {errorMessage(order.error)} Your cart is unchanged; please try again.</p>}
      {stockError && <p role="alert" className="text-[12px] text-[#a61c1c]">One or more items exceed current availability. Update your cart before checkout.</p>}
      <button type="submit" disabled={!cart.length || order.isPending || stockError} className="flex min-h-[52px] w-full items-center justify-between rounded-lg bg-[#c92525] px-4 text-[14px] font-bold text-white transition hover:bg-[#ac1b1b] disabled:cursor-not-allowed disabled:opacity-50" data-testid="button-submit-checkout"><span>{order.isPending ? 'Creating demo order…' : 'Place demo order'}</span><span className="flex items-center gap-2">{totalCents ? `$${(totalCents / 100).toFixed(2)}` : ''}<ArrowRight size={17} /></span></button>
      <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-[#818b97]"><LockKeyhole size={13} /> Simulated checkout · Nothing is charged</p>
    </form>
  </section>;
}