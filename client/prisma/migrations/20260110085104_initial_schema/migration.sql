-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "confirmed_at" TIMESTAMP(3),
    "discoverable" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "public" BOOLEAN NOT NULL DEFAULT false,
    "meta" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_update" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "update" BYTEA NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "document_update_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_user" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "write" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "document_user_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document" ADD CONSTRAINT "document_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_update" ADD CONSTRAINT "document_update_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_update" ADD CONSTRAINT "document_update_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_user" ADD CONSTRAINT "document_user_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_user" ADD CONSTRAINT "document_user_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
