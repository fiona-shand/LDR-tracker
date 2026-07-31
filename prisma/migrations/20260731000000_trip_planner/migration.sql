-- AlterTable
ALTER TABLE "Destination" ADD COLUMN     "interests" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL,
    "externalEventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "destinationIataCode" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Preferences" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cadenceMinWeeks" INTEGER NOT NULL DEFAULT 5,
    "cadenceMaxWeeks" INTEGER NOT NULL DEFAULT 6,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Trip_externalEventId_key" ON "Trip"("externalEventId");

-- CreateIndex
CREATE INDEX "Trip_startsAt_idx" ON "Trip"("startsAt");
