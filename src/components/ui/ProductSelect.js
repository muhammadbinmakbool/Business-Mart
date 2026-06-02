"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Search, X } from "lucide-react";

/**
 * Reusable, searchable and clearable product dropdown component.
 * 
 * @param {Array} products - Array of product objects (e.g. [{ id, name, category }])
 * @param {number|string|null} value - Current selected product ID
 * @param {function} onChange - Callback triggered on selection change, receives product ID or null
 * @param {string} placeholder - Default placeholder text
 * @param {boolean} disabled - Whether the select is disabled
 */
export default function ProductSelect({ 
  products = [], 
  value = null, 
  onChange, 
  placeholder = "Select product...",
  disabled = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef(null);

  const selectedProduct = products.find(p => p.id === (value ? parseInt(value) : null));

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter products based on search query
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <div
        className={`w-full flex items-center justify-between rounded-lg border bg-background px-3.5 py-2.5 text-sm outline-none transition-all ${
          disabled 
            ? "opacity-50 cursor-not-allowed bg-muted" 
            : "cursor-pointer focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary border-input"
        }`}
        onClick={handleToggle}
      >
        <span className={selectedProduct ? "text-foreground font-semibold" : "text-muted-foreground"}>
          {selectedProduct ? selectedProduct.name : placeholder}
        </span>
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {value && !disabled && (
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setSearchQuery("");
              }}
              className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border bg-card p-2 shadow-lg animate-in fade-in slide-in-from-top-2 duration-150 max-h-60 overflow-y-auto">
          <div className="flex items-center gap-2 border-b px-2.5 pb-2 mb-1.5">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground text-foreground"
              autoFocus
            />
          </div>
          {filteredProducts.length === 0 ? (
            <div className="text-center text-xs text-muted-foreground py-4">
              No products found
            </div>
          ) : (
            <div className="space-y-0.5">
              {filteredProducts.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onChange(p.id);
                    setIsOpen(false);
                    setSearchQuery("");
                  }}
                  className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors flex items-center justify-between ${
                    value && parseInt(value) === p.id
                      ? "bg-primary text-primary-foreground font-bold"
                      : "hover:bg-accent text-foreground"
                  }`}
                >
                  <span>{p.name}</span>
                  {p.category && (
                    <span className={`text-[10px] uppercase font-black px-1.5 py-0.5 rounded shrink-0 ml-2 ${
                      value && parseInt(value) === p.id
                        ? "bg-white/20 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {p.category}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
