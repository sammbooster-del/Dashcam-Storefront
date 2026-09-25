---
name: Demo order inventory
description: Why DriveGuard's simulated orders do not consume physical stock.
---

Demo orders are a demonstration of the checkout flow, not real sales. Keep their order records and totals separate from physical inventory changes; an administrator adjusts actual stock deliberately.

**Why:** Card checkout is simulation-only, with no payment or fulfillment. Decrementing real stock after a simulated checkout would make the public availability misleading for actual customers.

**How to apply:** Keep shopper copy clear that placing a demo order does not reserve a unit. If real payment and fulfillment are introduced later, revisit this rule and atomically reserve or decrement stock as part of the real order transaction.

Live demo checkout previews may show the shopper's entered demo name and which fields were completed, but must not transmit or store typed card number, expiry, or CVC values. Completion flags cannot identify a typed number: use brand-neutral, value-neutral admin labels.

**Why:** A browser cannot know whether a number someone types into a "fake" form is actually a real card. Keeping those values out of requests and storage preserves the simulation-only boundary.

**How to apply:** For future live checkout features, send only non-payment metadata and server-defined demo indicators. Never add arbitrary card-like input to the public or admin API.

An explicitly non-card, DEMO-prefixed identifier may be entered, transmitted, and displayed exactly when the administrator enables fictional demo mode. Do not treat that identifier as a payment credential or loosen its format to accept card-like digits. Switching back to the card-style form must not transmit its typed values.

**Why:** The administrator wants an exact value visible in orders, but arbitrary card-formatted fields can contain real payment information even in a demo. A visibly fictional, server-validated identifier satisfies the demonstration without crossing that boundary.

**How to apply:** Keep the mode server-enforced, reject card-format submissions while fictional mode is on, and never store card number, expiry, or CVC in either mode.

The checkout may adopt the familiar layout of a modern payment form, but it must not claim to be powered by Stripe or imply that a real charge is possible.

**Why:** The user wants a polished, Stripe-like experience while explicitly keeping the checkout simulated. Provider branding or real-payment security claims would misrepresent what the form does.

**How to apply:** Preserve clear simulation and no-charge labels in future visual updates. The demo may accept made-up card-formatted input without limiting shoppers to fixed presets, but those inputs must stay in browser memory only. Only introduce payment-provider claims after a real integration is implemented and verified.