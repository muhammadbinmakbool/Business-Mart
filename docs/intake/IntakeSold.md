# Intake SOLD Lifecycle & Net Weight Calculations Guide

This document details the operational mechanics, real-time math formulas, database schemas, and billing impacts when an **Intake Transaction** transitions to the **`SOLD`** state in Business Mart.

---

## 🎯 Architectural Intent

In grain market workflows, products arrive at the warehouse in raw, unverified states. The **`SOLD`** status transition represents final weight verification, bag tare deductions (**Bardana**), refraction impurity calculations (**Khot**), and buyer sales matching.

* **Gross Weight** represents the raw weight recorded at arrival.
* **Net Weight** represents the clean, sellable billing weight after deducting bag tare and impurities.
* **Stock Alignment**: The physical stock snapshot (`Product.quantity`) reflects the raw arriving gross weight (`normalizedWeight`). The Net Weight is strictly used for **billing, supplier settlements, and sales tracking**.

---

## 📏 Mathematical Formulas & Calculation Order

Net weight calculations follow a strict, ordered workflow. The system converts gross weight to `KG` first to apply standard metric deductions, computes all totals, and converts back to the original operational unit.

### 1. The Core Formula
$$\text{netWeight} = (\text{grossWeight} - \text{Bardana}) - \text{Khot}$$

Both **Bardana** and **Khot** weight deductions are non-negative ($\ge 0$). If only one is specified, the other defaults to `0`.

---

### 2. Bardana (Tare Weight) Calculation
The tare weight represents the total physical weight of the bags holding the grain. 

* **Inputs**:
  * `bagCount` (total number of physical bags)
  * `bardanaGramPerBag` (weight of a single empty bag in grams)
* **Metric Formula**:
  $$\text{Bardana (KG)} = \frac{\text{bagCount} \times \text{bardanaGramPerBag}}{1000}$$

* **Example**:
  If a supplier brings **10 bags** of Corn, and each empty bag weighs **150 grams**:
  $$\text{Bardana (KG)} = \frac{10 \times 150}{1000} = 1.5\text{ KG}$$

---

### 3. Khot (Impurity Deduction) Calculation
The refraction or impurity rate is defined in **grams per unit** (either grams per `KG` or grams per `Maund`) applied to the weight remaining **after** Bardana has been deducted.

* **Inputs**:
  * `khotRate` (deduction rate in grams per unit)
  * `khotRateUnit` (`KG` or `MAUND`)
* **Metric Formula**:
  First, compute the weight remaining after Bardana is deducted, converted to the rate's unit:
  $$\text{Applied Weight} = \begin{cases} \text{weightAfterBardana (KG)} & \text{if khotRateUnit is KG} \\ \frac{\text{weightAfterBardana (KG)}}{40} & \text{if khotRateUnit is MAUND} \end{cases}$$
  
  Then calculate the total Khot weight:
  $$\text{Khot (KG)} = \frac{\text{khotRate} \times \text{Applied Weight}}{1000}$$

* **Example**:
  Suppose `weightAfterBardana` is **1000 KG**. The operator sets a refraction rate of **25 grams per KG**:
  $$\text{Khot (KG)} = \frac{25 \times 1000}{1000} = 25\text{ KG}$$

---

### 4. Final Net Weight Derivation
Subtract both values in sequence and translate back to the transaction's entry unit:

* **In KG**:
  $$\text{netWeight (KG)} = \max(0, \text{grossWeight (KG)} - \text{Bardana (KG)} - \text{Khot (KG)})$$
* **In original unit**:
  $$\text{netWeight} = \begin{cases} \frac{\text{netWeight (KG)}}{40} & \text{if unit is MAUND} \\ \text{netWeight (KG)} & \text{if unit is KG} \end{cases}$$

---

## 🗄️ Database & Schema Architecture

When a transaction is marked as `SOLD`, the system atomic updates the database across two core tables:

### 1. `IntakeTransaction` Model Updates
The schema records final calculated decimal values and establishes the unit rate:
* `status`: Set to `"SOLD"`
* `rate`: Stores the supplier's buying rate (e.g. per Maund or per KG)
* `Bardana`: Stores the calculated total Bardana weight in KG
* `Khot`: Stores the calculated total Khot weight in KG
* `netWeight`: Stores the final calculated billing Net Weight (in original operational unit)

### 2. `SalesTrack` Automatic Creation
An automatic source-tracking record is created to map this supplier arrival directly to a buyer:
* `supplierPartyId`: The supplier's party link.
* `buyerPartyId`: The selected buyer's party link (`partyType` must be `"BUYER"` or `"BOTH"`).
* `quantity`: Saved as the standard normalized Net Weight in `KG` (`netWeight * 40` if in Maund).
* `buyingRate` & `sellingRate`: Populated using the verified transaction rate.
* `notes`: Automated trail e.g. `"Intake INT-000016 marked as SOLD"`.

---

## 💵 Billing & Invoicing Integration

Supplier invoices are automatically realigned to match final verified weights:

* **Before Verification (`PENDING`)**: Invoices calculate supplier amounts using `grossWeight`.
* **After Verification (`SOLD`)**: If `netWeight` is present, `calculateSupplierDeductions` and `SupplierInvoiceService` automatically swap `grossWeight` out and compute supplier settlements using the **`netWeight`** instead.

---

## 📂 Implementation References

All calculations, actions, and UI screens for the `SOLD` status transition are contained in these files:

* **Live Math Engine**: [units.js](file:///d:/Projects/Next%20JS/src/lib/units.js#L141-L192) defines `calculateIntakeNetWeight`.
* **Transactional Service**: [IntakeService.js](file:///d:/Projects/Next%20JS/src/modules/intake/services/IntakeService.js) handles multi-table updates and `SalesTrack` creation inside `sellIntake` and `updateIntake`.
* **Server Action Controller**: [intakeActions.js](file:///d:/Projects/Next%20JS/src/modules/intake/controllers/intakeActions.js) parses parameters and revalidates Next.js pages.
* **Mark as Sold Modal**: [StatusUpdateButtons.js](file:///d:/Projects/Next%20JS/src/app/intake/%5Bid%5D/StatusUpdateButtons.js) renders the premium glassmorphic modal with real-time UI calculation.
* **Edit Form Calculator**: [EditIntakeForm.js](file:///d:/Projects/Next%20JS/src/app/intake/%5Bid%5D/edit/EditIntakeForm.js) provides the inline interactive controlled state form.
