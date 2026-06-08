# Reusable DataTable Component Guidelines

The `DataTable` component is a generic, display-only, reusable table component designed to provide uniform styling, responsive scrolling, and built-in sort header integration.

---

## 🚫 Architectural Boundary & Rules

To ensure long-term maintainability, the `DataTable` component must adhere to these rules:

1. **Pure Presentation Component**:
   - The component MUST NEVER manage its own sorting, filtering, searching, or pagination states.
   - All state management, data fetching, search-query filtering, and pagination actions must remain in the parent page client.
2. **Standard CSS/Tailwind Classes Only**:
   - The component leverages Tailwind CSS utility classes. Avoid inline style attributes or page-specific hacks.
3. **No Embedded Business Logic**:
   - Do not perform currency calculations, status determinations, or financial math inside `DataTable`.
   - Use custom `render` columns props to pass pre-calculated formatted strings, badges, or links.

---

## Component API Props

The `<DataTable />` component accepts the following props:

| Prop | Type | Description |
| :--- | :--- | :--- |
| `data` | `Array<object>` | Array of data objects to render. |
| `columns` | `Array<Column>` | Configuration array for columns. |
| `sortField` | `string` | The active sort key (dot-path supported). |
| `sortDirection` | `'asc' \| 'desc'` | The active sort direction. |
| `onRequestSort` | `(field: string) => void` | Event handler triggered when a sortable header is clicked. |
| `containerClassName` | `string` | Custom Tailwind classes for the outer wrapper div. |
| `className` | `string` | Custom Tailwind classes for the `<table>` element. |
| `rowClassName` | `(row: object, isExpanded: boolean) => string` | Function to dynamically generate classes per row (e.g. `!row.isActive && 'opacity-50'`). |
| `emptyMessage` | `string \| ReactNode` | Message/Node to display when data array is empty (Default: "No records found."). |
| `rowKey` | `string \| ((row: object) => string \| number)` | Property name or function to resolve unique React list keys (Default: `"id"`). |
| `onRowClick` | `(row: object) => void` | Callback function when a table row is clicked. |
| `expandedRowKeys` | `Set \| Array \| string \| number` | The active expanded row key(s). Matches the key of rows to trigger custom expansion. |
| `expandedRowRender` | `(row: object) => ReactNode` | Renderer function for drawing expanded content panel. |

### Column Schema Definition

Each object in the `columns` array should match the following shape:

```typescript
interface Column {
  key: string;                               // Key path in row object (dot-notation supported)
  label: string;                             // Display title in table header
  sortable?: boolean;                        // Enable sorting for this column (default: true)
  className?: string;                        // Tailwind classes for both <th> and <td> (e.g., text-right, w-[15%])
  render?: (row: any, value: any) => ReactNode; // Optional custom formatter function
}
```

---

## Usage Example

```jsx
import React from "react";
import DataTable from "@/components/ui/DataTable";
import { useTableSorting } from "@/hooks/useTableSorting";

export default function MyList({ items }) {
  const { sortedData, sortField, sortDirection, requestSort } = useTableSorting(items, "name", "asc");

  const columns = [
    { 
      key: "name", 
      label: "Name", 
      render: (row, val) => <span className="font-semibold">{val}</span> 
    },
    { 
      key: "status", 
      label: "Status", 
      className: "text-center", 
      render: (row, val) => (
        <span className={val === "ACTIVE" ? "text-green-600" : "text-rose-600"}>
          {val}
        </span>
      ) 
    }
  ];

  return (
    <DataTable
      data={sortedData}
      columns={columns}
      sortField={sortField}
      sortDirection={sortDirection}
      onRequestSort={requestSort}
      containerClassName="shadow-md"
      rowClassName={(row) => row.status === "INACTIVE" ? "opacity-50" : ""}
    />
  );
}
```

---

## Registry List Pages Migration Guidelines

The primary registry lists in the ERP have been fully migrated to use `<DataTable />`:
- **Sales List** (`SalesListClient`)
- **Supplier Invoices List** (`SupplierInvoiceListClient`)
- **Goods Intake List** (`IntakeListClient`)
- **Products Catalog List** (`ProductListClient`)
- **Source Tracking Mapping Register** (`SourceTrackingListClient`)

### Guidelines for Future Registry Views

When creating or modifying list/registry views:
1. **Always Use `<DataTable />`**: Never write raw `<table>` or manual loop-based row implementations.
2. **Tab Filtering & Column States**:
   - If columns must change dynamically based on active filter tabs (e.g. `IntakeListClient` showing extra columns for `SOLD`/`CLEARED` tabs), define the column array conditionally inside the component body.
3. **Dynamic Row Highlighting**:
   - Use `rowClassName` to control visual traits based on status/state (e.g. faded opacity for disabled products or superseded invoices). Do not style rows manually in custom render callbacks.
4. **Interactive Action Columns**:
   - Keep actions clean and decoupled. Pass a custom `render` callback that maps row details to action components or navigation links.

