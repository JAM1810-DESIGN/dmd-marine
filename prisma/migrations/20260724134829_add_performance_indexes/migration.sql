-- CreateIndex
CREATE INDEX "expenses_vendorId_idx" ON "expenses"("vendorId");

-- CreateIndex
CREATE INDEX "expenses_branchId_idx" ON "expenses"("branchId");

-- CreateIndex
CREATE INDEX "invoices_customerId_idx" ON "invoices"("customerId");

-- CreateIndex
CREATE INDEX "invoices_branchId_idx" ON "invoices"("branchId");
