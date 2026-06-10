BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Party] ADD [source] NVARCHAR(100);

-- AlterTable
ALTER TABLE [dbo].[Product] ADD [source] NVARCHAR(100);

-- AlterTable
ALTER TABLE [dbo].[SalesTrack] ADD [type] NVARCHAR(100) NOT NULL DEFAULT 'INTAKE_SALE';

COMMIT TRAN;
