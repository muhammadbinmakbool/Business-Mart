BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[IntakeTransaction] ADD [packagingMeta] NVARCHAR(max);

-- AlterTable
ALTER TABLE [dbo].[SaleItem] ADD [packagingMeta] NVARCHAR(max);

-- AlterTable to add missing isUserEditable column
ALTER TABLE [dbo].[TransactionAdjustment] ADD [isUserEditable] BIT NOT NULL CONSTRAINT [TransactionAdjustment_isUserEditable_df] DEFAULT 1;

-- AlterTable to add missing isUserEditable column
ALTER TABLE [dbo].[SupplierInvoiceAdjustment] ADD [isUserEditable] BIT NOT NULL CONSTRAINT [SupplierInvoiceAdjustment_isUserEditable_df] DEFAULT 1;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
