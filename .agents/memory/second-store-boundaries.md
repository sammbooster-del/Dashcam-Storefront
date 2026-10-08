---
name: Second-store boundaries
description: Owner requirements for adding a separate general-product store without changing DriveGuard.
---

The second website is a general physical-product store, not skincare-only. Reuse the existing admin and backend where appropriate, but keep its catalog, inventory, orders, settings, and branding separate. Domain assignment must not change DriveGuard's design, products, or payment flows. Preserve existing data and authentication.

**Why:** The owner explicitly requested a second website alongside the original, not a replacement or a redesign of it.

**How to apply:** Add isolated store capabilities and domain-to-website selection without migrating or overwriting the original product system.

Both checkout experiences are intended only for the owner and their team, using externally generated test details; there are no real clients or intended public customers.

**Why:** The owner repeatedly clarified that this is an internal team-testing setup, not a customer-facing commerce launch.

**How to apply:** Do not ask the owner to reconfirm internal use or suggest a public customer launch. Distinguish intended internal use from technically enforced access restrictions; never claim the app is access-restricted without verifying that. Internal intent does not authorize unrestricted capture of real payment credentials.

Do not use the merchant name specified in the uploaded second-store brief anywhere. That part of the attachment was explicitly withdrawn by the owner's subsequent instruction.

**Why:** The latest owner instruction overrides the attachment's merchant-description requirement.

**How to apply:** Exclude that name from branding, defaults, payment descriptions, and metadata. Do not reinstate it when consulting the attachment.

The Everyday shop must have no payment or checkout experience, payment-brand logos, or customer verification controls. Keep browsing and cart selection, preserve existing order records, and leave the original DriveGuard checkout unchanged.

**Why:** After rejecting the separately implemented shop checkout, the owner explicitly said to remove everything about payment from the shop. This supersedes the earlier request to reuse the simulation.

**How to apply:** Do not restore shop checkout, wallets, card fields, or verification without an explicit new request. Old shop checkout URLs must not revive the removed flow or create new reservations. Preserve order history and existing cancellation/fulfillment maintenance rather than deleting audit records.

If the owner explicitly requests shop checkout again, their expectation is reuse of the camera site's actual payment routes and live-update workflow, not merely similar styling or a separately implemented checkout.

**Why:** The owner explicitly corrected the distinction between copying the checkout and using the same payment routes.

**How to apply:** Prefer a shared checkout integration while preserving each store's catalog, inventory, and order isolation. Exact unmasked displays may use verified synthetic values issued by the owner's external server, not only a hard-coded fixture list; never extend collection of arbitrary full payment-card numbers or CVC.

While both sites had checkout, the owner used the two sites one at a time and wanted one shared live-checkout view, with updates replacing the same session entry rather than producing duplicate entries or panels. Shop live-checkout publishing is now outside the requested scope because its checkout was removed.

**Why:** The owner explicitly requested a single live entry for both websites.

**How to apply:** Group by browser session rather than store or per-order nonce; keep order identifiers separate so deduplication does not break order idempotency. Browser storage shares an identity across same-origin storefront paths, not unrelated custom domains.
