# Transactional Event Flows: Unified Payment & Allocation Model

This report details how the current `PartyPayment` and `PartyPaymentAllocation` database schema handles six diverse business scenarios using the exact same tables and structure.

---

## 1. Walk-in Retail Customer (Immediate Cash Sale)
* **Goal:** A cash customer pays Rs. 1,200 at the counter and leaves with their goods.
* **Process:**
  1. Generate the sale obligation record.
  2. Record the cash incoming event.
  3. Map the cash event to the sale obligation.

```json
/* Step 1: Sale recorded */
{ "table": "SaleTransaction", "id": 101, "finalAmount": 1200.00 }

/* Step 2: Cash received at register */
{
  "table": "PartyPayment",
  "id": 501,
  "partyId": 1,              // Walk-in Guest Party
  "paymentNumber": "PAY-501",
  "paymentType": "CASH_IN",
  "amount": 1200.00
}

/* Step 3: Immediate allocation */
{
  "table": "PartyPaymentAllocation",
  "paymentId": 501,
  "referenceType": "SALE",
  "referenceId": 101,
  "allocatedAmount": 1200.00
}
```
* **Net Ledger Result:** Outstanding Sale Remaining: **Rs. 0**. Unallocated Cash: **Rs. 0**.

---

## 2. Credit Customer Payment (Paying down old debt)
* **Goal:** A wholesale customer pays Rs. 12,000 to clear off older sales. They have two outstanding invoices: `SALE #1` (Rs. 10,000) and `SALE #2` (Rs. 5,000).
* **Process:**
  1. Record the cash payment.
  2. Apply FIFO allocation to pay off `SALE #1` completely, and apply the remaining Rs. 2,000 to `SALE #2`.

```json
/* Step 1: Cash payment recorded */
{
  "table": "PartyPayment",
  "id": 502,
  "partyId": 32,             // Wholesale Buyer
  "paymentNumber": "PAY-502",
  "paymentType": "CASH_IN",
  "amount": 12000.00
}

/* Step 2: Allocation to Sale #1 (Cleared) */
{
  "table": "PartyPaymentAllocation",
  "paymentId": 502,
  "referenceType": "SALE",
  "referenceId": 1,
  "allocatedAmount": 10000.00
}

/* Step 3: Allocation to Sale #2 (Partially paid) */
{
  "table": "PartyPaymentAllocation",
  "paymentId": 502,
  "referenceType": "SALE",
  "referenceId": 2,
  "allocatedAmount": 2000.00
}
```
* **Net Ledger Result:** `SALE #1` Remaining: **Rs. 0**. `SALE #2` Remaining: **Rs. 3,000**.

---

## 3. Grain Market Supplier Settlement (Net Payout)
* **Goal:** A commission shop settles a supplier's inventory. Gross value is Rs. 80,000, advances deducted are Rs. 30,000, yielding a net payable amount of Rs. 50,000.
* **Process:**
  1. Generate the Supplier Invoice (Settlement) record.
  2. Pay Rs. 50,000 to the supplier and record the outflow.
  3. Allocate the outflow to the settlement invoice.

```json
/* Step 1: Settlement invoice created */
{ "table": "SupplierInvoice", "id": 8, "finalPayableAmount": 50000.00 }

/* Step 2: Cash payout issued */
{
  "table": "PartyPayment",
  "id": 503,
  "partyId": 14,             // Supplier Party
  "paymentNumber": "PAY-503",
  "paymentType": "CASH_OUT",
  "amount": 50000.00
}

/* Step 3: Allocation */
{
  "table": "PartyPaymentAllocation",
  "paymentId": 503,
  "referenceType": "SETTLEMENT",
  "referenceId": 8,
  "allocatedAmount": 50000.00
}
```
* **Net Ledger Result:** Supplier Invoice Remaining: **Rs. 0**.

---

## 4. Customer Overpayment (Credit accumulation)
* **Goal:** A customer owes Rs. 8,000 on `SALE #4` but hands over Rs. 10,000 in cash.
* **Process:**
  1. Record the Rs. 10,000 payment event.
  2. Allocate Rs. 8,000 to clear `SALE #4`.
  3. Leave the remainder unallocated. Do **not** write any allocation row for the remaining Rs. 2,000.

```json
/* Step 1: Cash payment recorded */
{
  "table": "PartyPayment",
  "id": 504,
  "partyId": 9,
  "paymentNumber": "PAY-504",
  "paymentType": "CASH_IN",
  "amount": 10000.00
}

/* Step 2: Allocation to clear SALE #4 */
{
  "table": "PartyPaymentAllocation",
  "paymentId": 504,
  "referenceType": "SALE",
  "referenceId": 4,
  "allocatedAmount": 8000.00
}
```
* **Net Ledger Result:**
  * `SALE #4` Remaining: **Rs. 0**.
  * Dynamic unallocated balance: `10,000 - 8,000 = 2,000` (Customer credit/advance).

---

## 5. Refund (Outflow of excess balance)
* **Goal:** Return Rs. 2,000 of unallocated credit to the customer in cash.
* **Process:**
  1. Issue a cash payout.
  2. No allocation row is created (the withdrawal represents raw cash outflow, which directly decreases their credit position in the ledger without referencing an invoice).

```json
/* Step 1: Cash outflow recorded */
{
  "table": "PartyPayment",
  "id": 505,
  "partyId": 9,
  "paymentNumber": "PAY-505",
  "paymentType": "CASH_OUT",
  "amount": 2000.00
}
```
* **Net Ledger Result:** The customer's net ledger position decreases by Rs. 2,000, bringing their unallocated credit balance back to **Rs. 0**.

---

## 6. Service Invoice Payment
* **Goal:** A client pays a consulting bill of Rs. 250,000 for service milestone invoice `INV-909`.
* **Process:**
  1. Generate the service invoice.
  2. Record the payment received.
  3. Map the payment to the service invoice.

```json
/* Step 1: Service invoice recorded */
{ "table": "ServiceInvoice", "id": 909, "finalAmount": 250000.00 }

/* Step 2: Client payment received */
{
  "table": "PartyPayment",
  "id": 506,
  "partyId": 80,
  "paymentNumber": "PAY-506",
  "paymentType": "CASH_IN",
  "amount": 250000.00
}

/* Step 3: Allocation */
{
  "table": "PartyPaymentAllocation",
  "paymentId": 506,
  "referenceType": "SERVICE_INVOICE",
  "referenceId": 909,
  "allocatedAmount": 250000.00
}
```
* **Net Ledger Result:** Service Invoice Remaining: **Rs. 0**.
