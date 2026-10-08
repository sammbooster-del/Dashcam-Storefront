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

Reuse an existing, confirmed real-payment integration; do not add another provider or require a separate merchant account without changed instructions. Do not initiate real payment tests without approval. Manual test-code approval is not proof of payment.

**Why:** The owner requires real, verified payments for the new store while forbidding simulated payment confirmations and unapproved provider changes.

**How to apply:** Resolve any missing payment integration before promising a working paid checkout. Payment settlement and stock changes must rely on authenticated, idempotent payment confirmation.
