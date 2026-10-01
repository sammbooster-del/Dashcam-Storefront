import { Check } from 'lucide-react';

export type CheckoutStep = 'method' | 'delivery' | 'payment';
const stages = [
  { key: 'method', label: 'Method' },
  { key: 'delivery', label: 'Delivery' },
  { key: 'payment', label: 'Payment' },
] as const;

export function CheckoutProgress({ step }: { step: CheckoutStep }) {
  const current = stages.findIndex(stage => stage.key === step);
  return <ol className="mt-7 flex items-center justify-between gap-2" aria-label={`Checkout progress: step ${current + 1} of 3`}>
    {stages.map((stage, index) => <li key={stage.key} className="flex items-center gap-2" aria-current={index === current ? 'step' : undefined}>
      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold ${index < current ? 'bg-[#263241] text-white' : index === current ? 'bg-[#c92525] text-white' : 'border border-[#cbd2da] bg-white text-[#758190]'}`}>
        {index < current ? <Check size={14} aria-hidden="true" /> : `0${index + 1}`}
      </span>
      <span className={`text-[11px] font-bold sm:text-[12px] ${index === current ? 'text-[#1c2734]' : 'text-[#758190]'}`}>{stage.label}</span>
    </li>)}
  </ol>;
}