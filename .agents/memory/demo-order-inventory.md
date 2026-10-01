---
name: Demo order inventory
description: Why DriveGuard's simulated orders do not consume physical stock.
---

Demo orders are a demonstration of the checkout flow, not real sales. Keep their order records and totals separate from physical inventory changes; an administrator adjusts actual stock deliberately.

**Why:** Card checkout is simulation-only, with no payment or fulfillment. Decrementing real stock after a simulated checkout would make the public availability misleading for actual customers.

**How to apply:** Keep the order confirmation accurate that no inventory was reserved. If real payment and fulfillment are introduced later, revisit this rule and atomically reserve or decrement stock as part of the real order transaction.

Internal employee testing uses system-generated card-formatted test values. The administrator wants the exact test number, expiry, and CVC visible live while typing and on completed demo orders, without replacing them with a DEMO-prefixed identifier. This is an admin-controlled internal test mode; when off, typed values remain browser-local.

**Why:** The earlier DEMO-prefixed substitute did not meet the user's stated testing need. The user clarified that employees use system-generated test cards, not real payment credentials.

**How to apply:** Keep the on/off boundary enforced on the server and preserve a concise shopper-facing warning not to enter a real payment card and that no charge is made. The team requested an otherwise normal-looking storefront with no demo/test badges or repeated instructional copy; keep detailed mode information in admin. Before a real checkout launch, replace test-card collection with a payment provider's hosted collection flow rather than using this preview for real payments.

The checkout may adopt the familiar layout of a modern payment form, but it must not claim to be powered by Stripe or imply that a real charge is possible.

**Why:** The user wants a polished, Stripe-like experience while explicitly keeping the checkout simulated. Provider branding or real-payment security claims would misrepresent what the form does.

**How to apply:** Do not claim a charge or reservation happened. Preserve the short no-charge caution even when the shopper-facing layout otherwise looks like a standard checkout. Only introduce payment-provider claims after a real integration is implemented and verified.

Express wallets are previews only: keep Apple Pay and Google Pay clearly marked Coming soon and disabled. Only the existing card checkout should be usable.

**Why:** The owner explicitly requested future express-payment options without enabling them or changing the current card flow.

**How to apply:** Do not activate wallet payments or add a real-payment integration without a new request. Coming-soon controls must not submit the card form or launch a payment.

The email and phone choices describe how the team shared a code outside this app. They are not delivery channels operated by the app. The app receives the shopper's submitted code for manual admin review, rather than generating or validating it against an app-issued code.

**Why:** The user clarified that their team already generates codes elsewhere and gives them to testers. They want the code entered by the shopper visible to the admin, not an admin-configured or app-generated code.

**How to apply:** Never claim this app sent an email or SMS. After a shopper selects email or phone, keep them waiting until admin confirms the team shared the code externally; only then open code entry. Show submitted codes only on authenticated admin responses, and keep the shopper waiting again until admin approves or declines. The user explicitly removed repeated no-charge disclosure lines from the waiting and verification screens; do not restore them there.