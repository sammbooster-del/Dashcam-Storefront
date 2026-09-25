import { useState } from 'react';
import { ArrowRight, Check, CreditCard, ShieldCheck } from 'lucide-react';

type TestVerificationScreenProps = {
  orderId: number;
  cardLast4: string;
  totalCents: number;
  onContinue: () => void;
};

type ReviewMethod = 'guided' | 'quick';

export function TestVerificationScreen({
  orderId,
  cardLast4,
  totalCents,
  onContinue,
}: TestVerificationScreenProps) {
  const [method, setMethod] = useState<ReviewMethod>('guided');
  const last4 = cardLast4.replace(/\D/g, '').slice(-4);
  const amount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(totalCents / 100);
  const date = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());

  return (
    <section
      aria-labelledby="test-verification-title"
      data-testid="screen-test-verification"
      className="mx-auto w-full max-w-[560px] overflow-hidden rounded-xl border border-[#dfe3e8] bg-white shadow-[0_14px_36px_-30px_rgba(28,37,50,.3)]"
    >
      <div className="border-b border-[#e7eaee] bg-[#f7f8fa] px-5 py-4 sm:px-7">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f9e9e9] text-[#bd2525]">
            <ShieldCheck size={19} strokeWidth={1.9} aria-hidden="true" />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[.12em] text-[#a62020]">
              DriveGuard · Internal test
            </p>
            <p className="text-[12px] text-[#687586]">Order #{orderId}</p>
          </div>
        </div>
      </div>

      <div className="px-5 pb-6 pt-6 sm:px-7 sm:pb-7 sm:pt-7">
        <h2
          id="test-verification-title"
          className="text-[24px] font-bold leading-tight tracking-[-.035em] text-[#1c2734] sm:text-[27px]"
        >
          Review this test order
        </h2>
        <p className="mt-2 text-[13px] leading-6 text-[#637082]">
          A test review was requested for this order. Check the details below before continuing.
        </p>

        <div className="mt-5 rounded-lg border border-[#e4d5b9] bg-[#fffaf0] px-4 py-3.5">
          <p className="text-[13px] font-bold text-[#504332]">No real verification is taking place.</p>
          <p className="mt-1 text-[12px] leading-5 text-[#695b47]">
            This is an internal simulation. No payment will be charged, no message will be sent,
            and you will not be asked for a code.
          </p>
        </div>

        <div className="mt-6 overflow-hidden rounded-lg border border-[#dfe3e8]">
          <div className="flex items-center justify-between gap-3 border-b border-[#edf0f2] bg-[#fafbfc] px-4 py-3">
            <span className="text-[11px] font-bold uppercase tracking-[.1em] text-[#768292]">
              Order details
            </span>
            <span className="rounded-md bg-[#eaf3ed] px-2 py-1 text-[10px] font-bold uppercase tracking-[.07em] text-[#326344]">
              Test only
            </span>
          </div>
          <dl className="divide-y divide-[#edf0f2] px-4">
            <div className="flex items-center justify-between gap-4 py-3.5">
              <dt className="text-[12px] text-[#748090]">Merchant</dt>
              <dd className="text-right text-[13px] font-semibold text-[#263241]">DriveGuard Test Store</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3.5">
              <dt className="text-[12px] text-[#748090]">Card</dt>
              <dd className="flex items-center gap-2 text-right text-[13px] font-semibold text-[#263241]">
                <CreditCard size={16} className="text-[#748090]" aria-hidden="true" />
                <span>•••• {last4 || '••••'}</span>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3.5">
              <dt className="text-[12px] text-[#748090]">Date</dt>
              <dd className="text-right text-[13px] font-semibold text-[#263241]">{date}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3.5">
              <dt className="text-[12px] text-[#748090]">Test total</dt>
              <dd className="text-right text-[17px] font-bold tracking-[-.02em] text-[#1c2734]">{amount}</dd>
            </div>
          </dl>
        </div>

        <fieldset className="mt-7">
          <legend className="text-[14px] font-bold text-[#263241]">Choose how to review</legend>
          <p className="mt-1 text-[12px] leading-5 text-[#748090]">
            Both options stay on this site. Neither sends a message.
          </p>
          <div className="mt-3 space-y-2.5">
            {([
              { value: 'guided', title: 'Guided review', description: 'Continue with an on-screen test walkthrough.' },
              { value: 'quick', title: 'Quick review', description: 'Continue directly to the test result.' },
            ] as const).map(option => (
              <label
                key={option.value}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3.5 transition-colors ${
                  method === option.value
                    ? 'border-[#c92525] bg-[#fff8f7]'
                    : 'border-[#dfe3e8] bg-white hover:border-[#aab4c0]'
                }`}
              >
                <input
                  type="radio"
                  name="test-review-method"
                  value={option.value}
                  checked={method === option.value}
                  onChange={() => setMethod(option.value)}
                  className="sr-only"
                />
                <span
                  aria-hidden="true"
                  className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border ${
                    method === option.value
                      ? 'border-[#c92525] bg-[#c92525] text-white'
                      : 'border-[#aab4c0] bg-white'
                  }`}
                >
                  {method === option.value && <Check size={12} strokeWidth={3} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-bold text-[#263241]">{option.title}</span>
                  <span className="mt-0.5 block text-[12px] leading-5 text-[#748090]">{option.description}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <button
          type="button"
          onClick={onContinue}
          data-testid="button-test-verification-next"
          className="mt-6 flex min-h-[52px] w-full items-center justify-between rounded-lg bg-[#c92525] px-4 text-[14px] font-bold text-white transition-colors hover:bg-[#ac1b1b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c92525]"
        >
          <span>Next</span>
          <ArrowRight size={17} aria-hidden="true" />
        </button>
        <p className="mt-3 text-center text-[11px] leading-5 text-[#818b97]">
          Internal test only. Continuing does not authorize a charge or contact anyone.
        </p>
      </div>
    </section>
  );
}