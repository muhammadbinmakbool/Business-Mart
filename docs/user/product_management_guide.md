# Product & Category Management User Guide

This guide describes how to organize inventory items, set business defaults, and manage product categories.

## 1. Product Categories

Product Categories let you group inventory items for reporting and organizational purposes.

### Accessing Categories:
1. Navigate to **Product Categories** using the sidebar navigation.
2. Here you can view a list of all configured categories, along with the number of products linked to each.

### Creating or Editing a Category:
1. Click **Add Category** at the top right of the Categories screen.
2. Enter a unique name and optional description.
3. The **Status** toggle determines whether this category is active and selectable on forms.
4. Click **Save Category**.

> [!IMPORTANT]
> **Category Deletion Rule**: You cannot delete a category that currently has active products linked to it. You must reassign or disable those products first.

---

## 2. Configuring Product Defaults & Rates

When adding or editing a product under **Products**, you can configure defaults that speed up transaction entries:

1. **Category Group**: Assign the product to a relational Category.
2. **Unit Category**: Select whether this product is measured by **WEIGHT** (e.g. KG, Maund), **LIQUID** (e.g. Liter), or **QUANTITY** (e.g. Piece, Pack).
3. **Display Sort Order**: A number determining where the product appears in selection dropdowns.
4. **Default Buying & Selling Rates**: Set a standard price and choose a compatible rate unit (e.g. 2500 per Maund, or 100 per KG).
5. **Default Selling Unit**: Define the standard unit used when generating sales invoices for this item.

---

## 3. How Defaults Prefill in Workflows

Configured product defaults automatically populate fields when a product is selected in transaction forms:

### Goods Intake:
* Selecting a product automatically sets the **Inventory Unit** based on the product’s primary unit default or session memory.

### Classic Sales / POS Billing:
* Selecting a product resolves the **Quantity Unit**, **Rate Unit**, and **Unit Price** automatically.
* Override Precedence:
  1. **User Override**: Direct typing always takes precedence.
  2. **Session Memory**: Prefills based on your last entered item if compatible.
  3. **Product Defaults**: Prefills the defaults set on the Product profile.
  4. **System Fallbacks**: Uses system base units if nothing else is specified.
