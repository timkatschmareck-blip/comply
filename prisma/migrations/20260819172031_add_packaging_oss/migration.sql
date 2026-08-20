-- CreateTable
CREATE TABLE "PackagingRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "paper_g" INTEGER NOT NULL DEFAULT 50,
    "plastic_g" INTEGER NOT NULL DEFAULT 10,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "OrderCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "netRevenue" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL,
    "materialPaper" INTEGER NOT NULL DEFAULT 0,
    "materialPlastic" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "ShopComplianceSettings" (
    "shop" TEXT NOT NULL PRIMARY KEY,
    "defaultPaper_g" INTEGER NOT NULL DEFAULT 50,
    "defaultPlastic_g" INTEGER NOT NULL DEFAULT 10,
    "lucidId" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "PackagingRule_shop_productId_key" ON "PackagingRule"("shop", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderCache_orderId_key" ON "OrderCache"("orderId");
