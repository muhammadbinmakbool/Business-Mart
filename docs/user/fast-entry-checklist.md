# Fast Entry System — Operator Testing Checklist

Use this checklist during real-world testing passes. Every scenario should be tested by acting as a real grain market operator — not as a developer. Sit at the keyboard, pretend you have 40 intakes to record before lunch, and go.

---

## 🟢 Goods Intake

### Keyboard-Only Flow
- [ ] Create an intake using only Enter to move between fields (no mouse at all)
- [ ] Use Shift+Enter to go back and correct a previous field
- [ ] Use Ctrl+Enter to save from any field position
- [ ] Use Escape to cancel or dismiss focus

### Mouse-Only Flow
- [ ] Create an intake using only mouse clicks and typing (no Enter navigation)
- [ ] Verify dropdowns open and close correctly with mouse
- [ ] Verify Save button works via click

### Mixed Keyboard + Mouse Flow
- [ ] Start with mouse (select supplier), then switch to keyboard (Enter through remaining fields)
- [ ] Start with keyboard, then use mouse to correct a middle field, then continue with keyboard

### Save & Add Another
- [ ] Enable "Save & Add Another" checkbox
- [ ] Save a record with Ctrl+Enter — verify form resets but supplier/product are retained
- [ ] Immediately record a second intake without reselecting supplier
- [ ] Disable "Save & Add Another" — verify redirect to list view after save

### Suggestion System
- [ ] Open a fresh intake form — verify supplier suggestion appears (if memory exists)
- [ ] Click "Apply" on supplier suggestion — verify it populates
- [ ] Ignore the suggestion and manually select a different supplier
- [ ] Verify product suggestion appears after supplier selection
- [ ] Apply product suggestion, then verify unit suggestion appears
- [ ] Ignore all suggestions and manually fill every field

### Midway Changes
- [ ] Select Supplier A, fill product and weight, then change supplier to Supplier B — verify no data corruption
- [ ] Select Product X, fill weight, then change product to Product Y — verify unit resets correctly
- [ ] Select "Add New Supplier" midway — verify inline creation fields appear and work

---

## 🔵 Sales / Billing

### Single Item Invoice
- [ ] Create a sale with exactly 1 product line — verify totals calculate correctly
- [ ] Save and verify the invoice detail page shows correct data

### Multi-Item Invoice (5 items)
- [ ] Create a sale with 5 product rows
- [ ] Verify row-based suggestions appear (product, unit, rate from previous row)
- [ ] Apply suggestions on some rows, manually override on others
- [ ] Verify running totals update correctly as each row is filled

### Stress Test (20 items)
- [ ] Create a sale with 20 product rows
- [ ] Verify no UI lag or freezing during rapid entry
- [ ] Verify scroll behavior remains smooth in the items table
- [ ] Verify totals remain accurate across all 20 rows

### Row Addition Methods
- [ ] Add a new row by pressing Enter on the last row's Rate field (auto-append)
- [ ] Add a new row by clicking the "+ Add Row" button
- [ ] Remove a row using the delete button — verify totals recalculate
- [ ] Remove all rows except one — verify form doesn't break

### Save & New
- [ ] Enable "Save & New" mode
- [ ] Save a sale — verify form resets but buyer is retained
- [ ] Immediately create a second sale
- [ ] Verify memory suggestions refresh after save

### Suggestion Behavior
- [ ] Verify buyer suggestion appears on empty buyer field
- [ ] On first item row: verify product/rate/unit suggestions come from memory store
- [ ] On second item row: verify suggestions come from the first row's values
- [ ] Manually override a suggestion — verify the override sticks and is not reverted
- [ ] Type into a field that has a suggestion visible — verify suggestion disappears instantly

---

## 🟡 Command Palette (Ctrl+K)

- [ ] Press Ctrl+K from Dashboard — verify palette opens
- [ ] Press Ctrl+K from Intake form — verify palette opens without interfering with form
- [ ] Type "sale" — verify navigation and create commands appear
- [ ] Use ArrowDown/ArrowUp to navigate results
- [ ] Press Enter to select a result — verify correct navigation
- [ ] Press Escape to close palette
- [ ] Click outside palette to close it
- [ ] Open palette, navigate to "Create New Sale", press Enter — verify redirect
- [ ] Search for a party name — verify it appears in results
- [ ] Search for a product name — verify it appears in results
- [ ] Search with a nonsense string — verify "No results" message appears

