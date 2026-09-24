---
name: Demo order inventory
description: Why DriveGuard's simulated orders do not consume physical stock.
---

Demo orders are a demonstration of the checkout flow, not real sales. Keep their order records and totals separate from physical inventory changes; an administrator adjusts actual stock deliberately.

**Why:** Card checkout is simulation-only, with no payment or fulfillment. Decrementing real stock after a simulated checkout would make the public availability misleading for actual customers.

**How to apply:** Keep shopper copy clear that placing a demo order does not reserve a unit. If real payment and fulfillment are introduced later, revisit this rule and atomically reserve or decrement stock as part of the real order transaction.