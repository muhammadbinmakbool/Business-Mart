import { useState, useMemo } from "react";

/**
 * Utility to resolve nested object values using dot-notation.
 * E.g., getNestedValue({ party: { name: 'Supplier' } }, 'party.name') => 'Supplier'
 */
export function getNestedValue(obj, path) {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

/**
 * Custom React hook for sorting tabular data.
 * Supports numbers, date strings (ISO or YYYY-MM-DD), and case-insensitive alphabetic sorting.
 */
export function useTableSorting(data = [], defaultSortField = null, defaultSortDirection = "asc") {
  const [sortField, setSortField] = useState(defaultSortField);
  const [sortDirection, setSortDirection] = useState(defaultSortDirection);

  const sortedData = useMemo(() => {
    if (!sortField || !Array.isArray(data)) return data;

    return [...data].sort((a, b) => {
      let valA = getNestedValue(a, sortField);
      let valB = getNestedValue(b, sortField);

      // Handle null/undefined values (push them to the end)
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      // Handle Date comparison
      // ISO strings starting with YYYY-MM-DD or standard Date instances
      const isDateString = (val) => typeof val === "string" && /^\d{4}-\d{2}-\d{2}/.test(val);
      const isDateA = valA instanceof Date || isDateString(valA);
      const isDateB = valB instanceof Date || isDateString(valB);

      if (isDateA && isDateB) {
        const timeA = new Date(valA).getTime();
        const timeB = new Date(valB).getTime();
        if (!isNaN(timeA) && !isNaN(timeB)) {
          return sortDirection === "asc" ? timeA - timeB : timeB - timeA;
        }
      }

      // Handle Number comparison
      // Only treat as number if it is a number type or string that is strictly numeric
      const isStrictNumber = (val) => typeof val === "number" || (typeof val === "string" && val.trim() !== "" && !isNaN(Number(val)));
      if (isStrictNumber(valA) && isStrictNumber(valB)) {
        const numA = Number(valA);
        const numB = Number(valB);
        return sortDirection === "asc" ? numA - numB : numB - numA;
      }

      // Handle String comparison (case-insensitive)
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      const comparison = strA.localeCompare(strB);

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [data, sortField, sortDirection]);

  const requestSort = (field) => {
    let direction = "asc";
    if (sortField === field && sortDirection === "asc") {
      direction = "desc";
    }
    setSortField(field);
    setSortDirection(direction);
  };

  return { sortedData, sortField, sortDirection, requestSort };
}
