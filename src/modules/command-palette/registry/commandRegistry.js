export const STATIC_COMMANDS = [
  // Navigation
  {
    id: "go-to-dashboard",
    title: "Go to Dashboard",
    type: "navigation",
    keywords: ["dashboard", "home", "analytics"],
    url: "/dashboard"
  },
  {
    id: "go-to-parties",
    title: "Go to Parties",
    type: "navigation",
    keywords: ["parties", "clients", "buyers", "suppliers", "customers", "vendors"],
    url: "/parties"
  },
  {
    id: "go-to-products",
    title: "Go to Products",
    type: "navigation",
    keywords: ["products", "items", "inventory", "goods", "stock"],
    url: "/products"
  },
  {
    id: "go-to-intake",
    title: "Go to Goods Intake",
    type: "navigation",
    keywords: ["intake", "purchases", "goods arrival", "arrivals"],
    url: "/intake"
  },
  {
    id: "go-to-advances",
    title: "Go to Supplier Advances",
    type: "navigation",
    keywords: ["advances", "advance payments", "cash out"],
    url: "/advances"
  },
  {
    id: "go-to-settlements",
    title: "Go to Supplier Settlements",
    type: "navigation",
    keywords: ["settlements", "supplier invoices", "billing purchases"],
    url: "/supplier-invoices"
  },
  {
    id: "go-to-sales",
    title: "Go to Sales / Billing",
    type: "navigation",
    keywords: ["sales", "billing", "invoices", "selling"],
    url: "/sales"
  },
  {
    id: "go-to-source-tracking",
    title: "Go to Source Tracking",
    type: "navigation",
    keywords: ["source tracking", "dispatch", "tracing"],
    url: "/source-tracking"
  },
  {
    id: "go-to-ledger",
    title: "Go to Ledger",
    type: "navigation",
    keywords: ["ledger", "accounts", "bookkeeping", "double-entry"],
    url: "/ledger"
  },
  {
    id: "go-to-market-insight",
    title: "Go to Market Insight",
    type: "navigation",
    keywords: ["market insight", "trends", "rates", "prices"],
    url: "/market-insight"
  },
  {
    id: "go-to-activity",
    title: "Go to Activity Log",
    type: "navigation",
    keywords: ["activity log", "audit", "logs", "history"],
    url: "/activity"
  },
  {
    id: "go-to-settings",
    title: "Go to Settings",
    type: "navigation",
    keywords: ["settings", "configuration", "preferences"],
    url: "/settings"
  },

  // Quick Create
  {
    id: "create-party",
    title: "Create New Party",
    type: "create",
    keywords: ["new party", "add party", "new buyer", "new supplier"],
    url: "/parties/create"
  },
  {
    id: "create-product",
    title: "Create New Product",
    type: "create",
    keywords: ["new product", "add product", "new item", "create item"],
    url: "/products/create"
  },
  {
    id: "create-sale",
    title: "Create New Sale / Invoice",
    type: "create",
    keywords: ["new sale", "create invoice", "billing"],
    url: "/sales/create"
  },
  {
    id: "create-intake",
    title: "Create New Goods Intake",
    type: "create",
    keywords: ["new intake", "receive goods", "new purchase"],
    url: "/intake/create"
  }
];
