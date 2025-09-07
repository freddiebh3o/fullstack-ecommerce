/*
  Warnings:

  - A unique constraint covering the columns `[tenantId,slug]` on the table `Brand` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenantId,slug]` on the table `Category` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenantId,slug]` on the table `Product` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Brand_tenantId_slug_key" ON "public"."Brand"("tenantId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Category_tenantId_slug_key" ON "public"."Category"("tenantId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Product_tenantId_slug_key" ON "public"."Product"("tenantId", "slug");
