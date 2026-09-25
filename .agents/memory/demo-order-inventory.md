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

The email and phone choices in simulated verification are labels for a test-code workflow, not delivery channels.

**Why:** The user explicitly clarified that no email or text should be sent; their team will obtain the app-generated test code from the admin view and provide it for the simulation.

**How to apply:** Never claim a message was delivered or add real email/SMS delivery to this flow without a new request. Keep the generated test code restricted to admin responses, and keep shoppers' verification pending until the admin chooses an outcome.