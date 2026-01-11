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
CREATE TABLE "screen" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "screen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "screen_slug_key" ON "screen"("slug");

-- AddForeignKey
ALTER TABLE "screen" ADD CONSTRAINT "screen_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
