-- CreateEnum
CREATE TYPE "CalendarProvider" AS ENUM ('GOOGLE', 'ICS');

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Airport" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "iataCode" TEXT NOT NULL,
    "label" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Airport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Destination" (
    "id" TEXT NOT NULL,
    "iataCode" TEXT NOT NULL,
    "cityName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Destination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarConnection" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "provider" "CalendarProvider" NOT NULL,
    "label" TEXT,
    "googleRefreshTokenEnc" TEXT,
    "googleCalendarId" TEXT,
    "icsUrl" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "lastSyncStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalendarConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusyBlock" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "calendarConnectionId" TEXT NOT NULL,
    "externalEventId" TEXT NOT NULL,
    "title" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "isAllDay" BOOLEAN NOT NULL DEFAULT false,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusyBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilityWindow" (
    "id" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "weekdayCount" INTEGER NOT NULL,
    "weekendOnly" BOOLEAN NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AvailabilityWindow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PtoBalance" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "currentDays" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PtoBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PtoAdjustment" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "deltaDays" DECIMAL(65,30) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PtoAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlightSearch" (
    "id" TEXT NOT NULL,
    "availabilityWindowId" TEXT NOT NULL,
    "originIataCode" TEXT NOT NULL,
    "destinationIataCode" TEXT NOT NULL,
    "departDate" TIMESTAMP(3) NOT NULL,
    "returnDate" TIMESTAMP(3),
    "provider" TEXT NOT NULL DEFAULT 'amadeus',
    "rawResponse" JSONB NOT NULL,
    "cheapestPriceCents" INTEGER,
    "currency" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlightSearch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Airport_personId_idx" ON "Airport"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "Airport_personId_iataCode_key" ON "Airport"("personId", "iataCode");

-- CreateIndex
CREATE UNIQUE INDEX "Destination_iataCode_key" ON "Destination"("iataCode");

-- CreateIndex
CREATE INDEX "CalendarConnection_personId_idx" ON "CalendarConnection"("personId");

-- CreateIndex
CREATE INDEX "BusyBlock_personId_startsAt_endsAt_idx" ON "BusyBlock"("personId", "startsAt", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "BusyBlock_calendarConnectionId_externalEventId_key" ON "BusyBlock"("calendarConnectionId", "externalEventId");

-- CreateIndex
CREATE INDEX "AvailabilityWindow_startsAt_endsAt_idx" ON "AvailabilityWindow"("startsAt", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "PtoBalance_personId_key" ON "PtoBalance"("personId");

-- CreateIndex
CREATE INDEX "PtoAdjustment_personId_idx" ON "PtoAdjustment"("personId");

-- CreateIndex
CREATE INDEX "FlightSearch_availabilityWindowId_idx" ON "FlightSearch"("availabilityWindowId");

-- CreateIndex
CREATE INDEX "FlightSearch_originIataCode_destinationIataCode_departDate_idx" ON "FlightSearch"("originIataCode", "destinationIataCode", "departDate");

-- AddForeignKey
ALTER TABLE "Airport" ADD CONSTRAINT "Airport_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarConnection" ADD CONSTRAINT "CalendarConnection_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusyBlock" ADD CONSTRAINT "BusyBlock_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusyBlock" ADD CONSTRAINT "BusyBlock_calendarConnectionId_fkey" FOREIGN KEY ("calendarConnectionId") REFERENCES "CalendarConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PtoBalance" ADD CONSTRAINT "PtoBalance_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PtoAdjustment" ADD CONSTRAINT "PtoAdjustment_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlightSearch" ADD CONSTRAINT "FlightSearch_availabilityWindowId_fkey" FOREIGN KEY ("availabilityWindowId") REFERENCES "AvailabilityWindow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
