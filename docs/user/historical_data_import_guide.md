# Historical Onboarding Data Import Guide

Welcome to the **Historical Data Onboarding System** for Business Mart. This guide will walk you through preparing your spreadsheet, uploading data, resolving duplicate conflicts, and committing your starting business figures safely.

---

## 1. Overview of the Import System

The onboarding system allows you to migrate starting balances and starting inventories from your old books/manual systems. 

This system does **not** create fake invoices or sales bills. Instead, it creates trace-labeled starting positions (`PartyOpeningBalance` and `InitialStock`) which integrate directly into Business Mart’s inventory and ledger calculations.

---

## 2. Preparing Your Spreadsheets

Before importing, you should download the official templates directly from the **Settings > Maintenance > Historical Onboarding** tab.

### A. Parties & Balances Template
Use this template to import your suppliers, customers, and their starting balances.

| Column Header | Required | Valid Value / Format | Description |
| :--- | :---: | :--- | :--- |
| **Name** | Yes | Text (e.g., `Ali Traders`) | The name of the person or business entity. |
| **PhoneNumber** | Yes | Numbers (e.g., `03001234567`) | Primary contact number. Used to prevent duplicate accounts. |
| **Address** | No | Text | Physical location or market address. |
| **PartyType** | Yes | `BUYER` or `SUPPLIER` | The ledger category for the account. |
| **OpeningBalance** | Yes | Number (e.g. `150000`, or `0`) | The starting money value. Must be $\ge 0$. |
| **OpeningBalanceType**| Yes | `RECEIVABLE` or `PAYABLE` | `RECEIVABLE` means they owe you money; `PAYABLE` means you owe them. |
| **Notes** | No | Text | Optional notes (e.g. `Manual ledger page 45`). |

### B. Products & Stocks Template
Use this template to import your inventory items and starting physical stock quantities.

| Column Header | Required | Valid Value / Format | Description |
| :--- | :---: | :--- | :--- |
| **Name** | Yes | Text (e.g., `Wheat Quality A`) | The name of the product. |
| **Category** | Yes | `WEIGHT`, `LIQUID`, or `QUANTITY` | Defines how the product is measured. |
| **PrimaryUnit** | Yes | `KG`, `LITER`, or `PIECE` | The base database unit of the product. |
| **UnitConversion** | No | Positive Number (e.g., `50`) | Required if using product-specific units (like `BAG` or `BOX`). Shows how many base units are in one stock unit (e.g. 50kg in a bag). |
| **InitialStock** | Yes | Number (e.g., `500`, or `0`) | The starting stock quantity. |
| **InitialStockUnit** | No | e.g. `BAG`, `BOX`, `KG`, `PIECE` | The unit of the starting stock. If left blank, it defaults to the `PrimaryUnit`. |
| **Notes** | No | Text | Optional onboarding description. |

---

## 3. Important Rules to Keep in Mind

1. **Unique Identity**: Phone numbers must be unique to each party. Product names must be unique.
2. **Missing Conversion Factors**: If you choose `BAG`, `BOX`, or `PACK` as your starting stock unit, you **MUST** specify a `UnitConversion` factor (e.g., 50 for a 50kg bag of Wheat, or 12 for a pack of Ice Cream) so the system can calculate base weights correctly. If this factor is missing, the row will fail validation.
3. **Unit Category Matching**: Your unit choices must match the product's category. For example, you cannot use `LITER` (Liquid) for a product in the `WEIGHT` category.

---

## 4. The Import Workflow

```
1. Select Type (Parties/Products) ➔ 2. Drag & Drop File ➔ 3. Review validation & Conflicts ➔ 4. Commit
```

### Step 1: Select Import Type
Go to **Settings > Maintenance > Historical Onboarding**. Choose whether you are importing **Parties & Balances** or **Products & Stock**.

### Step 2: Upload File
Drag your Excel or CSV file into the dashed drop zone, or click to choose the file from your computer. The system will run a **Dry-Run Validation** instantly.

### Step 3: Review the Dry-Run Report
The dashboard will display:
* **Summary Stats**: Total rows, valid rows, invalid rows, and conflicts.
* **Validation Failures**: Detailed error messages (such as missing phone numbers or incorrect units) with their spreadsheet row numbers. These rows are automatically ignored.
* **Conflict Resolutions**: If the system detects that a party or product already exists (by name or phone), it highlights the conflict. You must choose one of three merge strategies:
  * **Replace**: Overwrites the existing opening balance or initial stock with the new spreadsheet values.
  * **Duplicate**: Imports the item anyway by adding `(Imported)` to the name to keep it separate.
  * **Skip**: Ignores the spreadsheet row completely.

### Step 4: Commit Onboarding Data
Once you have reviewed the resolution choices and are satisfied, click **Commit Onboarding Data**. The data will be written to the database under an audit batch migration ID.

### Step 5: Save the Import Log
After a successful import, click **Download Import Log** to save a text-based audit trail report. This log lists every record created, replaced, or skipped for your business records.

---

## 5. Persistent Status Panel

Once onboarding is completed, reloading the page will **not** clear your screen back to the uploader. 

Instead, the system checks the database and displays a persistent **"Historical Onboarding Complete"** status showing:
* Number of currently imported Parties with starting balances.
* Number of currently imported Products with initial stocks.
* Unique migration run IDs.

If you need to import additional spreadsheets later, simply click the **"Import Additional Data"** button to open the upload zone again.
