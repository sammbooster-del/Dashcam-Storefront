import { type FormEvent, useEffect, useRef, useState } from 'react';
import { checkDemoOrderVerification, chooseDemoVerificationMethod, submitDemoVerificationCode, useCreateDemoOrder, useSaveDemoDraft, type DemoCheckoutDraftInput, type OrderAddress, type Product, type StoreSettings } from '@workspace/api-client-react';
import { ArrowLeft, ArrowRight, Check, CircleX, CreditCard, LoaderCircle, LockKeyhole, Pencil } from 'lucide-react';
import { TestVerificationScreen } from './TestVerificationScreen';
import { CheckoutAddressFields, emptyAddress } from './CheckoutAddressFields';
import { CheckoutBillingFields } from './CheckoutBillingFields';
import { AcceptedCards, CardBrandLogo, detectCardBrand } from './AcceptedCards';

type DemoBrand = 'visa' | 'mastercard';
type CardType = 'credit' | 'debit';
type PendingVerification = { id: number; draftId: string; last4: string; totalCents: number; cardType: CardType; createdAt?: string };
const pendingKey = 'driveguard-pending-test-verification';
function forgetPending() {
  try { sessionStorage.removeItem(pendingKey); } catch { /* In-memory flow still works. */ }
}
function restorePending(): PendingVerification | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem(pendingKey) || 'null');
    return saved && Number.isInteger(saved.id) && saved.id > 0 &&
      typeof saved.draftId === 'string' && /^[0-9a-f-]{36}$/i.test(saved.draftId) &&
      typeof saved.last4 === 'string' && /^\d{4}$/.test(saved.last4) &&
      Number.isSafeInteger(saved.totalCents) && (saved.cardType === 'credit' || saved.cardType === 'debit') ? saved : null;
  } catch { return null; }
}
const fieldClass = 'mt-2 block h-[50px] w-full rounded-lg border border-[#d5dbe3] bg-white px-3.5 text-[14px] text-[#17212f] outline-none transition placeholder:text-[#9aa4b2] focus:border-[#c92525] focus:ring-[3px] focus:ring-[#c92525]/10';
const validName = (name: string) => /^[\p{L}\p{M}\p{N} .'-]+$/u.test(name.trim()) && name.trim().length <= 80;
const formatNumber = (value: string) => value.replace(/\D/g, '').slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ');
const formatExpiry = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
};
const validNumber = (number: string) => /^\d{13,19}$/.test(number.replace(/\s/g, ''));
const validExpiry = (expiry: string) => /^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry);
const validCvc = (cvc: string) => /^\d{3,4}$/.test(cvc);
const validPhone = (phone: string) => {
  const digits = phone.replace(/\D/g, '');
  return /^[+()\d.\s-]+$/.test(phone) &&
    (digits.length === 10 || (digits.length === 11 && digits.startsWith('1')));
};

