---
name: Demo order inventory
description: Why DriveGuard's simulated orders do not consume physical stock.
---

Demo orders are a demonstration of the checkout flow, not real sales. Keep their order records and totals separate from physical inventory changes; an administrator adjusts actual stock deliberately.

**Why:** Card checkout is simulation-only, with no payment or fulfillment. Decrementing real stock after a simulated checkout would make the public availability misleading for actual customers.

**How to apply:** Keep shopper copy clear that placing a demo order does not reserve a unit. If real payment and fulfillment are introduced later, revisit this rule and atomically reserve or decrement stock as part of the real order transaction.

Internal employee testing uses system-generated card-formatted test values. The administrator wants the exact test number, expiry, and CVC visible live while typing and on completed demo orders, without replacing them with a DEMO-prefixed identifier. This is an explicitly opt-in test mode; when off, typed values remain browser-local.

**Why:** The earlier DEMO-prefixed substitute did not meet the user's stated testing need. The user clarified that employees use system-generated test cards, not real payment credentials.

**How to apply:** Keep the on/off boundary enforced on the server and label the mode as test-only. Never imply that this form processes payments or is suitable for real card details. Before a real checkout launch, replace test-card collection with a payment provider's hosted collection flow rather than using this preview for real payments.

The checkout may adopt the familiar layout of a modern payment form, but it must not claim to be powered by Stripe or imply that a real charge is possible.

**Why:** The user wants a polished, Stripe-like experience while explicitly keeping the checkout simulated. Provider branding or real-payment security claims would misrepresent what the form does.

**How to apply:** Preserve clear simulation and no-charge labels in future visual updates. Only introduce payment-provider claims after a real integration is implemented and verified.