---

## 🔴 Edge Cases

### Empty / Invalid Fields
- [ ] Try to save an intake with no supplier selected — verify validation blocks it
- [ ] Try to save a sale with empty product rows — verify validation blocks it
- [ ] Enter 0 or negative weight — verify rejection
- [ ] Enter 0 or negative rate — verify rejection
- [ ] Leave all fields empty and press Ctrl+Enter — verify nothing breaks

### Browser Behavior
- [ ] Fill half a form, switch browser tabs, come back — verify form state is preserved
- [ ] Fill half a form, press browser Back button — verify no crash (data may be lost, that's acceptable)
- [ ] Fill half a form, press F5 (refresh) — verify page reloads cleanly without errors
- [ ] Open two intake forms in two tabs — verify they don't interfere with each other

### Edit Mode
- [ ] Open an existing intake for editing — verify keyboard flow is disabled (edit mode)
- [ ] Open an existing sale for editing — verify keyboard flow is disabled (edit mode)
- [ ] Verify suggestions do NOT appear in edit mode
- [ ] Save an edited record — verify no duplicate creation

### Duplicate Submissions
- [ ] Press Ctrl+Enter rapidly 3 times — verify only one submission occurs
- [ ] Click Save button rapidly 3 times — verify only one submission occurs
- [ ] Verify loading/disabled state prevents re-entry during submission

### Speed / Typing
- [ ] Type extremely fast through all fields using Enter — verify no fields are skipped
- [ ] Type a value, immediately press Enter — verify the value is captured (not lost to race condition)
- [ ] Rapidly switch between suppliers — verify no stale suggestion artifacts remain

---

## 🟣 Accessibility & System Shortcuts

### Tab Navigation
- [ ] Press Tab — verify it moves focus to the next browser-native focusable element
- [ ] Press Shift+Tab — verify it moves focus backward
- [ ] Verify Tab does NOT conflict with Enter-based Fast Entry navigation

### Escape Key
- [ ] Press Escape in a form — verify it does NOT submit or navigate away
- [ ] Press Escape with Command Palette open — verify palette closes
- [ ] Press Escape with an error modal open — verify modal closes

### System Clipboard Shortcuts
- [ ] Ctrl+C in an input field — verify standard copy works
- [ ] Ctrl+V in an input field — verify standard paste works
- [ ] Ctrl+A in an input field — verify select-all works
- [ ] Ctrl+Z in an input field — verify undo works
- [ ] Verify none of the above are intercepted or broken by Fast Entry key handlers

### Ctrl+K Isolation
- [ ] While typing in a Rate input, press Ctrl+K — verify palette opens (no "K" typed into field)
- [ ] Close palette, verify cursor returns to the field that was active before opening

---

## 📋 Full Workflow Simulation

These are end-to-end operator scenarios. Time yourself.

### Morning Intake Batch (Target: under 10 minutes)
- [ ] Record 10 consecutive intakes from 3 different suppliers using Save & Add Another
- [ ] Use keyboard-only for at least 5 of them
- [ ] Use Ctrl+K to navigate to the Intake list and verify all 10 appear

### Afternoon Sales Batch (Target: under 15 minutes)
- [ ] Create 5 sales invoices, each with 2–4 line items
- [ ] Use row-based suggestions on at least 3 invoices
- [ ] Use Save & New for all 5
- [ ] Navigate to each sale via Ctrl+K and verify totals

### Error Recovery Drill
- [ ] Create an intake with wrong supplier — save it — then edit and fix the supplier
- [ ] Create a sale with wrong rate — save it — then edit and fix the rate
- [ ] Attempt to save with missing required fields — verify clear error messaging
- [ ] Dismiss error modals and correct the fields — verify successful save on retry

---

> **Tip**: Keep a notepad open while testing. Write down every moment of friction — anything that made you pause, squint, or reach for the mouse when you didn't want to. Those notes are more valuable than any feature request.
