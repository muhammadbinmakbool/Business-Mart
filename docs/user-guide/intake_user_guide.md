# User Guide: Goods Intake & Supplier Settlement System

Welcome to the **Goods Intake** user guide. This document explains how to record incoming goods, manage supplier advances, generate invoices, and handle settlements depending on your business configuration.

---

## ⚙️ System Configuration: Dual-Mode Workflows

Business Mart operates in two primary modes depending on your business type:

### 1. RECEIPT Mode (Classic Grain Market)
* Used when suppliers deliver goods (e.g. Wheat, Paddy) to be verified, weighted, and sold to third-party buyers.
* Purchase rate is optional at entry and determined when the goods are sold.
* Supports **Partial Intake Selling** (recording multiple sales against a single delivery receipt).

### 2. PURCHASE Mode (Direct Inventory Purchase)
* Used when you purchase inventory directly from a supplier for your own warehouse.
* A **Purchase Rate** is required immediately upon recording the arrival.
* An associated **Supplier Invoice** (derived document) is generated automatically.
* Intakes cannot be "sold" to third-party buyers.

### ⚙️ How to Switch Intake Modes
To switch between **Receipt Mode** and **Purchase Mode**:
1. Log in with a **Super Admin** account.
2. Navigate to **Settings** $\rightarrow$ **Feature Flags & Modules**.
3. Under the **Sales & Intake Operational Configurations** section, find the **Intake Operational Mode** dropdown.
4. Select your preferred mode (Receipt Mode or Purchase Mode).
5. Click **Save Feature Flags** (you will be prompted to enter your password to confirm).
6. The system will reload, automatically adapting all intake forms, listing tables, details views, and workflow rules system-wide.

---

## 📥 Recording a New Delivery (Goods Intake)

To record a new arrival, navigate to **Goods Intake** $\rightarrow$ **Record Arrival**:

1. **Select Supplier**: Choose an existing supplier or add a new one on-the-fly.
2. **Product Details**: Select the product being delivered.
3. **Weight & Units**: Input the Gross Weight and select the unit (e.g., Maund, KG, Bag). 
   * *Note: The system dynamically calculates the base inventory weight behind the scenes.*
4. **Bags/Packaging (Optional)**: Input the bag count and packaging details (e.g., PP Bag, Jute Bag).
5. **Purchase Rate (PURCHASE Mode Only)**: Input the per-unit purchase rate.
6. **Cash Advance (Optional)**: If you pay the driver or supplier a cash advance immediately, check the **Advance Payment** option and input the amount and any notes.
7. **Submit**: Save the transaction.

> [!TIP]
> **Automatic Invoice Generation in Purchase Mode**
> When you save a new intake in **PURCHASE** mode, the system automatically creates a linked **Supplier Invoice** containing the intake item and any cash advance you recorded.

---

## 🔄 Lifecycle & Status Meanings

Your intake will transition through the following statuses:

*   **`PENDING`**: Arrival recorded. In **RECEIPT** mode, it represents unverified/unsold arrivals. In **PURCHASE** mode, it represents an unpaid/uninvoiced purchase.
*   **`RECEIVED`**: The arrival status used in Purchase Mode representing goods successfully received at the warehouse.
*   **`SOLD` (RECEIPT Mode Only)**: The goods have been sold to a buyer, and weight refractions have been recorded.
*   **`CLEARED`**: The supplier invoice has been fully paid, settling your liabilities for this intake.
*   **`CANCELLED`**: The arrival is voided, and its weight is removed from inventory.

---

## 🛠️ Editing and Modifying Arrivals

### Supplier (Party) Constraints
* Once an intake has been linked to a cash advance or is part of a Supplier Invoice, the **Supplier cannot be changed**.
* To change the supplier, you must first delete/disconnect the advances and delete the supplier invoice.

### Invoice Lock
* If the associated Supplier Invoice has been **paid or cleared**, the intake is **locked**. You will not be able to edit or delete the intake until the payment allocations are removed or refunded from the invoice.

---

## 🗑️ Deleting Goods Intakes

Both soft-deleting and hard-deleting are supported from the details page, subject to safety invariants:

* **Unpaid Invoices**: If an intake's invoice is unpaid, deleting the intake will automatically clean up/delete the associated invoice items and disconnect/delete linked advances.
* **Paid/Cleared Invoices**: The system will prevent deletion to keep your financial ledger from going out of balance.
* **Negative Inventory Prevention**: Deleting an active intake subtracts its weight from your inventory. If you have already sold the stock and your warehouse inventory is lower than the intake weight, the deletion will be blocked to prevent negative stock values.
