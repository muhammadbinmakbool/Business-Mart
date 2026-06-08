# Reusable DataTable Component Design & Analysis

We have analyzed the tables across the entire codebase to design a unified, flexible, and premium reusable `DataTable` component.

---

## 1. Inventory of Existing Tables

We identified **10 key files** implementing standard tables. They fall into three main usage categories:

| File / Component Path | Features Used | Special Cell Formatting / Logic |
| :--- | :--- | :--- |
| **`ProductListClient.js`** | Sorting | Product name icon badge; Bold font; custom unit formatter. Row opacity based on `isActive`. |
| **`AdvanceListClient.js`** | Sorting | Custom links (Linked Intake, Settlement Invoice); color-coded status badges ("Adjusted" vs "Outstanding"). |
| **`IntakeListClient.js`** | Sorting | Status badge renderer (SOLD, PENDING, CLEARED); custom date & weight formatting. |
| **`SalesListClient.js`** | Sorting | Multi-line client rows; Rate formatting; Custom currency formatter; Status badge renderer. |
| **`SupplierInvoiceListClient.js`** | Sorting | Invoice link formatting; Deduction subtraction highlighting (red font); Status badges. |
| **`ActivityClient.js`** | Pagination, Expandable Rows | Interactive detail drawer toggled by clicking row (JSON Metadata Inspector); action/entity color maps. |
| **`LedgerClient.js`** (Reconciliation History) | Standard | Currency format helpers (`formatRs`), lock status badges, action icon buttons (Lock, Unlock, Delete). |
| **`ReconciliationTable.js`** | Standard (Side-by-side) | External links; red/green color highlights for adjustments and totals. |
| **`UsersManagement.js`** | Standard | User details; action edit/delete modals. |
| **`PartyProfileClient.js`** (Profile Details) | Standard | Contact info list; inline static details. |

---

## 2. Challenges & Requirements for Reusability

To replace all these tables without losing their specialized styling or functionality, the generic component must support:

1. **Sortable Columns**: Seamless integration with the existing `SortableHeader` component and `useTableSorting` hook.
2. **Column Customization**: Custom alignments (`text-right`, `text-center`), widths, and custom cell renders (links, badges, icons).
3. **Expandable Rows**: Support for collapsible child panels (such as the JSON inspector in the Activity Log).
4. **Conditional Row Styling**: E.g. fading out inactive products (`opacity-50`) or highlighting selected sessions.
5. **Empty States**: Elegant placeholder elements when zero records are returned.

---

## 3. Proposed Component API

We propose introducing `<DataTable />` under `src/components/ui/DataTable.js`.

### Column Definition Schema
```typescript
interface Column<T> {
  key: string;               // Dot-notation key path (e.g. 'party.name' or 'amount')
  label: string;             // Display name in header
  sortable?: boolean;        // Enables sort handling (defaults to true)
  className?: string;        // CSS classes for th & td (e.g. 'text-right', 'w-[15%]')
  render?: (row: T, value: any) => React.ReactNode; // Custom cell renderer function
}
```

### Component Props
```typescript
interface DataTableProps<T> {
  data: T[];                                          // Rows of data
  columns: Column<T>[];                               // Column config
  sortField?: string;                                 // Currently sorted field
  sortDirection?: 'asc' | 'desc';                     // Current sort direction
  onRequestSort?: (field: string) => void;            // Triggered on header click
  emptyMessage?: string | React.ReactNode;            // Empty state placeholder
  onRowClick?: (row: T) => void;                      // Row click callback
  rowClassName?: (row: T) => string;                  // Dynamic row classes
  expandedRowRender?: (row: T) => React.ReactNode;    // Sub-row renderer
  expandedRowKeys?: Set<string | number>;             // Set of expanded row IDs
  rowKey?: string | ((row: T) => string | number);    // Unique key (default: 'id')
}
```

---

## 4. Proposed Implementation

Here is how the reusable `<DataTable />` component will be structured:

