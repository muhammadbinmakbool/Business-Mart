BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[User] (
    [id] INT NOT NULL IDENTITY(1,1),
    [email] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000),
    [password] NVARCHAR(255) NOT NULL,
    [role] NVARCHAR(1000) NOT NULL CONSTRAINT [User_role_df] DEFAULT 'USER',
    [isActive] BIT NOT NULL CONSTRAINT [User_isActive_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [User_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [User_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [User_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[Party] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(1000) NOT NULL,
    [phoneNumber] NVARCHAR(1000) NOT NULL,
    [address] NVARCHAR(1000),
    [notes] NVARCHAR(1000),
    [partyType] NVARCHAR(1000) NOT NULL,
    [isActive] BIT NOT NULL CONSTRAINT [Party_isActive_df] DEFAULT 1,
    [userId] INT NOT NULL CONSTRAINT [Party_userId_df] DEFAULT 0,
    [businessId] INT NOT NULL CONSTRAINT [Party_businessId_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Party_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Party_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Product] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(1000) NOT NULL,
    [category] NVARCHAR(1000) NOT NULL CONSTRAINT [Product_category_df] DEFAULT 'WEIGHT',
    [primaryUnit] NVARCHAR(1000) NOT NULL CONSTRAINT [Product_primaryUnit_df] DEFAULT 'KG',
    [unitConversion] DECIMAL(18,4),
    [quantity] DECIMAL(18,2) NOT NULL CONSTRAINT [Product_quantity_df] DEFAULT 0,
    [isActive] BIT NOT NULL CONSTRAINT [Product_isActive_df] DEFAULT 1,
    [userId] INT NOT NULL CONSTRAINT [Product_userId_df] DEFAULT 0,
    [businessId] INT NOT NULL CONSTRAINT [Product_businessId_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Product_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Product_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[IntakeTransaction] (
    [id] INT NOT NULL IDENTITY(1,1),
    [intakeNumber] NVARCHAR(1000) NOT NULL,
    [entryDate] DATETIME2 NOT NULL CONSTRAINT [IntakeTransaction_entryDate_df] DEFAULT CURRENT_TIMESTAMP,
    [partyId] INT NOT NULL,
    [productId] INT NOT NULL,
    [bagCount] INT,
    [rate] DECIMAL(18,2),
    [rateUnit] NVARCHAR(50) NOT NULL CONSTRAINT [IntakeTransaction_rateUnit_df] DEFAULT 'KG',
    [grossWeight] DECIMAL(18,2) NOT NULL,
    [unit] NVARCHAR(1000) NOT NULL CONSTRAINT [IntakeTransaction_unit_df] DEFAULT 'KG',
    [normalizedWeight] DECIMAL(18,2) NOT NULL CONSTRAINT [IntakeTransaction_normalizedWeight_df] DEFAULT 0,
    [Bardana] DECIMAL(18,2),
    [Khot] DECIMAL(18,2),
    [netWeight] DECIMAL(18,2),
    [remainingWeight] DECIMAL(18,2),
    [notes] NVARCHAR(1000),
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [IntakeTransaction_status_df] DEFAULT 'PENDING',
    [userId] INT NOT NULL CONSTRAINT [IntakeTransaction_userId_df] DEFAULT 0,
    [businessId] INT NOT NULL CONSTRAINT [IntakeTransaction_businessId_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [IntakeTransaction_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [IntakeTransaction_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [IntakeTransaction_intakeNumber_key] UNIQUE NONCLUSTERED ([intakeNumber])
);

-- CreateTable
CREATE TABLE [dbo].[IntakeAdvance] (
    [id] INT NOT NULL IDENTITY(1,1),
    [intakeTransactionId] INT,
    [partyId] INT NOT NULL,
    [amount] DECIMAL(18,2) NOT NULL,
    [notes] NVARCHAR(1000),
    [supplierInvoiceId] INT,
    [userId] INT NOT NULL CONSTRAINT [IntakeAdvance_userId_df] DEFAULT 0,
    [businessId] INT NOT NULL CONSTRAINT [IntakeAdvance_businessId_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [IntakeAdvance_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [IntakeAdvance_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[SaleTransaction] (
    [id] INT NOT NULL IDENTITY(1,1),
    [saleNumber] NVARCHAR(1000) NOT NULL,
    [entryDate] DATETIME2 NOT NULL CONSTRAINT [SaleTransaction_entryDate_df] DEFAULT CURRENT_TIMESTAMP,
    [partyId] INT NOT NULL,
    [totalWeight] DECIMAL(18,2) NOT NULL,
    [baseAmount] DECIMAL(18,2) NOT NULL,
    [totalAdjustments] DECIMAL(18,2) NOT NULL,
    [finalAmount] DECIMAL(18,2) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [SaleTransaction_status_df] DEFAULT 'PENDING',
    [paidAmount] DECIMAL(18,2) NOT NULL CONSTRAINT [SaleTransaction_paidAmount_df] DEFAULT 0,
    [paymentStatus] NVARCHAR(1000) NOT NULL CONSTRAINT [SaleTransaction_paymentStatus_df] DEFAULT 'PENDING',
    [notes] NVARCHAR(1000),
    [isDeleted] BIT NOT NULL CONSTRAINT [SaleTransaction_isDeleted_df] DEFAULT 0,
    [changeLog] NVARCHAR(max),
    [previousState] NVARCHAR(max),
    [userId] INT NOT NULL CONSTRAINT [SaleTransaction_userId_df] DEFAULT 0,
    [businessId] INT NOT NULL CONSTRAINT [SaleTransaction_businessId_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [SaleTransaction_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [SaleTransaction_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [SaleTransaction_saleNumber_key] UNIQUE NONCLUSTERED ([saleNumber])
);

-- CreateTable
CREATE TABLE [dbo].[SaleItem] (
    [id] INT NOT NULL IDENTITY(1,1),
    [saleId] INT NOT NULL,
    [productId] INT NOT NULL,
    [weight] DECIMAL(18,2) NOT NULL,
    [unit] NVARCHAR(1000) NOT NULL CONSTRAINT [SaleItem_unit_df] DEFAULT 'KG',
    [normalizedWeight] DECIMAL(18,2) NOT NULL CONSTRAINT [SaleItem_normalizedWeight_df] DEFAULT 0,
    [rate] DECIMAL(18,2) NOT NULL,
    [rateUnit] NVARCHAR(1000) NOT NULL CONSTRAINT [SaleItem_rateUnit_df] DEFAULT 'KG',
    [amount] DECIMAL(18,2) NOT NULL,
    [userId] INT NOT NULL CONSTRAINT [SaleItem_userId_df] DEFAULT 0,
    [businessId] INT NOT NULL CONSTRAINT [SaleItem_businessId_df] DEFAULT 0,
    CONSTRAINT [SaleItem_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[SalesTrack] (
    [id] INT NOT NULL IDENTITY(1,1),
    [saleTransactionId] INT,
    [saleItemId] INT,
    [intakeTransactionId] INT,
    [supplierPartyId] INT,
    [buyerPartyId] INT,
    [productId] INT,
    [quantity] DECIMAL(18,2) NOT NULL,
    [buyingRate] DECIMAL(18,2),
    [sellingRate] DECIMAL(18,2),
    [rateUnit] NVARCHAR(1000) CONSTRAINT [SalesTrack_rateUnit_df] DEFAULT 'KG',
    [netWeight] DECIMAL(18,2),
    [baseAmount] DECIMAL(18,2),
    [isBilled] BIT NOT NULL CONSTRAINT [SalesTrack_isBilled_df] DEFAULT 0,
    [isSettled] BIT NOT NULL CONSTRAINT [SalesTrack_isSettled_df] DEFAULT 0,
    [notes] NVARCHAR(1000),
    [userId] INT NOT NULL CONSTRAINT [SalesTrack_userId_df] DEFAULT 0,
    [businessId] INT NOT NULL CONSTRAINT [SalesTrack_businessId_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [SalesTrack_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [SalesTrack_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[TransactionAdjustment] (
    [id] INT NOT NULL IDENTITY(1,1),
    [saleId] INT NOT NULL,
    [adjustmentType] NVARCHAR(1000) NOT NULL,
    [method] NVARCHAR(1000) NOT NULL,
    [value] DECIMAL(18,2) NOT NULL,
    [calculatedAmount] DECIMAL(18,2) NOT NULL,
    [direction] NVARCHAR(1000) NOT NULL CONSTRAINT [TransactionAdjustment_direction_df] DEFAULT 'ADD',
    [unit] NVARCHAR(50),
    [userId] INT NOT NULL CONSTRAINT [TransactionAdjustment_userId_df] DEFAULT 0,
    [businessId] INT NOT NULL CONSTRAINT [TransactionAdjustment_businessId_df] DEFAULT 0,
    CONSTRAINT [TransactionAdjustment_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[SupplierInvoice] (
    [id] INT NOT NULL IDENTITY(1,1),
    [invoiceNumber] NVARCHAR(1000) NOT NULL,
    [partyId] INT NOT NULL,
    [entryDate] DATETIME2 NOT NULL CONSTRAINT [SupplierInvoice_entryDate_df] DEFAULT CURRENT_TIMESTAMP,
    [totalGrossValue] DECIMAL(18,2) NOT NULL,
    [totalDeductions] DECIMAL(18,2) NOT NULL,
    [totalAdvances] DECIMAL(18,2) NOT NULL,
    [finalPayableAmount] DECIMAL(18,2) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [SupplierInvoice_status_df] DEFAULT 'PENDING',
    [paidAmount] DECIMAL(18,2) NOT NULL CONSTRAINT [SupplierInvoice_paidAmount_df] DEFAULT 0,
    [paymentStatus] NVARCHAR(1000) NOT NULL CONSTRAINT [SupplierInvoice_paymentStatus_df] DEFAULT 'PENDING',
    [isOutdated] BIT NOT NULL CONSTRAINT [SupplierInvoice_isOutdated_df] DEFAULT 0,
    [version] INT NOT NULL CONSTRAINT [SupplierInvoice_version_df] DEFAULT 1,
    [lastCalculatedAt] DATETIME2 NOT NULL CONSTRAINT [SupplierInvoice_lastCalculatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [userId] INT NOT NULL CONSTRAINT [SupplierInvoice_userId_df] DEFAULT 0,
    [businessId] INT NOT NULL CONSTRAINT [SupplierInvoice_businessId_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [SupplierInvoice_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [SupplierInvoice_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [SupplierInvoice_invoiceNumber_key] UNIQUE NONCLUSTERED ([invoiceNumber])
);

-- CreateTable
CREATE TABLE [dbo].[SupplierInvoiceAdjustment] (
    [id] INT NOT NULL IDENTITY(1,1),
    [supplierInvoiceItemId] INT NOT NULL,
    [adjustmentType] NVARCHAR(1000) NOT NULL,
    [method] NVARCHAR(1000) NOT NULL,
    [value] DECIMAL(18,2) NOT NULL,
    [calculatedAmount] DECIMAL(18,2) NOT NULL,
    [direction] NVARCHAR(1000) NOT NULL CONSTRAINT [SupplierInvoiceAdjustment_direction_df] DEFAULT 'ADD',
    [unit] NVARCHAR(50),
    [userId] INT NOT NULL CONSTRAINT [SupplierInvoiceAdjustment_userId_df] DEFAULT 0,
    [businessId] INT NOT NULL CONSTRAINT [SupplierInvoiceAdjustment_businessId_df] DEFAULT 0,
    CONSTRAINT [SupplierInvoiceAdjustment_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[SupplierInvoiceItem] (
    [id] INT NOT NULL IDENTITY(1,1),
    [supplierInvoiceId] INT NOT NULL,
    [intakeTransactionId] INT NOT NULL,
    [weight] DECIMAL(18,2) NOT NULL,
    [rate] DECIMAL(18,2) NOT NULL,
    [amount] DECIMAL(18,2) NOT NULL,
    [userId] INT NOT NULL CONSTRAINT [SupplierInvoiceItem_userId_df] DEFAULT 0,
    [businessId] INT NOT NULL CONSTRAINT [SupplierInvoiceItem_businessId_df] DEFAULT 0,
    CONSTRAINT [SupplierInvoiceItem_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[LedgerSession] (
    [id] INT NOT NULL IDENTITY(1,1),
    [title] NVARCHAR(1000) NOT NULL,
    [startDate] DATETIME2 NOT NULL,
    [endDate] DATETIME2 NOT NULL,
    [supplierTotal] DECIMAL(18,2) NOT NULL,
    [buyerTotal] DECIMAL(18,2) NOT NULL,
    [difference] DECIMAL(18,2) NOT NULL,
    [supplierInvoiceCount] INT NOT NULL CONSTRAINT [LedgerSession_supplierInvoiceCount_df] DEFAULT 0,
    [buyerInvoiceCount] INT NOT NULL CONSTRAINT [LedgerSession_buyerInvoiceCount_df] DEFAULT 0,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [LedgerSession_status_df] DEFAULT 'OPEN',
    [notes] NVARCHAR(1000),
    [userId] INT NOT NULL CONSTRAINT [LedgerSession_userId_df] DEFAULT 0,
    [businessId] INT NOT NULL CONSTRAINT [LedgerSession_businessId_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [LedgerSession_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [LedgerSession_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ProductRate] (
    [id] INT NOT NULL IDENTITY(1,1),
    [productId] INT NOT NULL,
    [rate] DECIMAL(18,2) NOT NULL,
    [unit] NVARCHAR(50) NOT NULL,
    [date] DATETIME2 NOT NULL CONSTRAINT [ProductRate_date_df] DEFAULT CURRENT_TIMESTAMP,
    [source] NVARCHAR(100),
    [isDeleted] BIT NOT NULL CONSTRAINT [ProductRate_isDeleted_df] DEFAULT 0,
    [notes] NVARCHAR(max),
    [createdBy] NVARCHAR(100),
    [userId] INT NOT NULL CONSTRAINT [ProductRate_userId_df] DEFAULT 0,
    [businessId] INT NOT NULL CONSTRAINT [ProductRate_businessId_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ProductRate_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [ProductRate_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ActivityLog] (
    [id] INT NOT NULL IDENTITY(1,1),
    [entityType] NVARCHAR(100) NOT NULL,
    [entityId] INT,
    [action] NVARCHAR(100) NOT NULL,
    [description] NVARCHAR(max),
    [userId] INT NOT NULL CONSTRAINT [ActivityLog_userId_df] DEFAULT 0,
    [userName] NVARCHAR(255),
    [businessId] INT NOT NULL CONSTRAINT [ActivityLog_businessId_df] DEFAULT 0,
    [meta] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ActivityLog_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [ActivityLog_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[PartyPayment] (
    [id] INT NOT NULL IDENTITY(1,1),
    [partyId] INT NOT NULL,
    [paymentNumber] NVARCHAR(1000) NOT NULL,
    [paymentType] NVARCHAR(1000) NOT NULL,
    [paymentMethod] NVARCHAR(1000),
    [amount] DECIMAL(18,2) NOT NULL,
    [sourceType] NVARCHAR(1000) NOT NULL CONSTRAINT [PartyPayment_sourceType_df] DEFAULT 'MANUAL',
    [sourceId] INT,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [PartyPayment_status_df] DEFAULT 'ACTIVE',
    [entryDate] DATETIME2 NOT NULL CONSTRAINT [PartyPayment_entryDate_df] DEFAULT CURRENT_TIMESTAMP,
    [notes] NVARCHAR(1000),
    [userId] INT NOT NULL CONSTRAINT [PartyPayment_userId_df] DEFAULT 0,
    [businessId] INT NOT NULL CONSTRAINT [PartyPayment_businessId_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [PartyPayment_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [PartyPayment_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [PartyPayment_paymentNumber_key] UNIQUE NONCLUSTERED ([paymentNumber])
);

-- CreateTable
CREATE TABLE [dbo].[PartyPaymentAllocation] (
    [id] INT NOT NULL IDENTITY(1,1),
    [partyId] INT NOT NULL,
    [paymentId] INT NOT NULL,
    [referenceType] NVARCHAR(1000) NOT NULL,
    [referenceId] INT NOT NULL,
    [allocatedAmount] DECIMAL(18,2) NOT NULL,
    [userId] INT NOT NULL CONSTRAINT [PartyPaymentAllocation_userId_df] DEFAULT 0,
    [businessId] INT NOT NULL CONSTRAINT [PartyPaymentAllocation_businessId_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [PartyPaymentAllocation_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PartyPaymentAllocation_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ActivityLog_entityType_idx] ON [dbo].[ActivityLog]([entityType]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ActivityLog_action_idx] ON [dbo].[ActivityLog]([action]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ActivityLog_createdAt_idx] ON [dbo].[ActivityLog]([createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PartyPayment_partyId_idx] ON [dbo].[PartyPayment]([partyId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PartyPayment_paymentNumber_idx] ON [dbo].[PartyPayment]([paymentNumber]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PartyPayment_createdAt_idx] ON [dbo].[PartyPayment]([createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PartyPaymentAllocation_partyId_idx] ON [dbo].[PartyPaymentAllocation]([partyId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PartyPaymentAllocation_referenceType_referenceId_idx] ON [dbo].[PartyPaymentAllocation]([referenceType], [referenceId]);

-- AddForeignKey
ALTER TABLE [dbo].[IntakeTransaction] ADD CONSTRAINT [IntakeTransaction_partyId_fkey] FOREIGN KEY ([partyId]) REFERENCES [dbo].[Party]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[IntakeTransaction] ADD CONSTRAINT [IntakeTransaction_productId_fkey] FOREIGN KEY ([productId]) REFERENCES [dbo].[Product]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[IntakeAdvance] ADD CONSTRAINT [IntakeAdvance_intakeTransactionId_fkey] FOREIGN KEY ([intakeTransactionId]) REFERENCES [dbo].[IntakeTransaction]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[IntakeAdvance] ADD CONSTRAINT [IntakeAdvance_partyId_fkey] FOREIGN KEY ([partyId]) REFERENCES [dbo].[Party]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[IntakeAdvance] ADD CONSTRAINT [IntakeAdvance_supplierInvoiceId_fkey] FOREIGN KEY ([supplierInvoiceId]) REFERENCES [dbo].[SupplierInvoice]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SaleTransaction] ADD CONSTRAINT [SaleTransaction_partyId_fkey] FOREIGN KEY ([partyId]) REFERENCES [dbo].[Party]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SaleItem] ADD CONSTRAINT [SaleItem_saleId_fkey] FOREIGN KEY ([saleId]) REFERENCES [dbo].[SaleTransaction]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SaleItem] ADD CONSTRAINT [SaleItem_productId_fkey] FOREIGN KEY ([productId]) REFERENCES [dbo].[Product]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SalesTrack] ADD CONSTRAINT [SalesTrack_saleTransactionId_fkey] FOREIGN KEY ([saleTransactionId]) REFERENCES [dbo].[SaleTransaction]([id]) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SalesTrack] ADD CONSTRAINT [SalesTrack_saleItemId_fkey] FOREIGN KEY ([saleItemId]) REFERENCES [dbo].[SaleItem]([id]) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SalesTrack] ADD CONSTRAINT [SalesTrack_intakeTransactionId_fkey] FOREIGN KEY ([intakeTransactionId]) REFERENCES [dbo].[IntakeTransaction]([id]) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SalesTrack] ADD CONSTRAINT [SalesTrack_supplierPartyId_fkey] FOREIGN KEY ([supplierPartyId]) REFERENCES [dbo].[Party]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SalesTrack] ADD CONSTRAINT [SalesTrack_buyerPartyId_fkey] FOREIGN KEY ([buyerPartyId]) REFERENCES [dbo].[Party]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SalesTrack] ADD CONSTRAINT [SalesTrack_productId_fkey] FOREIGN KEY ([productId]) REFERENCES [dbo].[Product]([id]) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[TransactionAdjustment] ADD CONSTRAINT [TransactionAdjustment_saleId_fkey] FOREIGN KEY ([saleId]) REFERENCES [dbo].[SaleTransaction]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SupplierInvoice] ADD CONSTRAINT [SupplierInvoice_partyId_fkey] FOREIGN KEY ([partyId]) REFERENCES [dbo].[Party]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SupplierInvoiceAdjustment] ADD CONSTRAINT [SupplierInvoiceAdjustment_supplierInvoiceItemId_fkey] FOREIGN KEY ([supplierInvoiceItemId]) REFERENCES [dbo].[SupplierInvoiceItem]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SupplierInvoiceItem] ADD CONSTRAINT [SupplierInvoiceItem_supplierInvoiceId_fkey] FOREIGN KEY ([supplierInvoiceId]) REFERENCES [dbo].[SupplierInvoice]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SupplierInvoiceItem] ADD CONSTRAINT [SupplierInvoiceItem_intakeTransactionId_fkey] FOREIGN KEY ([intakeTransactionId]) REFERENCES [dbo].[IntakeTransaction]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ProductRate] ADD CONSTRAINT [ProductRate_productId_fkey] FOREIGN KEY ([productId]) REFERENCES [dbo].[Product]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[PartyPayment] ADD CONSTRAINT [PartyPayment_partyId_fkey] FOREIGN KEY ([partyId]) REFERENCES [dbo].[Party]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[PartyPaymentAllocation] ADD CONSTRAINT [PartyPaymentAllocation_partyId_fkey] FOREIGN KEY ([partyId]) REFERENCES [dbo].[Party]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[PartyPaymentAllocation] ADD CONSTRAINT [PartyPaymentAllocation_paymentId_fkey] FOREIGN KEY ([paymentId]) REFERENCES [dbo].[PartyPayment]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
