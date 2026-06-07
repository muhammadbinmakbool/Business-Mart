# Business-Mart Developer Guide: Centralized Duplicate Records Checking Architecture

This document describes the design, API, and implementation details of the centralized duplicate checking architecture. It is designed to be reusable across any Prisma model (e.g., Parties, Products, etc.) to prompt the user with a warning modal, allowing them to either abort or bypass the constraint and save anyway.

---

## 1. Directory Structure

```
src/
├── components/
│   └── ui/
│       └── DuplicateWarningModal.js  # Reusable presentational warning dialog
├── lib/
│   └── database/
│       └── duplicateChecker.js       # Centralized Prisma-agnostic duplicate checking utility
├── modules/
│   └── parties/
│       ├── services/
│       │   └── PartyService.js       # Business logic layer wrapping the database checker
│       └── controllers/
│           └── partyActions.js       # Server action exposing duplicate checks to client
```

---

## 2. Centralized Database Helper (`duplicateChecker.js`)

The core duplicate checker `checkDuplicateRecord` matches candidates in the database case-insensitively and returns exactly which field(s) caused the conflict.

### API Signature:
```javascript
import { checkDuplicateRecord } from "@/lib/database/duplicateChecker";

/**
 * Checks if a record already exists with matching unique/conflicting fields.
 *
 * @param {string} modelName - The name of the Prisma model (lowercase, e.g. "party")
 * @param {Object} checkFields - Key-value pair of fields to check (e.g. { name: "Agent", phoneNumber: "0300" })
 * @param {Object} [options]
 * @param {string|number} [options.excludeId] - ID to exclude from check (useful during updates)
 * @param {boolean} [options.caseInsensitive] - Whether to perform case-insensitive comparison (default: true)
 * @returns {Promise<Object|null>} - Returns null if no match, or details of match: { found: true, matches: { fieldName: boolean }, record: Object }
 */
```

### Example Return Payload:
If a match is found on the phone number:
```json
{
  "found": true,
  "matches": {
    "name": false,
    "phoneNumber": true
  },
  "record": {
    "id": "clxb932k10000...",
    "name": "Test Agent",
    "phoneNumber": "0300-4445556"
  }
}
```

---

## 3. Presentational Warning Modal (`DuplicateWarningModal.js`)

A clean, presentational overlay built using the application's base `<Modal />` component. It provides custom warnings and prompts the user for action.

```javascript
import DuplicateWarningModal from "@/components/ui/DuplicateWarningModal";

<DuplicateWarningModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onConfirm={handleConfirmSave}
  duplicateMessage="A party with the phone number '0300-4445556' (named 'Test Agent') already exists."
  title="Duplicate Phone Number Detected"
  entityName="Party"
  loading={isSaving}
/>
```

#### Properties (Props):
| Prop Name | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `isOpen` | Boolean | `false` | Controls visibility of the dialog overlay. |
| `onClose` | Function | — | Triggered when the dialog is dismissed or "Cancel" is clicked. |
| `onConfirm` | Function | — | Triggered when "Yes, Save Anyway" is clicked. |
| `duplicateMessage` | String | — | Detailed explanation of exactly what records are in conflict. |
| `title` | String | `'Duplicate Party Detected'` | Dynamic title specifying the exact duplicated fields. |
| `entityName` | String | `'Party'` | Singularity label of the object being handled (e.g. `'Product'`). |
| `loading` | Boolean | `false` | Disables buttons and changes action label to "Saving..." during processing. |

---

## 4. Integration Guide & Interception Flow

To add duplicate warning validation to a new module/page:

### Step A: Wrap the utility in the Service Layer
```javascript
import { checkDuplicateRecord } from "@/lib/database/duplicateChecker";

export class ProductService {
  static async checkDuplicate(name, sku, excludeId = null) {
    return await checkDuplicateRecord("product", { name, sku }, { excludeId });
  }
}
```

### Step B: Expose a Server Action
```javascript
"use server";

export async function checkProductDuplicateAction(name, sku, excludeId = null) {
  try {
    const duplicate = await ProductService.checkDuplicate(name, sku, excludeId);
    return { success: true, duplicate };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

### Step C: Handle Client Interception and `NEXT_REDIRECT`
Intercept submission inside the form component. If duplicates are found, capture the fields and prompt the user.

```javascript
// State variables
const [isWarningOpen, setIsWarningOpen] = useState(false);
const [warningData, setWarningData] = useState(null);
const [duplicateMessage, setDuplicateMessage] = useState("");
const [warningTitle, setWarningTitle] = useState("");
const [isSaving, setIsSaving] = useState(false);

// Intercept submission
async function handleSaveTrigger(formData) {
  const name = formData.get("name");
  const sku = formData.get("sku");

  setIsSaving(true);
  try {
    const checkRes = await checkProductDuplicateAction(name, sku);
    if (checkRes?.success && checkRes.duplicate) {
      const { matches, record } = checkRes.duplicate;
      const nameExists = !!matches?.name;
      const skuExists = !!matches?.sku;
      
      let msg = "";
      let title = "Duplicate Product Detected";
      if (nameExists && skuExists) {
        msg = `A product named "${record.name}" with the SKU "${record.sku}" already exists.`;
        title = "Duplicate Name & SKU";
      } else if (nameExists) {
        msg = `A product named "${record.name}" already exists.`;
        title = "Duplicate Name Detected";
      } else if (skuExists) {
        msg = `A product with the SKU "${record.sku}" (named "${record.name}") already exists.`;
        title = "Duplicate SKU Detected";
      }

      setDuplicateMessage(msg);
      setWarningTitle(title);
      setWarningData(formData);
      setIsWarningOpen(true);
    } else {
      await proceedSave(formData);
    }
  } catch (e) {
    toast.error("Failed to check for duplicates");
  } finally {
    setIsSaving(false);
  }
}

// Actual Save Handler
async function proceedSave(formData) {
  setIsSaving(true);
  try {
    const result = await createProductAction(formData);
    if (result?.error) {
      toast.error(result.error);
      setIsSaving(false);
      return;
    }
    toast.success("Product created successfully");
  } catch (e) {
    // CRITICAL: Catch and rethrow NEXT_REDIRECT to allow Next.js server redirection
    if (e.message?.includes("NEXT_REDIRECT") || e.digest?.includes("NEXT_REDIRECT")) {
      throw e;
    }
    toast.error("An unexpected error occurred while saving");
    setIsSaving(false);
  }
}
```