```jsx
import React from "react";
import SortableHeader from "@/components/SortableHeader";
import { getNestedValue } from "@/hooks/useTableSorting";
import { cn } from "@/lib/utils";

export default function DataTable({
  data = [],
  columns = [],
  sortField,
  sortDirection,
  onRequestSort,
  emptyMessage = "No records found.",
  onRowClick,
  rowClassName,
  expandedRowRender,
  expandedRowKeys = new Set(),
  rowKey = "id",
}) {
  const getRowKey = (row) => {
    if (typeof rowKey === "function") return rowKey(row);
    return row[rowKey];
  };

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b bg-muted/50 text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
              {columns.map((col) => {
                if (col.sortable !== false && onRequestSort) {
                  return (
                    <SortableHeader
                      key={col.key}
                      field={col.key}
                      currentSortField={sortField}
                      currentSortDirection={sortDirection}
                      onRequestSort={onRequestSort}
                      className={col.className}
                    >
                      {col.label}
                    </SortableHeader>
                  );
                }

                return (
                  <th
                    key={col.key}
                    className={cn(
                      "px-4 py-3 font-semibold select-none text-muted-foreground",
                      col.className
                    )}
                  >
                    {col.label}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-muted-foreground italic"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row) => {
                const key = getRowKey(row);
                const isExpanded = expandedRowKeys.has(key);

                return (
                  <React.Fragment key={key}>
                    <tr
                      onClick={() => onRowClick && onRowClick(row)}
                      className={cn(
                        "transition-colors",
                        onRowClick && "cursor-pointer hover:bg-muted/30",
                        rowClassName && rowClassName(row)
                      )}
                    >
                      {columns.map((col) => {
                        const cellValue = getNestedValue(row, col.key);
                        return (
                          <td
                            key={col.key}
                            className={cn("px-4 py-3 whitespace-nowrap", col.className)}
                          >
                            {col.render ? col.render(row, cellValue) : (cellValue ?? "—")}
                          </td>
                        );
                      })}
                    </tr>

                    {isExpanded && expandedRowRender && (
                      <tr className="bg-muted/10">
                        <td colSpan={columns.length} className="px-6 py-4">
                          {expandedRowRender(row)}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

## 5. Sample Usage Example

Integrating the new `<DataTable />` component into `AdvanceListClient.js` simplifies it significantly:

```jsx
const columns = [
  { key: "createdAt", label: "Date", render: (_, val) => format(new Date(val), "dd MMM yyyy, hh:mm a") },
  { key: "supplierName", label: "Supplier", render: (row) => (
      <div className="flex items-center gap-2">
        <User className="h-3 w-3 text-muted-foreground" />
        {row.supplierName}
      </div>
    )
  },
  { key: "amount", label: "Amount", className: "text-right font-bold text-primary", render: (_, val) => `Rs. ${Number(val).toLocaleString()}` },
  { key: "intakeNumber", label: "Linked Intake", render: (row) => row.intakeTransaction ? (
      <Link href={`/intake/${row.intakeTransactionId}`} className="text-blue-600 dark:text-blue-400 hover:underline font-mono text-xs">
        {row.intakeNumber}
      </Link>
    ) : <span className="text-muted-foreground text-xs italic">Standalone</span>
  },
  { key: "supplierInvoiceId", label: "Settlement Status", render: (row) => row.supplierInvoice ? (
      <div className="flex flex-col gap-0.5">
        <span className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 text-[9px] font-bold uppercase px-2 py-0.5 rounded border inline-block w-fit">
          Adjusted
        </span>
        <Link href={`/supplier-invoices/${row.supplierInvoiceId}`} className="text-blue-600 dark:text-blue-400 hover:underline font-mono text-xs mt-0.5">
          {row.supplierInvoice.invoiceNumber}
        </Link>
      </div>
    ) : <span className="bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 text-[9px] font-bold uppercase px-2 py-0.5 rounded border inline-block w-fit">Outstanding</span>
  },
  { key: "notes", label: "Remarks", className: "text-muted-foreground italic" }
];

return (
  <DataTable
    data={sortedAdvances}
    columns={columns}
    sortField={sortField}
    sortDirection={sortDirection}
    onRequestSort={requestSort}
    emptyMessage="No advance payments recorded."
  />
);
```
