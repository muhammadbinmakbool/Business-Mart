BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[IntakeTransaction] ADD [packagingMeta] NVARCHAR(max);

-- AlterTable
ALTER TABLE [dbo].[SaleItem] ADD [packagingMeta] NVARCHAR(max);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
