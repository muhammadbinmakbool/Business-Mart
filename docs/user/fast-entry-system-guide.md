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
1. If a field is empty, a suggestion appears underneath it with a sparkle icon and an **Apply** button (e.g. `✨ Suggested: Basmati Rice [APPLY]`).
2. If you want to use it, **click the Apply button**. The value will instantly populate the field, and the suggestion will disappear.
3. If you want to type something else, just type normally. The suggestion helper will automatically disappear as soon as the field has a value.

> [!NOTE]
> Suggestions only appear on **creation forms** (New Intake, New Sale). They do not appear when editing an existing record.

---

## 4. "Save & Add Another" Workflow

At the bottom of the creation forms, there is a **Save & Add Another** checkbox:
- **Active (Checked)**: Pressing `Ctrl + Enter` (or clicking complete/save) saves the record and resets the form, but keeps the Supplier/Buyer and Product selected, focusing the cursor on the Weight or Product field. This is ideal for recording multiple intakes or sales back-to-back.
- **Inactive (Unchecked)**: Saves the record and redirects you to the ledger/list view.

---

## 5. Global Command Palette (Ctrl + K)

You can launch the global command palette from any page inside the system to navigate instantly or search records.

### How to Open/Close:
- **Open**: Press `Ctrl + K` (or `Cmd + K` on Mac) on your keyboard.
- **Close**: Press `Escape`, or press `Ctrl + K` again, or click outside the palette box.

### Features & Search:
1. **Fuzzy Smart Search**: Search is instant. Type what you are looking for (e.g. `New Sale`, `Go to Ledger`, or a product category).
2. **Entity Searches**: You can search:
   - **Parties**: Search buyers or suppliers by name or phone.
   - **Products**: Search active items by name, category, or unit.
   - **Recent Transactions**: Quickly locate recent Goods Intakes or Sales Invoices by entering their transaction number.

### Shortcuts inside the Palette:
- **ArrowUp / ArrowDown**: Moves the highlighted selection up or down.
- **Enter**: Selects and triggers the highlighted action.
- **Escape**: Closes the palette.

---

## 6. Smart Inline Assistant Layer

The Smart Inline Assistant provides real-time, non-intrusive predictions directly below empty fields to accelerate data entry.

### Features:
1. **Adaptive Recommendations**:
   - **Party fields**: Suggests the last-used supplier or buyer from your successful entries.
   - **Product/Unit/Rate fields**: Suggests the product, unit, and rate. If you are entering multiple rows on a Sales Invoice, the assistant automatically suggests the values entered in the row above to make repeating entries instant.
2. **Apply with One Click**:
   - Visual assistant suggestions appear with a small button: `Apply`.
   - Click the button or tap it to populate the field immediately.
3. **No-Disruption Flow**:
   - Suggestions only appear when a field is empty.
   - As soon as you start typing, the suggestion box disappears instantly so it never blocks your view or conflicts with your typing.


