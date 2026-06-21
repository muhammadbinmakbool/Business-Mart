-- Rename columns normalizedWeight -> baseQuantity
EXEC sp_rename 'IntakeTransaction.normalizedWeight', 'baseQuantity', 'COLUMN';
EXEC sp_rename 'SaleItem.normalizedWeight', 'baseQuantity', 'COLUMN';
