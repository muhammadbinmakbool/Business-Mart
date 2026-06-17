# Unit System Upgrade Guide

This guide details the architectural changes introduced during the transition from a static unit system to a dynamic, database-driven Unit Registry in Business Mart.

## Architectural Overview

Historically, the application relied on hardcoded unit constants defined in `src/lib/units.js`. To support customizable, multi-tenant, and admin-configurable units, a normalized database schema was introduced alongside a request-cached `UnitRegistry`.

### 1. Database Schema (Prisma)

Three core tables model unit categories, individual units, and their relation to products:

```prisma
model UnitCategory {
  id        Int     @id @default(autoincrement())
  name      String
  code      String  @unique // e.g., WEIGHT, LIQUID, QUANTITY
  isActive  Boolean @default(true)
  units     Unit[]
}

model Unit {
  id               Int          @id @default(autoincrement())
  name             String
  code             String       @unique // e.g., KG, MAUND, LITER, BAG
  conversionRate   Decimal      @default(1.0) // Relative to category base unit
  isBase           Boolean      @default(false)
  isCustom         Boolean      @default(false)
  isActive         Boolean      @default(true)
  unitCategoryCode String
  category         UnitCategory @relation(fields: [unitCategoryCode], references: [code])
}
```

### 2. The Unit Registry (`UnitRegistry`)

To prevent chatty database fetches and ensure consistent runtime behaviour across the UI, a cached, unified registry snapshot is retrieved via `UnitService.getUnitRegistry()` and exposed to client components using the `getUnitRegistryAction` server action.

The structure of the registry is:
```json
{
  "units": {
    "KG": { "code": "KG", "name": "Kilogram", "conversionRate": 1.0, "isBase": true, "unitCategoryCode": "WEIGHT", "isCustom": false },
    "MAUND": { "code": "MAUND", "name": "Maund", "conversionRate": 40.0, "isBase": false, "unitCategoryCode": "WEIGHT", "isCustom": false },
    ...
  },
  "categories": {
    "WEIGHT": { "code": "WEIGHT", "name": "Weight", "baseUnitCode": "KG" },
    ...
  }
}
```

---

## Centralized Math & Conversion Rules

Unit conversion math remains decoupled from database objects. All mathematical operations are defined in `src/lib/units.js` and accept an optional `unitRegistry` parameter.

### Conversion Math Direction
The `conversionRate` represents **how many base units are contained within 1 instance of the target unit**.
* Example: `KG` is the base unit of the `WEIGHT` category (`conversionRate = 1.0`).
* `MAUND` has a `conversionRate = 40.0`, meaning `1 Maund = 40 Kilograms`.

### Principal API Functions

```javascript
// Normalizes any unit value to its category's base unit.
export function normalizeQuantity(value, unitCode, product = null, unitRegistry = null);

// Converts a base unit value to the target unit.
export function convertFromBase(baseValue, unitCode, product = null, unitRegistry = null);
```

#### Backward Compatibility & Fallback Rule
If `unitRegistry` is not passed or a unit is not found in the database-backed registry, the helper functions fall back to the static `UNITS` definition in `src/lib/units.js` to ensure the application remains operational during rollout or in secondary threads.

---

## Form Integration Guidelines

Forms requiring unit validation, compatibility rules, or conversions must follow this standardized pattern:

1. **Import the Server Action**:
   ```javascript
   import { getUnitRegistryAction } from "@/modules/products/controllers/unitActions";
   ```

2. **Define State**:
   ```javascript
   const [unitRegistry, setUnitRegistry] = useState(null);
   ```

3. **Fetch on Mount**:
   ```javascript
   useEffect(() => {
     async function loadRegistry() {
       const res = await getUnitRegistryAction();
       if (res.success) setUnitRegistry(res.data);
     }
     loadRegistry();
   }, []);
   ```

4. **Pass to Utilities**:
   Pass `unitRegistry` to all invocation instances of `normalizeQuantity`, `convertFromBase`, `normalizeRate`, and `calculateIntakeNetWeight`.
