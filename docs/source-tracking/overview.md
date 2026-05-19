# Source Tracking Overview (SalesTrack)

**Optional Informational Layer**

The Source Tracking module (implemented via the `SalesTrack` table) is an independent, optional business register for tracking supplier-to-buyer mappings.

## Core Philosophy

1. **Independent Register**: This is NOT an inventory allocation engine. It is a manual mapping register for business record-keeping.
2. **Optional Links**: All associations with core entities (Sales, Intakes, Parties, Products) are optional.
3. **Informational Only**: The existence or absence of records in this module has zero impact on the core POS, Inventory, or Ledger calculations.
4. **Manual Operation**: Users manually add entries to this register to track business-specific mappings (e.g., "600 KG of Supplier A's wheat was sold to Buyer X").

## Database Model: `SalesTrack`

The `SalesTrack` model stores:
- **Links**: Optional IDs for `SaleTransaction`, `SaleItem`, `IntakeTransaction`, `Party` (Supplier/Buyer), and `Product`.
- **Metrics**: `quantity`, `buyingRate`, `sellingRate`, `netWeight`, and `baseAmount`.
- **Metadata**: `notes`.

## Key Differentiator from Allocation Engines

Unlike an ERP allocation system:
- There is no "remaining weight" tracking.
- There is no FIFO or auto-allocation logic.
- There is no "Traced" status derived from sales.
- Deleting a track entry has no effect on the linked sale or intake.

This design ensures the core system remains simple and performant while providing advanced tracking capabilities for businesses that require them.
