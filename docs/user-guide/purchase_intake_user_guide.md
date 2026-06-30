# Purchase Intake User Guide

This guide explains how to use the **Purchase Intake** workflow in Business Mart. This workflow streamlines inventory entry and financial reconciliation by combining goods receipt, supplier invoicing, and cash payment settlements into a single, cohesive interface.

---

## 1. Overview: Receipt Mode vs. Purchase Mode

Business Mart supports two distinct operational modes for handling incoming goods from suppliers:

| Feature | Receipt Mode (Legacy) | Purchase Mode (New) |
| :--- | :--- | :--- |
| **Primary Use Case** | Commission-agent business models where supplier goods are sold first and settled later. | Direct purchase business models where goods are bought immediately upon arrival. |
| **Form Layout** | Single product entry screen optimized for rapid, high-speed single-item receipts. | Multi-row product table (POS style) for recording multiple items in one document. |
| **Financial Generation** | Generates an `IntakeTransaction` only. No immediate invoice is generated. | Generates an `IntakeTransaction` per item, a master `SupplierInvoice`, and an `IntakeAdvance` for the paid amount. |
| **Settlement Mode** | Manual settlement generated later through the supplier ledger matching. | Immediate settlement recorded at checkout (cash/bank/etc.). |

---

## 2. Enabling Purchase Mode

The system-wide Intake Mode is a configuration toggle managed by system administrators.

> [!IMPORTANT]
> To configure the intake mode, you must log in to an account with **Super Admin** privileges. Regular admins and operators cannot see or change these system-wide flags.

### Steps to Switch to Purchase Mode:
1. Log in as a **Super Admin** (e.g., `superadmin@businessmart.com`).
2. Navigate to the **Settings** page via the sidebar.
3. Select the **System Maintenance** or **Feature Flags** tab.
4. Under the feature flags configuration card, locate the **Intake Mode** dropdown.
5. Select **PURCHASE** (the default is `RECEIPT`).
6. Click **Save Settings**.

---

## 3. Entering a Purchase Document

Once Purchase Mode is active, clicking **Create Intake** on the Goods Intake ledger page opens the multi-product purchase entry screen.

### Step-by-step Instructions:

#### 1. Header Information
* **Supplier Select**: Select the supplier from the searchable dropdown.
  * *New Supplier Setup*: If the supplier does not exist yet, select `➕ Add New Supplier` at the top of the list to open the quick setup drawer, where you can enter their name, phone number, and address without leaving the checkout page.
* **Entry Date**: Defaults to the current date. You can change this to record past purchases.

#### 2. Entering Products in the Cart Table
* **Product Name**: Start typing a product name or code. The searchable select will filter matching items.
* **Packaging Helper (Optional)**: If the product is packaged in bags or cartons, check the helper option.
  * Enter the **No. of Bags** (e.g., `10`) and **Size per Bag** (e.g., `50`).
  * The system will automatically calculate and fill the total net weight (e.g., `500 KG`).
* **Gross Weight / Net Weight**: If not using the helper, enter the total net weight directly.
* **Unit**: The primary unit of measurement (defaults to the product's primary unit, e.g., `KG` or `Bag`).
* **Rate**: Enter the purchase cost per unit.
* **Rate Unit**: Select the unit the rate is quoted in (e.g., Rs. per `KG` or Rs. per `Maund`).

#### 3. Adding Adjustments
* The system automatically populates default adjustments (such as standard commissions or market fees) at the bottom.
* You can manually add new adjustments by clicking **Add Adjustment**, or edit/remove editable adjustments as required by your trade agreements.

#### 4. Cash Settlement (Amount Paid)
* In the **Settlement** card on the right, enter the **Amount Paid** to the supplier at the time of purchase.
* Any unpaid balance will automatically post to the supplier's outstanding ledger balance as a payable.

#### 5. Completion
* Click **Complete Purchase** to save the document.
* Upon success, the system displays a success toast message and redirects you to the Goods Intake Ledger.

---

## 4. Understanding the Records Created

When you click **Complete Purchase**, Business Mart orchestrates several actions in the database atomically:

1. **Intake Transactions**: An intake transaction record is created for each line item in your cart, representing the physical stock entry.
2. **Supplier Invoice**: A master supplier invoice is generated with a status of `PENDING`. This aggregates all the items, quantities, rates, and adjustments into a single bill.
3. **Intake Advance (Payment)**: If you entered an "Amount Paid", an intake advance voucher is generated and automatically linked to the invoice to reduce the outstanding amount.
