/**
 * PRINT SUBSYSTEM COLOR PALETTE
 * 
 * html2canvas (used by html2pdf) does NOT support oklch/oklab color spaces.
 * This file defines hex and rgba color constants compatible with html2canvas.
 */
export const PRINT_COLORS = {
  primary: "#1e3a8a", // Safe deep blue for primary branding
  text: {
    slate900: "#0f172a",
    slate800: "#1e293b",
    slate700: "#334155",
    slate600: "#475569",
    slate500: "#64748b",
    slate400: "#94a3b8",
  },
  bg: {
    slate100: "#f1f5f9",
    slate50: "#f8fafc",
    slate50_50: "rgba(248, 250, 252, 0.5)",
    slate50_30: "rgba(248, 250, 252, 0.3)",
    slate50_20: "rgba(248, 250, 252, 0.2)",
    slate50_10: "rgba(248, 250, 252, 0.1)",
  },
  success: {
    text950: "#022c22",
    text800: "#065f46",
    text700: "#047857",
    text600: "#059669",
    bg50: "#ecfdf5",
    bg100: "#d1fae5",
    bg50_10: "rgba(236, 253, 245, 0.1)",
    bg50_5: "rgba(236, 253, 245, 0.05)",
    border200: "#a7f3d0",
    border100: "#d1fae5",
  },
  danger: {
    text950: "#450a0a",
    text800: "#9f1239",
    text700: "#be123c",
    text600: "#e11d48",
    bg50: "#fff1f2",
    bg50_30: "rgba(255, 241, 242, 0.3)",
    border200: "#fecdd3",
    border100: "#ffe4e6",
  }
};
