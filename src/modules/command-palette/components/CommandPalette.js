"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  Search, 
  Compass, 
  Plus, 
  Users, 
  Package, 
  ReceiptText, 
  ShoppingCart,
  CornerDownLeft, 
  Sparkles,
  X
} from "lucide-react";
import { getCommandPaletteDataAction } from "../controllers/commandPaletteActions";
import { STATIC_COMMANDS } from "../registry/commandRegistry";
import { executeCommand } from "../utils/commandExecutor";

export default function CommandPalette() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [dbData, setDbData] = useState({ parties: [], products: [], sales: [], intakes: [] });
  const [loading, setLoading] = useState(false);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const scrollRef = useRef(null);

  // Toggle Command Palette visibility with Ctrl + K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fetch recent data when palette is opened
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setSelectedIndex(0);
      setLoading(true);
      
      // Auto-focus input
      setTimeout(() => inputRef.current?.focus(), 50);

      getCommandPaletteDataAction().then((data) => {
        setDbData(data);
        setLoading(false);
      });
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Fuzzy Weighted Search Logic
  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    // 1. Gather all searchable items
    const allItems = [
      ...STATIC_COMMANDS.map(c => ({ ...c, keywords: c.keywords || [] })),
      ...dbData.parties.map(p => ({ ...p, title: p.title, keywords: p.keywords || [] })),
      ...dbData.products.map(p => ({ ...p, title: p.title, keywords: p.keywords || [] })),
      ...dbData.sales.map(s => ({ ...s, title: s.title, keywords: s.keywords || [] })),
      ...dbData.intakes.map(i => ({ ...i, title: i.title, keywords: i.keywords || [] }))
    ];

    if (!q) {
      // If empty query, show static commands and recent transactions first
      return allItems.filter(item => item.type === "navigation" || item.type === "create" || item.type === "sale" || item.type === "intake").slice(0, 15);
    }

    // 2. Score matches based on priority: exact (3), startsWith (2), includes (1)
    const scored = allItems.map(item => {
      const titleLower = item.title.toLowerCase();
      let maxScore = 0;

      // Check title match
      if (titleLower === q) {
        maxScore = 3;
      } else if (titleLower.startsWith(q)) {
        maxScore = 2;
      } else if (titleLower.includes(q)) {
        maxScore = 1;
      }

      // Check subtitle match
      if (item.subtitle) {
        const subLower = item.subtitle.toLowerCase();
        if (subLower.startsWith(q)) {
          maxScore = Math.max(maxScore, 1);
        } else if (subLower.includes(q)) {
          maxScore = Math.max(maxScore, 1);
        }
      }

      // Check keywords match
      if (item.keywords) {
        for (const keyword of item.keywords) {
          const kwLower = keyword.toLowerCase();
          if (kwLower === q) {
            maxScore = Math.max(maxScore, 3);
          } else if (kwLower.startsWith(q)) {
            maxScore = Math.max(maxScore, 2);
          } else if (kwLower.includes(q)) {
            maxScore = Math.max(maxScore, 1);
          }
        }
      }

      return { item, score: maxScore };
    });

    // 3. Filter matched items and sort by score descending
    return scored
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(x => x.item)
      .slice(0, 20); // Show max 20 matches for optimal scrolling
  }, [searchQuery, dbData]);

  // Adjust selection when search query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  // Keyboard navigation inside the palette
  const handleKeyDown = (e) => {
    if (!isOpen) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        executeCommand(filteredItems[selectedIndex], router, () => setIsOpen(false));
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  // Center selected item in scroll container
  useEffect(() => {
    if (scrollRef.current) {
      const activeEl = scrollRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm z-[99999] flex items-start justify-center pt-[10vh]"
      onKeyDown={handleKeyDown}
    >
      <div 
        ref={containerRef}
        className="max-w-xl w-full mx-4 bg-background border rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 border-border"
      >
        {/* Header Search Field */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b relative">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search record (Ctrl+K to close)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground font-medium"
          />
          <button 
            type="button" 
            onClick={() => setIsOpen(false)}
            className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results Area */}
        <div 
          ref={scrollRef}
          className="max-h-[350px] overflow-y-auto p-2 space-y-1 bg-card/30"
        >
          {loading && filteredItems.length === 0 ? (
            <div className="text-center py-8 text-xs font-semibold text-muted-foreground flex items-center justify-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              Caching offline data for quick search...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8 text-xs font-semibold text-muted-foreground">
              No matching commands or records found
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const isActive = index === selectedIndex;
              const Icon = item.type === "navigation" ? Compass :
                           item.type === "create" ? Plus :
                           item.type === "party" ? Users :
                           item.type === "product" ? Package :
                           item.type === "sale" ? ReceiptText : ShoppingCart;

              return (
                <div
                  key={item.id}
                  data-active={isActive}
                  onClick={() => executeCommand(item, router, () => setIsOpen(false))}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150 ${
                    isActive 
                      ? "bg-primary text-primary-foreground shadow-md scale-[1.01]" 
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-1.5 rounded-lg shrink-0 ${isActive ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold leading-tight truncate">{item.title}</p>
                      {item.subtitle && (
                        <p className={`text-[10px] leading-tight mt-0.5 truncate ${isActive ? "text-white/70" : "text-muted-foreground font-semibold"}`}>
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  {isActive && (
                    <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-md text-white">
                      <span>Select</span>
                      <CornerDownLeft className="h-3 w-3" />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 bg-muted/50 border-t flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-background border rounded shadow-sm text-[8px] font-bold">↑↓</kbd> Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-background border rounded shadow-sm text-[8px] font-bold">Enter</kbd> Open
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-background border rounded shadow-sm text-[8px] font-bold">Esc</kbd> Close
            </span>
          </div>
          <span className="flex items-center gap-1 text-primary">
            <Sparkles className="h-3 w-3" /> Ctrl+K
          </span>
        </div>
      </div>
    </div>
  );
}
