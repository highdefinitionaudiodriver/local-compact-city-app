-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proposal_id" TEXT NOT NULL,
    "admin_user_id" TEXT NOT NULL,
    "old_status" TEXT NOT NULL,
    "new_status" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "Proposal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AuditLog_proposal_id_created_at_idx" ON "AuditLog"("proposal_id", "created_at");

-- CreateIndex
CREATE INDEX "AuditLog_admin_user_id_idx" ON "AuditLog"("admin_user_id");
