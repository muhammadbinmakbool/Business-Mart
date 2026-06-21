# Unit Display & Precision Settings User Guide

This user guide describes how to configure and use the **Unit Display & Precision Settings** within the Business Mart ERP system. These settings control how product weights, liquid volumes, and item counts are displayed on transaction forms, invoices, client receipts, and balance reports.

---

## 1. What is Unit Decomposition?

In agricultural and wholesale trade, quantities are often entered as precise decimal values in a primary unit (for example, `40.525 Maund`). However, operators and buyers expect to see quantities represented in traditional breakdowns (e.g., `40 Maund 21 Kilograms`).

The **Unit Precision Display System** manages this breakdown automatically. It performs formatting **strictly on the display layer**, meaning:
* **Core Stock is Unaffected**: All inventory and database records preserve the exact raw decimal value (e.g. `40.525`).
* **Financial Calculations are Accurate**: No rounding occurs on transaction rates or money equations.
* **Readable to Humans**: Invoices are formatted based on preferred trade habits.

---

## 2. Accessing & Configuring Settings

To adjust how units are displayed:
1. Navigate to **Settings** in the main menu.
2. Select the **Defaults** tab (Default Products & Units).
3. Scroll to the **Unit Precision & Display Settings** card.

### A. Configuration Controls

#### 1. Unit Display Precision (Decomposition Depth)
Controls the number of unit levels shown:
* **0 = Decimal Display**: Shows the raw quantity in the primary unit with standard decimals. E.g., `40.53 MND`.
* **1 = One-Level Rounded**: Rounds the quantity directly to the nearest primary unit. E.g., `40.9 MND` becomes `41 MND`.
* **2 = Two-Level Decomposition**: Extracts the whole primary unit, then decomposes the remainder into the immediately lower unit (e.g., Maund into Kilograms). E.g., `40.525 MND` becomes `40 MND 21 KG`.
* **3 = Three-Level Decomposition**: Extracts up to three descending units (e.g., Ton to Maund to Kilogram, or Maund to Kilogram to Gram). E.g., `1.25 KG` becomes `1 KG 250 G`.

#### 2. Label Format Style
Changes how unit names are formatted:
* **Short Abbreviations**: Renders compact codes (e.g. `MND`, `KG`, `G`, `LTR`, `PCS`).
* **Full Unit Names**: Renders formal names (e.g. `Maund`, `Kilogram`, `Gram`, `Liter`, `Piece`).

---

## 3. Real-Time Output Preview

The settings card features a **Live Formatter Output Preview** box. As you change the dropdown options, the preview updates instantly showing mock formatting output for:
* **40.525 Maund** (Weight Category)
* **1.25 Kilogram** (Weight/Base Category)

This lets you verify layout and styling before committing changes.

---

## 4. Examples Reference Table

The table below demonstrates how different settings combinations format raw quantities:

| Raw Value | Unit | Selected Precision | Selected Label Style | Formatted Output |
| :--- | :--- | :--- | :--- | :--- |
| **40.525** | Maund | `0 = Decimal Display` | Short Abbreviations | `40.53 MND` |
| **40.525** | Maund | `2 = Two-Level` | Short Abbreviations | `40 MND 21 KG` |
| **40.525** | Maund | `2 = Two-Level` | Full Unit Names | `40 Maund 21 Kilogram` |
| **1.250** | Kilogram | `2 = Two-Level` | Short Abbreviations | `1 KG 250 G` |
| **1.250** | Kilogram | `2 = Two-Level` | Full Unit Names | `1 Kilogram 250 Gram` |
| **40.900** | Maund | `1 = One-Level Rounded` | Short Abbreviations | `41 MND` |

---

## 5. Automatic Carry-Over Safeguard

To prevent awkward split readings (such as `39 Maund 40 KG` where `40 KG` is exactly equivalent to `1 Maund`), the system runs a **carry-over loop**. If a lower-level unit rounds up to a whole parent unit during decomposition, it automatically increments the parent unit value and clears the remainder (rendering clean readings like `40 MND`).
