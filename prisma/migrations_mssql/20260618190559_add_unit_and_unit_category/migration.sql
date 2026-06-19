BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[UnitCategory] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(255) NOT NULL,
    [code] NVARCHAR(255) NOT NULL,
    [isActive] BIT NOT NULL CONSTRAINT [UnitCategory_isActive_df] DEFAULT 1,
    CONSTRAINT [UnitCategory_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [UnitCategory_code_key] UNIQUE NONCLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[Unit] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(255) NOT NULL,
    [code] NVARCHAR(255) NOT NULL,
    [unitCategoryId] INT NOT NULL,
    [isBase] BIT NOT NULL CONSTRAINT [Unit_isBase_df] DEFAULT 0,
    [isCustom] BIT NOT NULL CONSTRAINT [Unit_isCustom_df] DEFAULT 0,
    [conversionRate] DECIMAL(32,16),
    [isActive] BIT NOT NULL CONSTRAINT [Unit_isActive_df] DEFAULT 1,
    CONSTRAINT [Unit_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Unit_code_key] UNIQUE NONCLUSTERED ([code])
);

-- AddForeignKey
ALTER TABLE [dbo].[Unit] ADD CONSTRAINT [Unit_unitCategoryId_fkey] FOREIGN KEY ([unitCategoryId]) REFERENCES [dbo].[UnitCategory]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
