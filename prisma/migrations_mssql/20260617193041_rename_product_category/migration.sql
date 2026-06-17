BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Product] ALTER COLUMN [category] NVARCHAR(1000) NULL;
ALTER TABLE [dbo].[Product] ADD [buyingRateUnit] NVARCHAR(50),
[defaultBuyingRate] DECIMAL(18,2),
[defaultSellingRate] DECIMAL(18,2),
[defaultSellingUnit] NVARCHAR(50),
[displayOrder] INT CONSTRAINT [Product_displayOrder_df] DEFAULT 0,
[productCategoryId] INT,
[sellingRateUnit] NVARCHAR(50),
[unitCategory] NVARCHAR(1000) NOT NULL CONSTRAINT [Product_unitCategory_df] DEFAULT 'WEIGHT';

-- Data backfill step: copy old category to new unitCategory
EXEC(N'UPDATE [dbo].[Product] SET [unitCategory] = [category] WHERE [category] IS NOT NULL;');

-- AlterTable dynamically dropping the default constraint for SalesTrack.type if it exists
DECLARE @SalesTrackTypeConstraint NVARCHAR(256)
SELECT @SalesTrackTypeConstraint = name
FROM sys.default_constraints
WHERE parent_object_id = OBJECT_ID('[dbo].[SalesTrack]')
  AND parent_column_id = COLUMNPROPERTY(OBJECT_ID('[dbo].[SalesTrack]'), 'type', 'ColumnId')

IF @SalesTrackTypeConstraint IS NOT NULL
EXEC('ALTER TABLE [dbo].[SalesTrack] DROP CONSTRAINT [' + @SalesTrackTypeConstraint + ']')

ALTER TABLE [dbo].[SalesTrack] ADD CONSTRAINT [SalesTrack_type_df] DEFAULT 'INTAKE_SALE' FOR [type];

-- AlterTable
ALTER TABLE [dbo].[SupplierInvoiceAdjustment] ADD [code] NVARCHAR(100) NOT NULL CONSTRAINT [SupplierInvoiceAdjustment_code_df] DEFAULT 'LEGACY',
[isLegacySnapshot] BIT NOT NULL CONSTRAINT [SupplierInvoiceAdjustment_isLegacySnapshot_df] DEFAULT 0;

-- AlterTable
ALTER TABLE [dbo].[TransactionAdjustment] ADD [code] NVARCHAR(100) NOT NULL CONSTRAINT [TransactionAdjustment_code_df] DEFAULT 'LEGACY',
[isLegacySnapshot] BIT NOT NULL CONSTRAINT [TransactionAdjustment_isLegacySnapshot_df] DEFAULT 0;

-- CreateTable
CREATE TABLE [dbo].[ProductCategory] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(255) NOT NULL,
    [description] NVARCHAR(1000),
    [isActive] BIT NOT NULL CONSTRAINT [ProductCategory_isActive_df] DEFAULT 1,
    [isDeleted] BIT NOT NULL CONSTRAINT [ProductCategory_isDeleted_df] DEFAULT 0,
    [deletedAt] DATETIME2,
    [deletedBy] INT,
    [deleteReason] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ProductCategory_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [ProductCategory_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ProductCategory_name_key] UNIQUE NONCLUSTERED ([name])
);

-- CreateTable
CREATE TABLE [dbo].[AdjustmentDefinition] (
    [id] INT NOT NULL IDENTITY(1,1),
    [code] NVARCHAR(100) NOT NULL,
    [name] NVARCHAR(255) NOT NULL,
    [method] NVARCHAR(50) NOT NULL,
    [direction] NVARCHAR(50) NOT NULL,
    [defaultConfiguredValue] DECIMAL(18,4),
    [isUserEditable] BIT NOT NULL CONSTRAINT [AdjustmentDefinition_isUserEditable_df] DEFAULT 1,
    [isEnabledByDefault] BIT NOT NULL CONSTRAINT [AdjustmentDefinition_isEnabledByDefault_df] DEFAULT 0,
    [isActive] BIT NOT NULL CONSTRAINT [AdjustmentDefinition_isActive_df] DEFAULT 1,
    [isDeleted] BIT NOT NULL CONSTRAINT [AdjustmentDefinition_isDeleted_df] DEFAULT 0,
    [isSystemDefined] BIT NOT NULL CONSTRAINT [AdjustmentDefinition_isSystemDefined_df] DEFAULT 0,
    [version] INT NOT NULL CONSTRAINT [AdjustmentDefinition_version_df] DEFAULT 1,
    [displayOrder] INT NOT NULL CONSTRAINT [AdjustmentDefinition_displayOrder_df] DEFAULT 0,
    [description] NVARCHAR(max),
    [applicableTo] NVARCHAR(50) NOT NULL CONSTRAINT [AdjustmentDefinition_applicableTo_df] DEFAULT 'BOTH',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AdjustmentDefinition_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [AdjustmentDefinition_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [AdjustmentDefinition_code_key] UNIQUE NONCLUSTERED ([code])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ProductCategory_isDeleted_idx] ON [dbo].[ProductCategory]([isDeleted]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ProductCategory_isActive_idx] ON [dbo].[ProductCategory]([isActive]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IntakeTransaction_partyId_idx] ON [dbo].[IntakeTransaction]([partyId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IntakeTransaction_productId_idx] ON [dbo].[IntakeTransaction]([productId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IntakeTransaction_status_idx] ON [dbo].[IntakeTransaction]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IntakeTransaction_isDeleted_idx] ON [dbo].[IntakeTransaction]([isDeleted]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IntakeTransaction_entryDate_idx] ON [dbo].[IntakeTransaction]([entryDate]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Party_isDeleted_idx] ON [dbo].[Party]([isDeleted]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Party_isActive_idx] ON [dbo].[Party]([isActive]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Product_isDeleted_idx] ON [dbo].[Product]([isDeleted]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Product_isActive_idx] ON [dbo].[Product]([isActive]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [SalesTrack_isDeleted_idx] ON [dbo].[SalesTrack]([isDeleted]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [SalesTrack_intakeTransactionId_idx] ON [dbo].[SalesTrack]([intakeTransactionId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [SalesTrack_saleTransactionId_idx] ON [dbo].[SalesTrack]([saleTransactionId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [SalesTrack_supplierPartyId_idx] ON [dbo].[SalesTrack]([supplierPartyId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [SalesTrack_buyerPartyId_idx] ON [dbo].[SalesTrack]([buyerPartyId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [SalesTrack_productId_idx] ON [dbo].[SalesTrack]([productId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [SaleTransaction_partyId_idx] ON [dbo].[SaleTransaction]([partyId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [SaleTransaction_status_idx] ON [dbo].[SaleTransaction]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [SaleTransaction_isDeleted_idx] ON [dbo].[SaleTransaction]([isDeleted]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [SaleTransaction_entryDate_idx] ON [dbo].[SaleTransaction]([entryDate]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [SupplierInvoice_partyId_idx] ON [dbo].[SupplierInvoice]([partyId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [SupplierInvoice_status_idx] ON [dbo].[SupplierInvoice]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [SupplierInvoice_isDeleted_idx] ON [dbo].[SupplierInvoice]([isDeleted]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [SupplierInvoice_entryDate_idx] ON [dbo].[SupplierInvoice]([entryDate]);

-- AddForeignKey
ALTER TABLE [dbo].[Product] ADD CONSTRAINT [Product_productCategoryId_fkey] FOREIGN KEY ([productCategoryId]) REFERENCES [dbo].[ProductCategory]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
