-- AlterTable
ALTER TABLE "organization" ADD COLUMN     "businessDays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5]::INTEGER[],
ADD COLUMN     "businessHoursEnd" TEXT NOT NULL DEFAULT '18:00',
ADD COLUMN     "businessHoursStart" TEXT NOT NULL DEFAULT '08:00',
ADD COLUMN     "punchRequireGeofence" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "punchRequireGeolocation" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "punchRequireQrCode" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "punchRequireSelfie" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "qrSecret" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "punchRequireGeofence" BOOLEAN,
ADD COLUMN     "punchRequireGeolocation" BOOLEAN,
ADD COLUMN     "punchRequireQrCode" BOOLEAN,
ADD COLUMN     "punchRequireSelfie" BOOLEAN;

-- CreateTable
CREATE TABLE "allowed_locations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "radiusMeters" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "allowed_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_entries" (
    "id" TEXT NOT NULL,
    "nsr" BIGINT NOT NULL,
    "userId" TEXT NOT NULL,
    "punchedAt" TIMESTAMPTZ(3) NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "accuracyMeters" DOUBLE PRECISION,
    "allowedLocationId" TEXT,
    "selfieKey" TEXT,
    "qrVerified" BOOLEAN NOT NULL DEFAULT false,
    "outsideBusinessHours" BOOLEAN NOT NULL DEFAULT false,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "time_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nsr_counter" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "value" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "nsr_counter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "time_entries_nsr_key" ON "time_entries"("nsr");

-- CreateIndex
CREATE INDEX "time_entries_userId_punchedAt_idx" ON "time_entries"("userId", "punchedAt");

-- CreateIndex
CREATE INDEX "time_entries_punchedAt_idx" ON "time_entries"("punchedAt");

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_allowedLocationId_fkey" FOREIGN KEY ("allowedLocationId") REFERENCES "allowed_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
