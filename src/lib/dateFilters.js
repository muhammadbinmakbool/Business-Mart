/**
 * Helper to initialize the default date filter state.
 */
export function getDefaultFilterState(defaultPreset = "all") {
  return {
    preset: defaultPreset,
    startDate: "",
    endDate: "",
    month: "" // format "YYYY-MM"
  };
}

/**
 * Shared utility to filter records in memory based on the date range filter state.
 * @param {Array} records - The list of objects to filter.
 * @param {string} dateField - The object field containing the transaction date.
 * @param {Object} filterState - Active state containing preset, startDate, endDate, and month.
 */
export function filterByDateRange(records, dateField, filterState) {
  if (!filterState || filterState.preset === "all") return records;

  const now = new Date();
  let start = null;
  let end = null;

  const getDayBounds = (d) => {
    const s = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    const e = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
    return { s, e };
  };

  switch (filterState.preset) {
    case "today": {
      const bounds = getDayBounds(now);
      start = bounds.s;
      end = bounds.e;
      break;
    }
    case "yesterday": {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const bounds = getDayBounds(yesterday);
      start = bounds.s;
      end = bounds.e;
      break;
    }
    case "this_week": {
      // Start of current week (assuming Monday is start of week)
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now.setDate(diff));
      const boundsStart = getDayBounds(monday);
      const boundsEnd = getDayBounds(new Date());
      start = boundsStart.s;
      end = boundsEnd.e;
      break;
    }
    case "this_month": {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
    }
    case "specific_month": {
      if (filterState.month) {
        const [year, month] = filterState.month.split("-").map(Number);
        // month is 1-indexed in string, convert to 0-indexed for Date
        start = new Date(year, month - 1, 1, 0, 0, 0, 0);
        end = new Date(year, month, 0, 23, 59, 59, 999); // last day of month
      }
      break;
    }
    case "custom": {
      if (filterState.startDate) {
        const [yr, mo, dy] = filterState.startDate.split("-").map(Number);
        start = new Date(yr, mo - 1, dy, 0, 0, 0, 0);
      }
      if (filterState.endDate) {
        const [yr, mo, dy] = filterState.endDate.split("-").map(Number);
        end = new Date(yr, mo - 1, dy, 23, 59, 59, 999);
      }
      break;
    }
    default:
      return records;
  }

  return records.filter((rec) => {
    const dateVal = rec[dateField];
    if (!dateVal) return false;
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return false;

    if (start && d < start) return false;
    if (end && d > end) return false;
    return true;
  });
}
