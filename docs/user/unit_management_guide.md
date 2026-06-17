# Unit and Conversion Management Guide

Business Mart supports a dynamic, database-driven unit management system. This allows administrators to configure unit categories, define custom units, and establish conversion parameters relative to a base unit.

## Key Concepts

### 1. Unit Categories
Every unit must belong to a physical category (e.g., Weight, Liquid, Quantity). Units within the same category are compatible with each other. For example:
* **Weight** category units: Kilogram (KG), Maund (MAUND), Ton (TON)
* **Liquid** category units: Liter (LITER), Milliliter (ML)

### 2. Base Units
Each category has exactly one **Base Unit** which serves as the anchor for all math. The base unit always has a conversion rate of `1.0`. All other units in the category are defined by how many base units they contain.

* **Weight Base Unit**: Kilogram (KG)
* **Liquid Base Unit**: Liter (LITER)
* **Quantity Base Unit**: Piece (PIECE)

### 3. Conversion Rates
A unit's conversion rate specifies **how many base units make up 1 unit**.
* `1 Maund` = `40` Kilograms (Conversion Rate: `40.0`)
* `1 Ton` = `1000` Kilograms (Conversion Rate: `1000.0`)

---

## Administering Units & Categories

Administrators can access unit settings via the **System Settings** panel under the **Defaults** tab.

### Adding or Editing a Unit Category
1. Navigate to **System Settings** > **Defaults** > **Configure Unit Categories**.
2. Click **Add Unit Category** or click **Edit** on an existing category.
3. Provide a **Category Name** (e.g., Weight) and a unique **Category Code** (e.g., WEIGHT).
4. Save the category.

### Adding or Editing a Unit
1. Navigate to **System Settings** > **Defaults** > **Configure Units**.
2. Click **Add Unit** or click **Edit** on an existing unit.
3. Configure the following fields:
   * **Unit Name**: (e.g., Maund)
   * **Unit Code**: Unique abbreviation (e.g., MAUND)
   * **Category**: Select the physical category (e.g., Weight)
   * **Conversion Rate**: Set relative to the category's base unit.
   * **Is Base**: Check this box if this is the standard unit of calculation for this category. (Note: Only one base unit is allowed per category).
   * **Is Custom**: Mark this option for units that are specific to a single product type (like product-specific BAG or PACK packagings).
4. Save changes.
