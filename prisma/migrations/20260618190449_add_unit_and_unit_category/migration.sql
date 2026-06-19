-- CreateTable
CREATE TABLE "UnitCategory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "unitCategoryId" INTEGER NOT NULL,
    "isBase" BOOLEAN NOT NULL DEFAULT false,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "conversionRate" DECIMAL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Unit_unitCategoryId_fkey" FOREIGN KEY ("unitCategoryId") REFERENCES "UnitCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "UnitCategory_code_key" ON "UnitCategory"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_code_key" ON "Unit"("code");
