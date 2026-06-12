# Server-Side Pagination Developer Guide

This document outlines the architecture, standards, and rules for server-side pagination across the Business Mart application.

---

## 🚫 Core Rule: Browser Memory Safety
Never load or slice large arrays in the browser. The database is the single source of truth for query slicing. All pagination limits and offsets must be executed at the database query level.

---

## 1. Centralized Pagination Configuration
All pagination constants are centralized in `src/lib/pagination.js`. Do not hardcode pagination page sizes or limits inside individual components.

```javascript
// src/lib/pagination.js
export const PAGE_SIZE_OPTIONS = [50, 100, 200];
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 200;

/**
 * Clamps a page size to the maximum allowed limit to prevent performance degradation.
 */
export function clampLimit(requestedLimit) {
  const limit = parseInt(requestedLimit) || DEFAULT_PAGE_SIZE;
  return Math.min(limit, MAX_PAGE_SIZE);
}
```

---

## 2. Deterministic Secondary Sorting
To avoid random page-drift or duplicate rows appearing on different pages due to undefined SQL ordering behaviors under identical timestamps:
- **Rule:** Every query must enforce a unique primary or secondary sorting key (usually the primary key `id`).
- **Prisma implementation:**
```javascript
orderBy: [
  { [primarySortField]: sortDirection },
  { id: "desc" }
]
```

---

## 3. Separate Count Query
Always execute the total record count and data selection queries in parallel using `Promise.all` to maintain maximum throughput:
```javascript
const [items, totalCount] = await Promise.all([
  prisma.someModel.findMany({
    where,
    skip,
    take: limit,
    orderBy: [
      { [sortField]: sortDirection },
      { id: "desc" }
    ],
    include
  }),
  prisma.someModel.count({ where })
]);
```

---

## 4. URL-Driven Pagination & Filter Syncing
The list page view state is driven entirely by URL search parameters. Avoid storing pagination, filters, or sorting in client-side component state where possible.
- **Bookmarkable View:** Pressing `F5` / Refresh must preserve the exact active view (page size, page number, sorting, tabs, search, and date filters).
- **Search Debouncing:** Text search inputs must wait `300ms` before calling `router.push` to prevent triggering redundant query loads.
- **Filter Reset Rule:** Changing any active filter, status tab, or date range must reset the current page back to Page 1.

---

## 5. Deletion & Pointer Bounds Safety
If the user deletes the last remaining item on a page (causing the page to contain zero records):
- Calculate: `(page - 1) * limit >= totalCount` (post-deletion).
- If true, decrement `page` (down to a minimum of 1) and redirect the browser to the new valid page.

---

## 6. Export Slicing Exemption
Export downloads (CSV/Excel) must ignore pagination parameters and extract all matching database records.
- Pass `bypassPagination: true` or call the full service retrieval to ensure exports include all records matching filters.
