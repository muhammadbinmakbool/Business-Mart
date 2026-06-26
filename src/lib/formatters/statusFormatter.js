export function formatIntakeStatus(status, intakeMode) {
  if (status === "PENDING" && intakeMode === "PURCHASE") {
    return "Received";
  }
  const mapping = {
    PENDING: "Pending",
    PARTIAL: "Partially Sold",
    SOLD: "Sold",
    CLEARED: "Cleared",
    CANCELLED: "Cancelled"
  };
  return mapping[status] || status;
}

export function getIntakeStatusBadgeClass(status) {
  const classes = {
    PENDING: "bg-amber-100 text-amber-700 border-amber-200",
    PARTIAL: "bg-purple-100 text-purple-700 border-purple-200",
    SOLD: "bg-emerald-100 text-emerald-700 border-emerald-200",
    CLEARED: "bg-blue-100 text-blue-700 border-blue-200",
    CANCELLED: "bg-rose-100 text-rose-700 border-rose-200"
  };
  return classes[status] || "bg-gray-100 text-gray-700 border-gray-200";
}
