-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "pickupLocation" TEXT NOT NULL DEFAULT 'Not specified',
ADD COLUMN     "seatsRequested" INTEGER NOT NULL DEFAULT 1;
