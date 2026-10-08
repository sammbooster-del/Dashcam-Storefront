---
name: Second-store boundaries
description: Owner requirements for adding a separate general-product store without changing DriveGuard.
---

The second website is a general physical-product store, not skincare-only. Reuse the existing admin and backend where appropriate, but keep its catalog, inventory, orders, settings, and branding separate. Domain assignment must not change DriveGuard's design, products, or payment flows. Preserve existing data and authentication.

**Why:** The owner explicitly requested a second website alongside the original, not a replacement or a redesign of it.

**How to apply:** Add isolated store capabilities and domain-to-website selection without migrating or overwriting the original product system.

Do not use the merchant name specified in the uploaded second-store brief anywhere. That part of the attachment was explicitly withdrawn by the owner's subsequent instruction.

**Why:** The latest owner instruction overrides the attachment's merchant-description requirement.

**How to apply:** Exclude that name from branding, defaults, payment descriptions, and metadata. Do not reinstate it when consulting the attachment.

Reuse the existing simulated checkout for the second store. Do not add a payment provider, require a separate merchant account, or initiate real charges. Keep simulation identifiers internal and the original DriveGuard payment behavior unchanged.

**Why:** The owner explicitly overrode the attachment's real-payment requirement with “just use the same simulation that already exist.”

**How to apply:** Use the existing manual verification workflow. Follow the UI-wording rule in demo-order-inventory.md: the owner does not want simulation/no-charge notices anywhere on either website or admin. Separate test reservations and simulated sales from configured physical stock; make approval and cancellation idempotent.
