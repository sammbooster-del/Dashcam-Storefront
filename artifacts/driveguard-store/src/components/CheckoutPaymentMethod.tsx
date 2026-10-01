import { ArrowRight, CreditCard } from 'lucide-react';
import { AcceptedCards } from './AcceptedCards';
import { ExpressPaymentOptions } from './ExpressPaymentOptions';

export function CheckoutPaymentMethod({ selected, onSelect, onContinue, unavailable }: {
  selected: boolean;
  onSelect: () => void;
  onContinue: () => void;
  unavailable: boolean;
}) {
  return <form className="space-y-6 px-5 py-7 sm:px-8 sm:py-8" data-testid="form-payment-method" onSubmit={event => {
    event.preventDefault();
    if (selected && !unavailable) onContinue();
  }}>
    <ExpressPaymentOptions />
    <label className={`mx-auto block w-full max-w-[440px] cursor-pointer rounded-xl border-2 p-4 transition focus-within:ring-2 focus-within:ring-[#c92525]/20 ${selected ? 'border-[#c92525] bg-[#fff8f7]' : 'border-[#dfe3e8] bg-white hover:border-[#aab3bf]'}`}>
      <div className="flex items-center gap-3">
        <input type="radio" name="payment-method" value="card" checked={selected} onChange={onSelect} className="h-5 w-5 shrink-0 accent-[#c92525]" data-testid="radio-payment-card" />
        <CreditCard size={22} className="text-[#344255]" aria-hidden="true" />
        <span className="text-[15px] font-bold text-[#263241]">Credit or debit card</span>
      </div>
      <div className="mt-4 pl-8"><AcceptedCards location="payment-method" /></div>
    </label>
    <div className="mx-auto w-full max-w-[440px] space-y-3">
      <p className="text-[12px] leading-5 text-[#637082]">{selected ? 'Card selected. Click Next to add your contact and delivery details.' : 'Select credit or debit card to continue.'}</p>
      {unavailable && <p role="alert" className="text-[12px] text-[#a61c1c]">Update your cart before continuing. One or more items are unavailable.</p>}
      <button type="submit" disabled={!selected || unavailable} className="flex min-h-[52px] w-full items-center justify-between rounded-lg bg-[#c92525] px-4 text-[14px] font-bold text-white transition hover:bg-[#ac1b1b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c92525] disabled:cursor-not-allowed disabled:opacity-50" data-testid="button-payment-method-next">
        <span>Next</span><ArrowRight size={18} aria-hidden="true" />
      </button>
    </div>
  </form>;
}