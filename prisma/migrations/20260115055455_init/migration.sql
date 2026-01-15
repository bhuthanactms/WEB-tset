-- CreateTable
CREATE TABLE "customer_data" (
    "id" SERIAL NOT NULL,
    "customer_code" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "saved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_updated" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_history" (
    "id" SERIAL NOT NULL,
    "customer_code" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "saved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_data_customer_code_key" ON "customer_data"("customer_code");

-- CreateIndex
CREATE INDEX "idx_customer_code" ON "customer_data"("customer_code");

-- CreateIndex
CREATE INDEX "idx_last_updated" ON "customer_data"("last_updated" DESC);

-- CreateIndex
CREATE INDEX "idx_history_customer_code" ON "customer_history"("customer_code");

-- CreateIndex
CREATE INDEX "idx_history_saved_at" ON "customer_history"("saved_at" DESC);
