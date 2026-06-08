"use client";

import React, { useState, useEffect } from "react";
import { Search } from "lucide-react";

/**
 * Reusable debounced search input component.
 * @param {string} value - The current value of the search query.
 * @param {function} onChange - Callback function triggered when search query is updated (debounced).
 * @param {string} placeholder - Input placeholder.
 * @param {number} debounceTimeout - Time to wait before updating query in ms.
 * @param {string} className - Optional container styling classes.
 */
export default function DebouncedSearchInput({
  value,
  onChange,
  placeholder = "Search...",
  debounceTimeout = 300,
  className = ""
}) {
  const [inputValue, setInputValue] = useState(value);

  // Sync internal state with external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Handle debouncing
  useEffect(() => {
    const handler = setTimeout(() => {
      onChange(inputValue);
    }, debounceTimeout);

    return () => {
      clearTimeout(handler);
    };
  }, [inputValue, onChange, debounceTimeout]);

  return (
    <div className={`flex-1 flex items-center gap-2 rounded-xl border bg-card px-3 py-2.5 shadow-sm ${className}`}>
      <Search className="h-4 w-4 text-muted-foreground pointer-events-none" />
      <input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
