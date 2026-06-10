import { format } from "date-fns";

export const exportSchemas = {
  sales: {
    version: 1,
    columns: [
      { header: "Sale No", key: "saleNumber" },
      { header: "Date", key: "entryDate", format: (val) => val ? format(new Date(val), "yyyy-MM-dd") : "" },
      { header: "Buyer", key: "party.name" },
      { 
        header: "Product", 
        key: "items", 
        format: (items) => {
          if (!items || items.length === 0) return "";
          return items.map(item => item.product?.name).filter(Boolean).join(", ");
        } 
      },
      { 
        header: "Quantity", 
        key: "items", 
        format: (items) => {
          if (!items) return 0;
          return items.reduce((sum, item) => sum + Number(item.weight || 0), 0);
        } 
      },
      { 
        header: "Unit", 
        key: "items", 
        format: (items) => {
          if (!items || items.length === 0) return "KG";
          if (items.length === 1) return items[0].unit || "KG";
          return Array.from(new Set(items.map(item => item.unit || "KG"))).join("/");
        } 
      },
      { 
        header: "Rate", 
        key: "items", 
        format: (items) => {
          if (!items || items.length !== 1) return "Multiple";
          return Number(items[0].rate || 0); // Keep raw number
        } 
      },
      { header: "Amount", key: "finalAmount", format: (val) => Number(val || 0) }, // Keep raw number
      { header: "Status", key: "status" }
    ]
  },
  settlements: {
    version: 1,
    columns: [
      { header: "Settlement No", key: "invoiceNumber" },
      { header: "Supplier", key: "party.name" },
      { header: "Date", key: "entryDate", format: (val) => val ? format(new Date(val), "yyyy-MM-dd") : "" },
      { header: "Gross Amount", key: "totalGrossValue", format: (val) => Number(val || 0) },
      { 
        header: "Adjustments", 
        key: "adjustments", 
        format: (_, record) => Number(record.totalDeductions || 0) + Number(record.totalAdvances || 0)
      },
      { header: "Final Amount", key: "finalPayableAmount", format: (val) => Number(val || 0) },
      { header: "Status", key: "status" }
    ]
  },
  ledger: {
    version: 1,
    columns: [
      { 
        header: "Period", 
        key: "period", 
        format: (_, record) => {
          const start = record.startDate ? format(new Date(record.startDate), "yyyy-MM-dd") : "";
          const end = record.endDate ? format(new Date(record.endDate), "yyyy-MM-dd") : "";
          return start && end ? `${start} to ${end}` : "";
        }
      },
      { header: "Supplier Total", key: "supplierTotal", format: (val) => Number(val || 0) },
      { header: "Buyer Total", key: "buyerTotal", format: (val) => Number(val || 0) },
      { header: "Difference", key: "difference", format: (val) => Number(val || 0) },
      { header: "Status", key: "status" }
    ]
  }
};
