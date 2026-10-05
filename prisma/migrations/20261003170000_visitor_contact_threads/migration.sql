-- Contact threads can come from a visitor without an account.
ALTER TABLE "conversations" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "conversations" ADD COLUMN "visitorName" TEXT;
ALTER TABLE "conversations" ADD COLUMN "visitorEmail" TEXT;

-- A visitor message has no user row to point at.
ALTER TABLE "messages" ALTER COLUMN "senderId" DROP NOT NULL;

-- Optional relations must clear the reference instead of deleting the thread.
ALTER TABLE "conversations" DROP CONSTRAINT "conversations_userId_fkey";
ALTER TABLE "conversations"
  ADD CONSTRAINT "conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "messages" DROP CONSTRAINT "messages_senderId_fkey";
ALTER TABLE "messages"
  ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "conversations_visitorEmail_lastMessageAt_idx" ON "conversations" ("visitorEmail", "lastMessageAt");
