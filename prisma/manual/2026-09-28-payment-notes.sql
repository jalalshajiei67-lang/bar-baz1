-- Payment log with notes, for the finance page's note box.
--
-- Additive only: one new table, no existing rows touched. Run against the
-- production DATABASE_URL before (or with) the deploy that adds `Payment`
-- to schema.prisma, otherwise /finance fails with P2021.
--
-- Not `prisma db push`, for the same DailyPrice reason as
-- 2026-09-14-fleet-and-finance.sql.

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Payment_customerId_createdAt_idx" ON "Payment"("customerId", "createdAt");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