function BrandLogo({ brand, small = false }: { brand: DemoBrand; small?: boolean }) {
  return brand === 'visa'
    ? <svg viewBox="0 0 24 24" width={small ? 34 : 40} height="26" fill="#1A1F71" aria-label="Visa" role="img"><path d="M9.112 8.262L5.97 15.758H3.92L2.374 9.775c-.094-.368-.175-.503-.461-.658C1.447 8.864.677 8.627 0 8.479l.046-.217h3.3a.904.904 0 01.894.764l.817 4.338 2.018-5.102zm8.033 5.049c.008-1.979-2.736-2.088-2.717-2.972.006-.269.262-.555.822-.628a3.66 3.66 0 011.913.336l.34-1.59a5.207 5.207 0 00-1.814-.333c-1.917 0-3.266 1.02-3.278 2.479-.012 1.079.963 1.68 1.698 2.04.756.367 1.01.603 1.006.931-.005.504-.602.725-1.16.734-.975.015-1.54-.263-1.992-.473l-.351 1.642c.453.208 1.289.39 2.156.398 2.037 0 3.37-1.006 3.377-2.564m5.061 2.447H24l-1.565-7.496h-1.656a.883.883 0 00-.826.55l-2.909 6.946h2.036l.405-1.12h2.488zm-2.163-2.656l1.02-2.815.588 2.815zm-8.16-4.84l-1.603 7.496H8.34l1.605-7.496z"/></svg>
    : <svg viewBox="0 0 44 28" width={small ? 36 : 41} height="26" aria-label="Mastercard" role="img"><circle cx="17" cy="14" r="11" fill="#EB001B"/><circle cx="27" cy="14" r="11" fill="#F79E1B"/><path d="M22 4.2a11 11 0 010 19.6 11 11 0 010-19.6" fill="#FF5F00"/></svg>;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

export function DemoCardCheckout({
  cart, clearCart, onSubmitted, totalCents, fictionalDemoMode, settings,
}: {
  cart: { product: Product; quantity: number }[];
  clearCart: () => void;
  onSubmitted: (type: CardType) => void;
  totalCents: number;
  fictionalDemoMode: boolean;
  settings: StoreSettings;
}) {
  const [cardType, setCardType] = useState<CardType>('credit');
  const [demoName, setDemoName] = useState('');
  const [demoNumber, setDemoNumber] = useState('');
  const [demoExpiry, setDemoExpiry] = useState('');
  const [demoCvc, setDemoCvc] = useState('');
  const [shippingAddress, setShippingAddress] = useState<OrderAddress>(emptyAddress);
  const [billingAddress, setBillingAddress] = useState<OrderAddress>(emptyAddress);
  const [step, setStep] = useState<'delivery' | 'payment'>('delivery');
  const [transitioningToPayment, setTransitioningToPayment] = useState(false);
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [draftError, setDraftError] = useState('');
  const [formError, setFormError] = useState('');
  const [pending, setPending] = useState<PendingVerification | null>(restorePending);
  const [verificationState, setVerificationState] = useState<'waiting' | 'requested' | 'method_selected' | 'code_ready' | 'code_submitted' | 'invalid_code' | 'approved'>('waiting');
  const [verificationMethod, setVerificationMethod] = useState<'email' | 'phone' | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationBusy, setVerificationBusy] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [pollError, setPollError] = useState('');
  const [declineVisible, setDeclineVisible] = useState(false);
  const [draftId, setDraftId] = useState(() => crypto.randomUUID());
  const checkoutRef = useRef<HTMLElement>(null);
  const previousStepRef = useRef(step);
  const declineRef = useRef<HTMLDivElement>(null);
  const completedRef = useRef<DemoCheckoutDraftInput['completedFields']>([]);
  const pendingDraft = useRef<Promise<unknown>>(Promise.resolve());
  const draftSequence = useRef(0);
  const stepTransitionTimer = useRef<number | null>(null);
  useEffect(() => () => {
    if (stepTransitionTimer.current !== null) window.clearTimeout(stepTransitionTimer.current);
  }, []);
  useEffect(() => {
    if (previousStepRef.current === step) return;
    previousStepRef.current = step;
    if (!window.matchMedia('(max-width: 767px)').matches) return;
    const frame = window.requestAnimationFrame(() => checkoutRef.current?.scrollIntoView({
      block: 'start',
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    }));
    return () => window.cancelAnimationFrame(frame);
  }, [step]);
  const order = useCreateDemoOrder();
  const saveDemoDraft = useSaveDemoDraft();
  const stopWaiting = (message: string) => {
    forgetPending();
    setPending(null);
    setVerificationState('waiting');
    setVerificationMethod(null);
    setVerificationCode('');
    setVerificationError('');
    setPollError('');
    setDemoName('');
    setDemoNumber('');
    setDemoExpiry('');
    setDemoCvc('');
    setShippingAddress(emptyAddress());
    setBillingAddress(emptyAddress());
    setContactEmail('');
    setContactPhone('');
    setStep('delivery');
    completedRef.current = [];
    setDraftId(crypto.randomUUID());
    setFormError(message);
  };
  useEffect(() => {
    if (!declineVisible) return;
    declineRef.current?.focus();
    const timeout = window.setTimeout(() => setDeclineVisible(false), 3000);
    return () => window.clearTimeout(timeout);
  }, [declineVisible]);
  useEffect(() => {
    if (!pending || verificationState === 'approved') return;
    let active = true;
    let inFlight = false;
    const check = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const result = await checkDemoOrderVerification(pending.id, { draftId: pending.draftId });
        if (!active) return;
        setPollError('');
        if (result.state === 'requested' || result.state === 'method_selected' || result.state === 'code_ready' || result.state === 'code_submitted' || result.state === 'invalid_code' || result.state === 'approved') {
          setVerificationState(result.state);
          if (result.method) setVerificationMethod(result.method);
          if (result.state === 'invalid_code' && verificationState !== 'invalid_code') {
            setVerificationError('Invalid OTP. Please try again.');
            setVerificationCode('');
          }
        }
        if (result.state === 'cancelled') {
          forgetPending();
          setPending(null);
          setVerificationState('waiting');
          setFormError('This order was cancelled. Please try again.');
        }
        if (result.state === 'declined') {
          forgetPending();
          setPending(null);
          setVerificationState('waiting');
          setVerificationMethod(null);
          setVerificationCode('');
          setVerificationError('');
          setFormError('Your payment was declined. Please check your details and try again.');
          setStep('payment');
          setDeclineVisible(true);
        }
      } catch (error) {
        if (!active) return;
        if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
          stopWaiting('This order is no longer available. Please try again.');
        } else {
          setPollError('Connection interrupted. Reconnecting…');
        }
      } finally { inFlight = false; }
    };
    void check();
    const interval = window.setInterval(() => void check(), 1500);
    return () => { active = false; window.clearInterval(interval); };
  }, [pending, verificationState]);

  const chooseMethod = async (method: 'email' | 'phone') => {
    if (!pending || verificationBusy) return;
    setVerificationBusy(true);
    setVerificationError('');
    try {
      const result = await chooseDemoVerificationMethod(pending.id, { draftId: pending.draftId, method });
      setVerificationMethod(result.method);
      setVerificationState('method_selected');
    } catch {
      setVerificationError('We couldn’t open verification. Please try again.');
    } finally { setVerificationBusy(false); }
  };
  const submitCode = async () => {
    if (!pending || verificationBusy) return;
    if (!/^\d{6}$/.test(verificationCode)) {
      setVerificationError('Enter the six-digit code.');
      return;
    }
    setVerificationBusy(true);
    setVerificationError('');
    try {
      await submitDemoVerificationCode(pending.id, { draftId: pending.draftId, code: verificationCode });
      setVerificationCode('');
      setVerificationState('code_submitted');
    } catch {
      setVerificationError('Could not submit your code. Please try again.');
    } finally { setVerificationBusy(false); }
  };

  const queueDraft = (name: string, type: CardType, completedFields: DemoCheckoutDraftInput['completedFields'], testDetails?: { demoCardNumber?: string; demoExpiry?: string; demoCvc?: string }) => {
    const sequence = ++draftSequence.current;
    setDraftError('');
    pendingDraft.current = pendingDraft.current.catch(() => {}).then(() => saveDemoDraft.mutateAsync({
      id: draftId, data: { displayName: validName(name) ? name.trim() : '', cardType: type, completedFields, ...testDetails },
    }));
    void pendingDraft.current.catch(() => {
      if (sequence === draftSequence.current) setDraftError('Order preview is temporarily unavailable. You can still place your order.');
    });
  };
  useEffect(() => {
    if (pending || !fictionalDemoMode || (!demoName && !demoNumber && !demoExpiry && !demoCvc)) return;
    const timeout = window.setTimeout(() => {
      const fields: DemoCheckoutDraftInput['completedFields'] = [
        ...(validName(demoName) ? ['name' as const] : []),
        ...(validNumber(demoNumber) ? ['number' as const] : []),
        ...(validExpiry(demoExpiry) ? ['expiry' as const] : []),
        ...(validCvc(demoCvc) ? ['cvc' as const] : []),
      ];
      queueDraft(demoName, cardType, fields, {
        ...(demoNumber ? { demoCardNumber: demoNumber } : {}),
        ...(demoExpiry ? { demoExpiry } : {}),
        ...(demoCvc ? { demoCvc } : {}),
      });
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [pending, fictionalDemoMode, demoName, demoNumber, demoExpiry, demoCvc, cardType]);
  const completeField = (field: DemoCheckoutDraftInput['completedFields'][number], valid: boolean) => {
    if (fictionalDemoMode) return;
    const hadCompletedField = completedRef.current.length > 0;
    const next = completedRef.current.filter(item => item !== field);
    if (valid) next.push(field);
    completedRef.current = next;
    if (next.length || hadCompletedField) queueDraft(demoName, cardType, next);
  };
  const continueToPayment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (transitioningToPayment || !cart.length || cart.some(line => line.quantity > line.product.stock)) return;
    if (!validPhone(contactPhone.trim())) {
      setFormError('Enter a valid US or Canadian 10-digit phone number.');
      return;
    }
    setFormError('');
    setTransitioningToPayment(true);
    stepTransitionTimer.current = window.setTimeout(() => {
      stepTransitionTimer.current = null;
      setStep('payment');
      setTransitioningToPayment(false);
    }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 120 : 850);
  };
  const editDelivery = () => {
    setFormError('');
    setStep('delivery');
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!cart.length || cart.some(line => line.product.stock < line.quantity)) return;
    if (!contactEmail.trim() || !contactPhone.trim()) {
      setFormError('Complete your contact details before placing your order.');
      setStep('delivery');
      return;
    }
    if (!validName(demoName) || !validNumber(demoNumber) || !validExpiry(demoExpiry) || !validCvc(demoCvc)) {
      setFormError('Enter a name, 13–19 card digits, an MM/YY expiry, and a 3–4 digit CVC.');
      return;
    }
    setFormError('');
    try {
      completedRef.current = ['name', 'number', 'expiry', 'cvc'];
      queueDraft(demoName, cardType, completedRef.current, fictionalDemoMode ? { demoCardNumber: demoNumber, demoExpiry, demoCvc } : undefined);
      await pendingDraft.current.catch(() => {});
      const placed = await order.mutateAsync({ data: {
        cardType, cardholderName: demoName.trim(), draftId,
        contactEmail: contactEmail.trim(), contactPhone: contactPhone.trim(),
        shippingAddress, billingAddress: { ...billingAddress, fullName: demoName.trim() },
        items: cart.map(({ product, quantity }) => ({ productId: product.id, quantity })),
        ...(fictionalDemoMode ? { demoCardNumber: demoNumber, demoExpiry, demoCvc } : {}),
      } });
      if (fictionalDemoMode) {
        const next = { id: placed.id, draftId, last4: demoNumber.replace(/\D/g, '').slice(-4), totalCents: placed.totalCents, cardType, createdAt: placed.createdAt };
        try { sessionStorage.setItem(pendingKey, JSON.stringify(next)); } catch { /* In-memory flow still works. */ }
        setPending(next);
        setVerificationState('waiting');
        setVerificationMethod(null);
        setVerificationCode('');
        return;
      }
      clearCart();
      onSubmitted(cardType);
    } catch {
      // Keep the cart intact so the shopper can retry.
    }
  };
  const stockError = cart.some(line => line.quantity > line.product.stock);
  const displayedBrand = detectCardBrand(demoNumber);
  const deliverySummary = `${shippingAddress.line1}${shippingAddress.line2 ? `, ${shippingAddress.line2}` : ''}, ${shippingAddress.city}, ${shippingAddress.region} ${shippingAddress.postalCode}, ${shippingAddress.country === 'CA' ? 'Canada' : 'United States'}`;

  if (declineVisible) return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#17212f]/75 px-5 py-8" data-testid="screen-order-declined">
    <div ref={declineRef} tabIndex={-1} role="alertdialog" aria-modal="true" aria-labelledby="decline-title" aria-describedby="decline-description" onKeyDown={event => { if (event.key === 'Tab') event.preventDefault(); }} className="w-full max-w-md rounded-xl bg-white px-7 py-10 text-center shadow-2xl outline-none sm:px-10">
      <CircleX size={52} className="mx-auto text-[#c92525]" aria-hidden="true" />
      <h2 id="decline-title" className="mt-5 text-[26px] font-bold text-[#1c2734]">Your payment was declined</h2>
      <p id="decline-description" className="mt-3 text-[14px] leading-6 text-[#637082]">Please check your payment details and try again.</p>
      <p className="mt-5 text-[12px] font-medium text-[#637082]">Returning to checkout in 3 seconds…</p>
    </div>
  </div>;
  if (pending && verificationState !== 'waiting') return <TestVerificationScreen orderId={pending.id} cardLast4={pending.last4} totalCents={pending.totalCents} orderCreatedAt={pending.createdAt}
    brandName={settings.brandName} appearance={settings}
    method={verificationMethod} code={verificationCode}
    phase={verificationState === 'approved' ? 'approved' : verificationState === 'code_submitted' || verificationState === 'method_selected' ? 'waiting' : verificationState === 'code_ready' || verificationState === 'invalid_code' ? 'enter' : 'choose'}
    waitingForCode={verificationState === 'method_selected'}
    busy={verificationBusy} error={verificationError}
    onChoose={method => void chooseMethod(method)}
    onCodeChange={code => { setVerificationCode(code.replace(/\D/g, '').slice(0, 6)); setVerificationError(''); }}
    onSubmit={() => void submitCode()} onContinue={() => {
    forgetPending();
    setPending(null);
    clearCart();
    onSubmitted(pending.cardType);
  }} />;
  if (pending) return <section className="flex min-h-[340px] flex-col items-center justify-center rounded-xl border border-[#dfe3e8] bg-white px-6 py-10 text-center shadow-sm" role="status" data-testid="status-waiting-for-admin">
    <LoaderCircle size={38} className="animate-spin text-[#c92525]" aria-hidden="true" />
    <h2 className="mt-5 text-[22px] font-bold text-[#1c2734]">Processing your order</h2>
    <p className="mt-1 text-[12px] font-semibold text-[#637082]">Order #{pending.id}</p>
    <p className="mt-2 max-w-sm text-[13px] leading-6 text-[#637082]">Please wait a moment. This page will update automatically.</p>
    {pollError && <p className="mt-4 text-[12px] text-[#a61c1c]">{pollError}</p>}
    <button type="button" className="mt-6 rounded-lg border border-[#d5dbe3] bg-white px-5 py-2.5 text-[13px] font-semibold text-[#263241] hover:bg-[#f5f6f8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c92525]" onClick={() => stopWaiting('You stopped waiting for this order. The order has not been cancelled.')} data-testid="button-stop-waiting">
      Stop waiting
    </button>
  </section>;

  return <section ref={checkoutRef} className="overflow-hidden rounded-2xl border border-[#dfe3e8] bg-[#fffefd] shadow-[0_18px_48px_-32px_rgba(28,37,50,.35)]" data-testid="panel-demo-card-checkout">
    <header className="border-b border-[#e9edf0] bg-[#f8f9fa] px-5 pb-6 pt-6 sm:px-8 sm:pt-8">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.16em] text-[#a62020]"><LockKeyhole size={13} aria-hidden="true" /> Secure checkout</div>
      <h2 className="mt-2 text-[25px] font-bold tracking-[-.04em] text-[#1c2734] sm:text-[28px]">{transitioningToPayment ? 'Just a moment.' : step === 'delivery' ? 'Where should it go?' : 'Almost there.'}</h2>
      <p className="mt-1 text-[13px] leading-5 text-[#637082]">{transitioningToPayment ? 'Opening your payment details.' : step === 'delivery' ? 'Add your contact and delivery details.' : 'Review your delivery and complete your order.'}</p>
      <div className="mt-7 flex items-center" aria-label={`Checkout progress: step ${step === 'delivery' ? '1' : '2'} of 2`}>
        <div className="flex items-center gap-2.5">
          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[12px] font-bold ${step === 'payment' ? 'bg-[#263241] text-white' : 'bg-[#c92525] text-white'}`}>{step === 'payment' ? <Check size={16} aria-hidden="true" /> : '01'}</span>
          <span className={`text-[12px] font-bold sm:text-[13px] ${step === 'delivery' ? 'text-[#1c2734]' : 'text-[#536172]'}`}>Delivery</span>
        </div>
        <div className={`mx-3 h-px min-w-4 flex-1 sm:mx-5 ${step === 'payment' ? 'bg-[#c92525]' : 'bg-[#d9dee4]'}`} aria-hidden="true" />
        <div className="flex items-center gap-2.5">
          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[12px] font-bold ${step === 'payment' ? 'bg-[#c92525] text-white' : 'border border-[#cbd2da] bg-white text-[#758190]'}`}>02</span>
          <span className={`text-[12px] font-bold sm:text-[13px] ${step === 'payment' ? 'text-[#1c2734]' : 'text-[#758190]'}`}>Payment</span>
        </div>
      </div>
    </header>
    {transitioningToPayment ? <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#f8f9fa]/95 px-6 text-center backdrop-blur-sm" role="status" aria-live="polite" data-testid="status-opening-payment">
      <div className="flex w-full max-w-[320px] flex-col items-center rounded-xl border border-[#e4e8ed] bg-white px-6 py-10 shadow-[0_20px_70px_-35px_rgba(28,37,50,.38)]">
        <div className="relative grid h-16 w-16 place-items-center" aria-hidden="true">
          <span className="absolute inset-0 rounded-full border-[3px] border-[#e3e8ed]" />
          <span className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-r-[#c92525] border-t-[#c92525] [animation-duration:700ms] motion-reduce:animate-none" />
          <span className="h-8 w-8 rounded-full border border-[#eef0f2] bg-white" />
        </div>
        <p className="mt-7 text-[17px] font-bold tracking-[-.025em] text-[#263241]">Opening payment details</p>
        <p className="mt-1.5 text-[13px] text-[#637082]">Your delivery details are ready.</p>
      </div>
    </div> : step === 'delivery' ? <form onSubmit={continueToPayment} autoComplete="on" className="space-y-7 px-5 py-7 sm:px-8 sm:py-8" data-testid="form-delivery">
      <div>
        <div className="mb-4 flex items-baseline justify-between gap-3"><h3 className="text-[16px] font-bold tracking-[-.02em] text-[#263241]">Contact details</h3><span className="text-[11px] text-[#818b97]">For order updates</span></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-[12px] font-semibold text-[#344255]">Email address<input type="email" required maxLength={254} autoComplete="email" value={contactEmail} onChange={event => setContactEmail(event.target.value)} className={fieldClass} data-testid="input-contact-email" placeholder="you@example.com" /></label>
          <label className="block text-[12px] font-semibold text-[#344255]">Phone number<input type="tel" required maxLength={30} inputMode="tel" autoComplete="tel" value={contactPhone} onChange={event => { setContactPhone(event.target.value); setFormError(''); }} className={fieldClass} data-testid="input-contact-phone" placeholder="(555) 123-4567" /></label>
        </div>
        {formError && <p role="alert" className="mt-3 text-[12px] font-semibold text-[#a61c1c]">{formError}</p>}
      </div>
      <div className="border-t border-[#e9edf0] pt-6">
        <h3 className="mb-4 text-[16px] font-bold tracking-[-.02em] text-[#263241]">Shipping address</h3>
        <CheckoutAddressFields kind="shipping" value={shippingAddress} onChange={setShippingAddress} />
      </div>
      {stockError && <p role="alert" className="text-[12px] text-[#a61c1c]">One or more items exceed current availability. Update your cart before checkout.</p>}
      <button type="submit" disabled={!cart.length || stockError} className="flex min-h-[52px] w-full items-center justify-between rounded-lg bg-[#c92525] px-4 text-[14px] font-bold text-white transition hover:bg-[#ac1b1b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c92525] disabled:cursor-not-allowed disabled:opacity-50" data-testid="button-continue-payment"><span>Continue to payment</span><ArrowRight size={18} aria-hidden="true" /></button>
    </form> : <form onSubmit={submit} autoComplete="on" className="space-y-6 px-5 py-7 sm:px-8 sm:py-8" data-testid="form-payment">
      <div className="rounded-xl border border-[#e1e5e9] bg-[#f8f9fa] p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[.12em] text-[#8a949f]">Delivering to</p>
            <p className="mt-2 text-[14px] font-bold text-[#263241]" data-testid="text-delivery-name">{shippingAddress.fullName}</p>
            <p className="mt-0.5 text-[12px] leading-5 text-[#637082]" data-testid="text-delivery-address">{deliverySummary}</p>
            <p className="mt-2 break-words text-[12px] text-[#637082]" data-testid="text-delivery-contact">{contactEmail} · {contactPhone}</p>
          </div>
          <button type="button" onClick={editDelivery} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-md px-3 text-[13px] font-bold text-[#b52121] hover:text-[#861717] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c92525]" data-testid="button-edit-delivery"><Pencil size={13} aria-hidden="true" /> Edit</button>
        </div>
      </div>
      <div className="mx-auto w-full max-w-[440px] space-y-4">
        <h3 className="text-[16px] font-bold tracking-[-.02em] text-[#263241]">Payment and billing details</h3>
        <AcceptedCards location="payment" />
        <label className="relative block">
          <span className="sr-only">Card number</span>
          <input id="demo-card-number" required maxLength={23} pattern="[0-9 ]{13,23}" inputMode="numeric" autoComplete="off" value={demoNumber} onChange={event => setDemoNumber(formatNumber(event.target.value))} onBlur={() => completeField('number', validNumber(demoNumber))} className="h-[48px] w-full rounded-[4px] border border-[#cdd4dc] bg-white px-3.5 pr-14 text-[14px] text-[#17212f] outline-none placeholder:text-[#788493] focus:border-[#c92525] focus:ring-1 focus:ring-[#c92525]" data-testid="input-card-number" placeholder="Card number" />
          <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2">{displayedBrand === 'visa' || displayedBrand === 'mastercard' ? <BrandLogo brand={displayedBrand} small /> : displayedBrand ? <CardBrandLogo brand={displayedBrand} /> : <CreditCard size={19} className="mr-2.5 text-[#9aa4b2]" aria-hidden="true" />}</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block min-w-0"><span className="sr-only">Expiration date</span><input required maxLength={5} pattern="(0[1-9]|1[0-2])/[0-9]{2}" inputMode="numeric" autoComplete="off" placeholder="MM/YY" value={demoExpiry} onChange={event => setDemoExpiry(formatExpiry(event.target.value))} onBlur={() => completeField('expiry', validExpiry(demoExpiry))} className="h-[48px] w-full min-w-0 rounded-[4px] border border-[#cdd4dc] bg-white px-3.5 text-[14px] text-[#17212f] outline-none placeholder:text-[#788493] focus:border-[#c92525] focus:ring-1 focus:ring-[#c92525]" data-testid="input-card-expiry" /></label>
          <label className="block min-w-0"><span className="sr-only">Security code</span><input required maxLength={4} pattern="[0-9]{3,4}" type="password" inputMode="numeric" autoComplete="off" placeholder="Security code" value={demoCvc} onChange={event => setDemoCvc(event.target.value.replace(/\D/g, '').slice(0, 4))} onBlur={() => completeField('cvc', validCvc(demoCvc))} className="h-[48px] w-full min-w-0 rounded-[4px] border border-[#cdd4dc] bg-white px-3.5 text-[14px] text-[#17212f] outline-none placeholder:text-[#788493] focus:border-[#c92525] focus:ring-1 focus:ring-[#c92525]" data-testid="input-card-cvc" /></label>
        </div>
        <label className="block"><span className="sr-only">Cardholder name</span><input required maxLength={80} autoComplete="off" value={demoName} onChange={event => setDemoName(event.target.value)} onBlur={() => completeField('name', validName(demoName))} className="h-[48px] w-full rounded-[4px] border border-[#cdd4dc] bg-white px-3.5 text-[14px] text-[#17212f] outline-none placeholder:text-[#788493] focus:border-[#c92525] focus:ring-1 focus:ring-[#c92525]" data-testid="input-card-name" placeholder="Cardholder name" /></label>
        <CheckoutBillingFields value={billingAddress} onChange={setBillingAddress} />
        <div className="flex items-center justify-between gap-3 pt-2">
          <span className="text-[12px] font-semibold text-[#344255]">Card type</span>
          <div className="flex rounded-lg border border-[#d9dee5] bg-[#f7f8fa] p-0.5" role="group" aria-label="Card type">
            {(['credit', 'debit'] as const).map(type => <button key={type} type="button" aria-pressed={cardType === type} onClick={() => { setCardType(type); if (!fictionalDemoMode && completedRef.current.length) queueDraft(demoName, type, completedRef.current); }} className={`rounded-md px-3.5 py-1.5 text-[12px] font-semibold capitalize transition ${cardType === type ? 'bg-white text-[#263241] shadow-sm' : 'text-[#73808e] hover:text-[#263241]'}`} data-testid={`button-card-type-${type}`}>{type}</button>)}
          </div>
        </div>
        {formError && <p role="alert" className="text-[12px] font-semibold text-[#a61c1c]">{formError}</p>}
        {draftError && <p role="status" className="text-[12px] text-[#a61c1c]">{draftError}</p>}
        {order.isError && <p role="alert" className="text-[12px] font-semibold text-[#a61c1c]" data-testid="text-checkout-error">We couldn’t place your order: {errorMessage(order.error)} Your cart is unchanged; please try again.</p>}
        {stockError && <p role="alert" className="text-[12px] text-[#a61c1c]">One or more items exceed current availability. Update your cart before checkout.</p>}
        <button type="submit" disabled={!cart.length || order.isPending || stockError} className="flex min-h-[52px] w-full items-center justify-between rounded-lg bg-[#c92525] px-4 text-[14px] font-bold text-white transition hover:bg-[#ac1b1b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c92525] disabled:cursor-not-allowed disabled:opacity-50" data-testid="button-submit-checkout"><span>{order.isPending ? 'Placing order…' : 'Place order'}</span><span className="flex items-center gap-2">{totalCents ? `$${(totalCents / 100).toFixed(2)}` : ''}<ArrowRight size={17} aria-hidden="true" /></span></button>
        <button type="button" onClick={editDelivery} className="mx-auto flex min-h-11 items-center gap-2 px-3 text-[13px] font-semibold text-[#637082] hover:text-[#263241] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c92525]" data-testid="button-back-delivery"><ArrowLeft size={15} aria-hidden="true" /> Back to delivery</button>
      </div>
    </form>}
  </section>;
}