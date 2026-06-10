BEGIN TRY

BEGIN TRAN;

-- DropForeignKey
ALTER TABLE [dbo].[SalesTrack] DROP CONSTRAINT [SalesTrack_productId_fkey];

-- AlterTable
ALTER TABLE [dbo].[Party] ADD [migrationId] NVARCHAR(100);

-- AlterTable
ALTER TABLE [dbo].[Product] ADD [migrationId] NVARCHAR(100);

-- AlterTable
ALTER TABLE [dbo].[SalesTrack] ADD [initialStockId] INT;

-- CreateTable
CREATE TABLE [dbo].[InitialStock] (
    [id] INT NOT NULL IDENTITY(1,1),
    [productId] INT NOT NULL,
    [quantity] DECIMAL(18,2) NOT NULL,
    [unit] NVARCHAR(50) NOT NULL CONSTRAINT [InitialStock_unit_df] DEFAULT 'KG',
    [notes] NVARCHAR(max),
    [migrationId] NVARCHAR(100),
    [userId] INT NOT NULL CONSTRAINT [InitialStock_userId_df] DEFAULT 0,
    [businessId] INT NOT NULL CONSTRAINT [InitialStock_businessId_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [InitialStock_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [InitialStock_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [InitialStock_productId_key] UNIQUE NONCLUSTERED ([productId])
);

-- CreateTable
CREATE TABLE [dbo].[PartyOpeningBalance] (
    [id] INT NOT NULL IDENTITY(1,1),
    [partyId] INT NOT NULL,
    [amount] DECIMAL(18,2) NOT NULL,
    [type] NVARCHAR(50) NOT NULL,
    [entryDate] DATETIME2 NOT NULL CONSTRAINT [PartyOpeningBalance_entryDate_df] DEFAULT CURRENT_TIMESTAMP,
    [notes] NVARCHAR(max),
    [migrationId] NVARCHAR(100),
    [userId] INT NOT NULL CONSTRAINT [PartyOpeningBalance_userId_df] DEFAULT 0,
    [businessId] INT NOT NULL CONSTRAINT [PartyOpeningBalance_businessId_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [PartyOpeningBalance_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [PartyOpeningBalance_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [PartyOpeningBalance_partyId_key] UNIQUE NONCLUSTERED ([partyId])
);

-- AddForeignKey
ALTER TABLE [dbo].[SalesTrack] ADD CONSTRAINT [SalesTrack_initialStockId_fkey] FOREIGN KEY ([initialStockId]) REFERENCES [dbo].[InitialStock]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SalesTrack] ADD CONSTRAINT [SalesTrack_productId_fkey] FOREIGN KEY ([productId]) REFERENCES [dbo].[Product]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[InitialStock] ADD CONSTRAINT [InitialStock_productId_fkey] FOREIGN KEY ([productId]) REFERENCES [dbo].[Product]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[PartyOpeningBalance] ADD CONSTRAINT [PartyOpeningBalance_partyId_fkey] FOREIGN KEY ([partyId]) REFERENCES [dbo].[Party]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
