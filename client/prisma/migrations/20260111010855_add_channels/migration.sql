/*
  Warnings:

  - You are about to drop the column `public` on the `document` table. All the data in the column will be lost.
  - You are about to drop the column `write` on the `document_user` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "document" DROP COLUMN "public",
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "document_user" DROP COLUMN "write",
ADD COLUMN     "canWrite" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "channel" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "event_document_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "channel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "channel_slug_key" ON "channel"("slug");

-- AddForeignKey
ALTER TABLE "channel" ADD CONSTRAINT "channel_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel" ADD CONSTRAINT "channel_event_document_id_fkey" FOREIGN KEY ("event_document_id") REFERENCES "document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
