# Theme and SSR Hydration Developer Guide

This document explains the technical details, causes, and solutions for the dark theme configuration and React/Next.js hydration mismatch issues encountered in the Business Mart dashboard.

---

## 1. Class-Based Dark Mode in Tailwind CSS v4

### The Issue
Clicking the "Toggle Theme" button successfully added or removed the `.dark` class on the root `<html>` element, but components styled with the Tailwind `dark:` prefix (e.g., `dark:bg-slate-950/40`, `dark:border-sky-900`) did not react. Instead, they either remained in light mode or fell back to the user's system preference.

### The Cause
Business Mart is built using **Tailwind CSS v4** (via `@tailwindcss/postcss`). In v4, configuration is CSS-first, and `tailwind.config.js` is no longer used by default:
1. By default, Tailwind v4's `dark:` variant targets `@media (prefers-color-scheme: dark)` rather than class names.
2. Manually toggling a `.dark` class on the `<html>` or `<body>` tag has no effect on utility classes with the `dark:` prefix unless a selector-based custom variant is explicitly defined in the CSS layer.

### The Solution
We added the `@custom-variant` directive to the main stylesheet at the top of `src/app/globals.css`:

```css
@import "tailwindcss";

/* Maps the dark: prefix to the .dark class on the root or ancestors */
@custom-variant dark (&:is(.dark, .dark *));
```

This tells the compiler to apply `dark:` utility variants whenever an element is itself classed with `.dark` or sits nested within a `.dark` container.

---

## 2. SSR Localized Time Hydration Mismatch

### The Issue
React hydration mismatch errors were thrown on the dashboard page, pointing to the transaction timestamps in the `RecentActivityWidget`:
```txt
Hydration failed because the server rendered text didn't match the client.
  +  13:18
  -  01:18 PM
```

### The Cause
During Server-Side Rendering (SSR), Next.js executes the component tree on the Node.js server. 
1. The server formats the timestamp using its local timezone and locale setting (producing, for example, `13:18`).
2. Once the JavaScript bundles mount in the user's browser, the client attempts to render the same timestamp using the user's local browser timezone and regional formatting (producing, for example, `01:18 PM`).
3. Since the HTML output generated on the server doesn't match the initial markup generated on the client, React's hydration checks fail, causing runtime performance overhead as React is forced to regenerate the DOM subtree.

### The Solution
We wrapped the localized time text inside a hydration-safe `ClientTime` component inside `src/modules/dashboard/components/DashboardWidgets.js`:

```javascript
function ClientTime({ dateStr }) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Return a static placeholder during Server-Side Rendering (SSR)
  if (!mounted) {
    return (
      <div className="text-[9px] text-slate-400 dark:text-slate-500 font-mono select-none">
        --:--
      </div>
    );
  }

  // Safely format local time client-side after mounting completes
  const localTime = new Date(dateStr).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit"
  });

  return (
    <div className="text-[9px] text-slate-400 dark:text-slate-500 font-mono">
      {localTime}
    </div>
  );
}
```

* **SSR & Initial Client Render**: Both output the `--:--` placeholder, resulting in a perfect match.
* **After Hydration**: The `useEffect` triggers a state change (`mounted = true`), causing the client to re-render and display the correct local time format without throwing hydration warnings.
