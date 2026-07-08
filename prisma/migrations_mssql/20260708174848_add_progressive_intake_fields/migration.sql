BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[IntakeTransaction] ADD [arrivalMeta] NVARCHAR(max);
ALTER TABLE [dbo].[IntakeTransaction] ADD [isWeightRecorded] BIT NOT NULL CONSTRAINT [IntakeTransaction_isWeightRecorded_df] DEFAULT 1;
ALTER TABLE [dbo].[IntakeTransaction] ADD [arrivalCompletedAt] DATETIME2;
ALTER TABLE [dbo].[IntakeTransaction] ADD [sellingCompletedAt] DATETIME2;
ALTER TABLE [dbo].[IntakeTransaction] ADD [weightCompletedAt] DATETIME2;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
