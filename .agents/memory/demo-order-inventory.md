---
name: Demo order inventory
description: Why DriveGuard's simulated orders do not consume physical stock.
---

Demo orders are a demonstration of the checkout flow, not real sales. Keep their order records and totals separate from physical inventory changes; an administrator adjusts actual stock deliberately.

**Why:** Card checkout is simulation-only, with no payment or fulfillment. Decrementing real stock after a simulated checkout would make the public availability misleading for actual customers.

**How to apply:** Keep shopper copy clear that placing a demo order does not reserve a unit. If real payment and fulfillment are introduced later, revisit this rule and atomically reserve or decrement stock as part of the real order transaction.

Live demo checkout previews may show the shopper's entered demo name and which fields were completed, but must not transmit or store typed card number, expiry, or CVC values. With more than one preset brand, completion flags alone cannot identify the selected number: use a brand-neutral admin label unless a separate safe demo-brand enum is added.

**Why:** A browser cannot know whether a number someone types into a "fake" form is actually a real card. Keeping those values out of requests and storage preserves the simulation-only boundary.

**How to apply:** For future live checkout features, send only non-payment metadata and server-defined demo indicators. Never add arbitrary card-like input to the public or admin API.