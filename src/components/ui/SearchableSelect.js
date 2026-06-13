"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Search, X } from "lucide-react";

/**
 * A reusable, searchable, keyboard-navigable select dropdown component.
 * Designed to look premium and work seamlessly with Next.js Server Actions and Form submissions.
 */
export default React.forwardRef(function SearchableSelect({ 
  options = [], // Array of { value, label, subLabel, specialOption }
  value = "", 
  onChange, 
  name, 
  placeholder = "Select option...",
  disabled = false,
  required = false,
  id,
  className = ""
}, ref) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = useMemo(() => {
    return options.find(o => String(o.value) === String(value));
  }, [options, value]);

  // Compute filtered and prefix-sorted options
  const sortedOptions = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    
    // Filter options matching label or subLabel
    const filtered = options.filter(o => {
      // If it's a special option, show only when query is empty or matches its own label/subLabel
      if (o.specialOption) {
        if (!query) return true;
        const labelStr = (o.label || "").toLowerCase();
        const subLabelStr = (o.subLabel || "").toLowerCase();
        return labelStr.includes(query) || subLabelStr.includes(query);
      }
      
      const labelStr = (o.label || "").toLowerCase();
      const subLabelStr = (o.subLabel || "").toLowerCase();
      return labelStr.includes(query) || subLabelStr.includes(query);
    });

    // If query is empty, keep original order
    if (!query) return filtered;

    // Split into startsWith and includes groups
    const startsWithGroup = [];
    const includesGroup = [];

    filtered.forEach(o => {
      const labelStr = (o.label || "").toLowerCase();
      if (labelStr.startsWith(query)) {
        startsWithGroup.push(o);
      } else {
        includesGroup.push(o);
      }
    });

    return [...startsWithGroup, ...includesGroup];
  }, [options, searchQuery]);

  // Reset highlight index when dropdown opens or filter query changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery, isOpen]);

  // Scroll active/highlighted item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const activeEl = listRef.current.querySelector('[data-highlighted="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex, isOpen]);

  // Reset scroll to top when opening
  const handleToggle = () => {
    if (disabled) return;
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen) {
      setSearchQuery("");
      // Focus search input on next tick
      setTimeout(() => {
        inputRef.current?.focus();
        if (listRef.current) {
          listRef.current.scrollTop = 0;
        }
      }, 50);
    }
  };

  // Keyboard navigation handler on the dropdown trigger/container
  const handleKeyDown = (e) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        onChange?.("");
        setSearchQuery("");
        return;
      }
      if (e.key === " " || e.key === "Spacebar" || e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        handleToggle();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex(prev => (prev + 1) % sortedOptions.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex(prev => (prev - 1 + sortedOptions.length) % sortedOptions.length);
        break;
      case "Enter":
        e.preventDefault();
        e.stopPropagation();
        if (sortedOptions[highlightedIndex]) {
          onChange?.(sortedOptions[highlightedIndex].value);
          setIsOpen(false);
          setSearchQuery("");
          containerRef.current?.querySelector("button")?.focus();
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setSearchQuery("");
        containerRef.current?.querySelector("button")?.focus();
        break;
      case "Tab":
        // Let natural tab navigation close dropdown
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div className="relative w-full" ref={containerRef} onKeyDown={handleKeyDown}>
      {/* Hidden input for HTML form validation/submission */}
      <input 
        type="hidden" 
        name={name} 
        value={value || ""} 
        required={required} 
      />

      <button
        ref={ref}
        id={id}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={`w-full flex items-center justify-between rounded-md border bg-background text-foreground px-3 py-2 text-sm text-left focus:outline-none focus:ring-2 focus:ring-primary font-medium transition-all ${
          disabled 
            ? "opacity-50 cursor-not-allowed bg-muted border-input" 
            : isOpen 
              ? "ring-2 ring-primary border-primary" 
              : "border-input hover:border-muted-foreground/30"
        } ${className}`}
      >
        <span className={selectedOption ? "text-foreground font-medium" : "text-muted-foreground"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {value && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              onClick={() => {
                onChange?.("");
                setSearchQuery("");
                // Refocus trigger
                containerRef.current?.querySelector("button")?.focus();
              }}
              className="p-0.5 hover:bg-accent rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border bg-card p-2 shadow-lg animate-in fade-in slide-in-from-top-2 duration-150 max-h-60 overflow-y-auto flex flex-col">
          <div className="flex items-center gap-2 border-b px-2.5 pb-2 mb-1.5 shrink-0">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground text-foreground"
            />
          </div>
          <div ref={listRef} className="overflow-y-auto flex-1 space-y-0.5 max-h-48">
            {sortedOptions.length === 0 ? (
              <div className="text-center text-xs text-muted-foreground py-4">
                No matches found
              </div>
            ) : (
              sortedOptions.map((o, index) => {
                const isSelected = String(value) === String(o.value);
                const isHighlighted = index === highlightedIndex;
                return (
                  <button
                    key={o.value}
                    type="button"
                    data-highlighted={isHighlighted ? "true" : "false"}
                    onClick={() => {
                      onChange?.(o.value);
                      setIsOpen(false);
                      setSearchQuery("");
                      // Refocus trigger
                      containerRef.current?.querySelector("button")?.focus();
                    }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors flex items-center justify-between outline-none ${
                      isSelected
                        ? "bg-primary text-primary-foreground font-bold"
                        : isHighlighted
                          ? "bg-accent text-accent-foreground"
                          : "text-foreground hover:bg-accent/50"
                    }`}
                  >
                    <span className={o.specialOption ? "font-bold text-primary" : ""}>
                      {o.label}
                    </span>
                    {o.subLabel && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ml-2 ${
                        isSelected
                          ? "bg-white/20 text-white"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {o.subLabel}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
});
