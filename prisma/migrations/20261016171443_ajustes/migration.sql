-- CreateEnum
CREATE TYPE "AdjustmentType" AS ENUM ('INCLUSION', 'CORRECTION', 'ABSENCE');

-- CreateEnum
CREATE TYPE "AdjustmentStatus" AS ENUM ('PENDING_MANAGER', 'PENDING_HR', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReviewStep" AS ENUM ('MANAGER', 'HR');

-- CreateEnum
CREATE TYPE "ReviewDecision" AS ENUM ('APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "organization" ADD COLUMN     "adjustmentRequireAttachment" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "adjustmentRequireJustification" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "adjustment_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "AdjustmentType" NOT NULL,
    "status" "AdjustmentStatus" NOT NULL,
    "date" TEXT NOT NULL,
    "endDate" TEXT,
    "requestedAt" TIMESTAMPTZ(3),
    "timeEntryId" TEXT,
    "absenceStart" TEXT,
    "absenceEnd" TEXT,
    "justification" TEXT,
    "attachmentKey" TEXT,
    "attachmentName" TEXT,
    "attachmentType" TEXT,
    "previousRequestId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "adjustment_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adjustment_reviews" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "step" "ReviewStep" NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "decision" "ReviewDecision" NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adjustment_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "href" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "adjustment_requests_userId_date_idx" ON "adjustment_requests"("userId", "date");

-- CreateIndex
CREATE INDEX "adjustment_requests_status_idx" ON "adjustment_requests"("status");

-- CreateIndex
CREATE INDEX "adjustment_reviews_requestId_idx" ON "adjustment_reviews"("requestId");

-- CreateIndex
CREATE INDEX "notifications_userId_readAt_idx" ON "notifications"("userId", "readAt");

-- AddForeignKey
ALTER TABLE "adjustment_requests" ADD CONSTRAINT "adjustment_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adjustment_requests" ADD CONSTRAINT "adjustment_requests_timeEntryId_fkey" FOREIGN KEY ("timeEntryId") REFERENCES "time_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adjustment_requests" ADD CONSTRAINT "adjustment_requests_previousRequestId_fkey" FOREIGN KEY ("previousRequestId") REFERENCES "adjustment_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adjustment_reviews" ADD CONSTRAINT "adjustment_reviews_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "adjustment_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adjustment_reviews" ADD CONSTRAINT "adjustment_reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
