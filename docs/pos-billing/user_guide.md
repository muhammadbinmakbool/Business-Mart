# Business Mart — POS Terminal User Guide

Welcome to the **Retail POS Terminal**. This billing interface is designed for high-speed, keyboard-first, and mouse-free cashier checkouts.

---

## 🚀 Step-by-Step Checkout Workflow

Follow these steps to complete a sales transaction within seconds:

### 1. Identify/Select the Customer
- By default, the terminal selects **Al Falah Store** (or your last selected buyer).
- To change the buyer:
  - Press `F5` or `Alt + C` to focus and expand the customer list.
  - Type a name to filter, navigate using `Arrow Keys`, and press `Enter` to select.
- **Quick-Add New Customer**:
  - Select `➕ Add New Buyer` from the list.
  - Fill in the Name, Phone Number, and Address fields in the inline row that appears.

### 2. Scan & Add Products
- Press `F2` to focus the **Scan Barcode / Search** input field.
- **Barcode Scanner**: Scan the item's barcode. The item will automatically be added or incremented in the cart.
- **Manual Search**: Type the product's name (e.g. `Salt`).
  - If there is a unique match, it will be added to the cart immediately.
  - If multiple products match, a dropdown list will open. Navigate with `Up/Down Arrow` and press `Enter` to add.

### 3. Edit Quantities & Rates (Optional)
- Press `F4` to jump focus directly into the product grid.
- Use `Arrow Keys` (`Up/Down/Left/Right`) or `Enter` to move between cells.
- **Appends Rows**: Entering a rate on the last row automatically appends a new empty product row.
- **Delete Row**: Press `Ctrl + Delete` or `Ctrl + Backspace` on any row to remove it.

### 4. Apply Adjustments (Commissions, Ghesai, Labour)
- Under **Invoice Adjustments**, click the `+ Add` button.
- A clean modal popup dialog will overlay on the screen without resizing the main table.
- Select the **Adjustment Type** (Commission, Labour, Ghesai, etc.), **Calculation Mode** (Percentage, Fixed, or Per-weight), and enter the value.
- Click **Apply** or press `Enter` to save, or press `Escape` to cancel.

### 5. Cash Calculator & Change Due
- Press `F3` to jump to the **Cash Received** calculator.
- Enter the amount paid by the customer (e.g. `1000`).
- **Quick Denominations**: Use the buttons like `+100`, `+500`, `+1000` to quickly append cash values.
- The **Change Due** panel will immediately update in green (for exact or overpaid) or red (for underpaid).

### 6. Save & Print
- **Checkout & Print**: Press `F7` or `Ctrl + P` to save the bill, trigger receipt generation on your thermal printer, and instantly clear the cart for the next client.
- **Save Bill (No Print)**: Press `Ctrl + Space` to save and reset, or `Ctrl + Enter` to save and close the screen.
- **Clear Cart**: Press `Escape` (outside input fields) to reset the terminal.

---

## ⌨️ Keyboard Shortcut Cheat Sheet

Keep this guide handy for maximum billing speed:

| Key Binding | Action Description |
| :--- | :--- |
| **`F2`** | Focus barcode scanner / search input |
| **`F3`** | Focus cash received field in calculator |
| **`F4`** | Jump focus to the first row of product entry table |
| **`F5`** or **`Alt + C`** | Focus and open the Customer selection dropdown |
| **`F7`** or **`Ctrl + P`** | Save invoice, print thermal receipt, and reset terminal |
| **`Ctrl + Space`** | Quick Checkout (Save invoice & reset terminal without printing) |
| **`Ctrl + Enter`** | Save invoice and close page |
| **`Escape`** | Close dropdowns / cancel adjustment modal / clear entire cart |
| **`Enter`** (in table) | Move cell-by-cell (Product → Quantity → Rate → Next Row) |
| **`Ctrl + Delete`** | Remove active item row from table |

---

## 💡 Pro Tips for Operators
- **Hands on the Keyboard**: Avoid touching the mouse. You can complete a full billing lifecycle using only `F2` (Scan), `F3` (Cash), and `F7` (Print).
- **Fast Resets**: After saving or printing, the interface automatically resets focus back to the barcode scan field, ready for the next customer.
