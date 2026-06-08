BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[IntakeTransaction] ADD [deleteReason] NVARCHAR(1000),
[deletedAt] DATETIME2,
[deletedBy] INT,
[isDeleted] BIT NOT NULL CONSTRAINT [IntakeTransaction_isDeleted_df] DEFAULT 0;

-- AlterTable
ALTER TABLE [dbo].[LedgerSession] ADD [deleteReason] NVARCHAR(1000),
[deletedAt] DATETIME2,
[deletedBy] INT,
[isDeleted] BIT NOT NULL CONSTRAINT [LedgerSession_isDeleted_df] DEFAULT 0;

-- AlterTable
ALTER TABLE [dbo].[Party] ADD [deleteReason] NVARCHAR(1000),
[deletedAt] DATETIME2,
[deletedBy] INT,
[isDeleted] BIT NOT NULL CONSTRAINT [Party_isDeleted_df] DEFAULT 0;

-- AlterTable
ALTER TABLE [dbo].[Product] ADD [deleteReason] NVARCHAR(1000),
[deletedAt] DATETIME2,
[deletedBy] INT,
[isDeleted] BIT NOT NULL CONSTRAINT [Product_isDeleted_df] DEFAULT 0;

-- AlterTable
ALTER TABLE [dbo].[SalesTrack] ADD [deleteReason] NVARCHAR(1000),
[deletedAt] DATETIME2,
[deletedBy] INT,
[isDeleted] BIT NOT NULL CONSTRAINT [SalesTrack_isDeleted_df] DEFAULT 0;

-- AlterTable
ALTER TABLE [dbo].[SaleTransaction] ADD [deleteReason] NVARCHAR(1000),
[deletedAt] DATETIME2,
[deletedBy] INT;

-- AlterTable
ALTER TABLE [dbo].[SupplierInvoice] ADD [deleteReason] NVARCHAR(1000),
[deletedAt] DATETIME2,
[deletedBy] INT,
[isDeleted] BIT NOT NULL CONSTRAINT [SupplierInvoice_isDeleted_df] DEFAULT 0;

-- AlterTable
ALTER TABLE [dbo].[User] ADD [address] NVARCHAR(1000),
[phoneNumber] NVARCHAR(1000);

-- CreateTable
CREATE TABLE [dbo].[SystemSetting] (
    [id] INT NOT NULL IDENTITY(1,1),
    [key] NVARCHAR(1000) NOT NULL,
    [value] NVARCHAR(max) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [SystemSetting_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [SystemSetting_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [SystemSetting_key_key] UNIQUE NONCLUSTERED ([key])
);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
