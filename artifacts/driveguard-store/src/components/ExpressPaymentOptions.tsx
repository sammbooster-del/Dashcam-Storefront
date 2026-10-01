export function ExpressPaymentOptions() {
  return <div className="mx-auto w-full max-w-[440px] space-y-3" data-testid="express-payment-options">
    <h3 className="text-[16px] font-bold tracking-[-.02em] text-[#263241]">Express payment</h3>
    <div className="grid grid-cols-2 gap-3">
      <button type="button" disabled aria-label="Apple Pay — coming soon" className="flex min-h-[76px] cursor-not-allowed flex-col items-center justify-center gap-2 rounded-lg border border-[#303740] bg-[#303740] px-3 py-3 text-white" data-testid="button-apple-pay-coming-soon">
        <span className="text-[19px] font-semibold tracking-[-.04em]">Apple Pay</span>
        <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold tracking-wide">Coming soon</span>
      </button>
      <button type="button" disabled aria-label="Google Pay — coming soon" className="flex min-h-[76px] cursor-not-allowed flex-col items-center justify-center gap-2 rounded-lg border border-[#d9dee5] bg-[#f7f8fa] px-3 py-3 text-[#344255]" data-testid="button-google-pay-coming-soon">
        <span className="text-[19px] font-semibold tracking-[-.04em]">Google Pay</span>
        <span className="rounded-full bg-[#e7ebf0] px-2 py-0.5 text-[10px] font-semibold tracking-wide">Coming soon</span>
      </button>
    </div>
    <p className="text-[12px] leading-5 text-[#637082]">Express payment is not available yet. Continue with credit or debit card below.</p>
    <div className="flex items-center gap-3 pt-2" aria-hidden="true">
      <div className="h-px flex-1 bg-[#e1e5e9]" />
      <span className="text-[11px] font-semibold text-[#637082]">Pay by card</span>
      <div className="h-px flex-1 bg-[#e1e5e9]" />
    </div>
  </div>;
}