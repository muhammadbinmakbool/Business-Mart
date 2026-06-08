# Operator Guide — Fast Entry System

Welcome to the Fast Entry System! This system makes entering purchase intakes and sales invoices quick, keyboard-first, and highly automated. 

By eliminating the need to click back and forth between input fields, you can record transactions continuously without lifting your hands from the keyboard.

---

## 1. Keyboard Navigation Shortcuts

You can navigate all fields using simple keyboard shortcuts:

| Shortcut | Action | Description |
|---|---|---|
| **Enter** | Move to Next Field | Advances focus to the next logical input or select box. |
| **Shift + Enter** | Move to Previous Field | Goes back to the previous input if you need to make a correction. |
| **Ctrl + Enter** | Save Form | Submits and saves the transaction immediately from any field. |
| **Escape** | Reset / Cancel | Closes modals or cancels out of the current form. |

> [!NOTE]
> When you navigate to a number input (like Weight or Rate), the system automatically selects the text. You can start typing new numbers immediately to overwrite it without pressing backspace.

---

## 2. Multi-Line Item Entry (Sales Billing)

When you are creating a Sales Invoice with multiple products, you can add new rows directly from the keyboard:
1. Navigate to the **Rate** field of your last row.
2. Type in the rate.
3. Press **Enter** (without modifiers).
4. A new empty row is appended automatically, and the cursor jumps to the **Product** selector of the new row.

---

## 3. Smart Autofill Suggestions (Memory Layer)

The system remembers the last values you saved successfully and suggests them when you start a new form.

### Supplier & Buyer Memory:
- **Intake**: Shows the last Supplier used.
- **Sales**: Shows the last Buyer used.

### Product & Rate Memory:
- **Product**: Suggests the last recorded product. When adding multiple items to a Sale, the system suggests the product of the previous row.
- **Unit**: Suggests the last unit used.
- **Rate**: Suggests the last rate used. When adding multiple rows to a Sale, it suggests the rate of the previous row.

### How to use suggestions:
1. If a field is empty, a subtle suggestion label appears underneath it (e.g. `Suggested: Salim & Co (Click to apply)`).
2. If you want to use it, **click the suggestion label**. The value will instantly populate the field.
3. If you want to type something else, just type normally. The suggestion helper will automatically disappear as you type.

---

## 4. "Save & Add Another" Workflow

At the bottom of the creation forms, there is a **Save & Add Another** checkbox:
- **Active (Checked)**: Pressing `Ctrl + Enter` (or clicking complete/save) saves the record and resets the form, but keeps the Supplier/Buyer and Product selected, focusing the cursor on the Weight or Product field. This is ideal for recording multiple intakes or sales back-to-back.
- **Inactive (Unchecked)**: Saves the record and redirects you to the ledger/list view.
