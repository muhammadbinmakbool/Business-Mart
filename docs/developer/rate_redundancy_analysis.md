# Intake Rate Prefilling & Nomenclature Alignment

This document outlines the architectural changes, UI behaviors, and design parameters implemented to automate purchase cost prefilling for Goods Intake while maintaining strict boundaries between master and transactional data.

## 1. Architectural Strategy

We avoid a global, premature `PricingService` by implementing a domain-local helper, `IntakePricingResolver.js`, under `src/modules/intake/utils/`. This class interacts directly with Prisma to achieve high performance and decoupling.

### Prefill Heuristics Precedence Order
1. **SupplierProduct Master Defaults (Future Hook)**: Hook reserved for custom supplier-product mapping (v2).
2. **Recent Supplier Purchase**: Checks if the selected supplier has an intake record for the selected product within a 60-day window (`PURCHASE_HISTORY_LOOKBACK_DAYS`).
3. **Product Catalog Default**: Falls back to the product's `defaultBuyingRate` from the catalog.
4. **Manual Entry Required**: Leaves the input blank if no history or catalog default is defined.

## 2. Nomenclature Alignment

To align the terminology with standard ERP patterns, the following UI-level labels were updated:
- **Product Forms**:
  - `Default Buying Rate` $\rightarrow$ `Default Cost (Optional)`
  - `Default Selling Rate` $\rightarrow$ `Selling Price (Optional)`
- **Intake Forms (Purchase Mode)**:
  - `Purchase Rate` $\rightarrow$ `Purchase Cost`

*Note: No database migrations were performed; schemas and DTOs retain the original database fields (`defaultBuyingRate`, `defaultSellingRate`, `rate`, etc.) to prevent breaking changes.*

## 3. UI Safety & Dirty State Protection

To protect manual user edits:
- We track if the user has manually edited the purchase cost field with a dirty state (`isRateDirty`).
- Changing the selected Product or Supplier resets `isRateDirty` and triggers a fresh lookback lookup.
- If the user has manually edited the field, changing options does not overwrite their custom input until a new selection resets the dirty flag.
- When a prefilled cost is loaded, a context-sensitive label is displayed under the input field (e.g., `* Using last supplier purchase rate` or `* Using default product cost`).

## 4. Automated Verification

Unit tests are implemented in `src/modules/intake/utils/IntakePricingResolver.test.js` covering:
1. **Recent History Match**: Returns recent purchase cost within 60 days.
2. **Stale History Fallback**: Falls back to product catalog default if recent purchase is older than 60 days.
3. **Empty Fallback**: Returns `null` when neither history nor catalog default is defined.
4. **Product/Supplier Isolation**: Verifies that isolation queries filter specifically by matching both the product ID and the supplier ID.
