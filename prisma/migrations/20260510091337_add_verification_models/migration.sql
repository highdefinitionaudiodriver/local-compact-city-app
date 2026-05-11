-- CreateTable
CREATE TABLE "IssuanceRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "proposal_id" TEXT NOT NULL,
    "issuer_user_id" TEXT NOT NULL,
    "hmac" TEXT NOT NULL,
    "payload_json" TEXT NOT NULL,
    "issued_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "VerificationLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "verifier_user_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "hmac" TEXT,
    "matched_issuance" TEXT,
    "file_name" TEXT,
    "file_size" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "IssuanceRecord_hmac_key" ON "IssuanceRecord"("hmac");

-- CreateIndex
CREATE INDEX "IssuanceRecord_proposal_id_issued_at_idx" ON "IssuanceRecord"("proposal_id", "issued_at");

-- CreateIndex
CREATE INDEX "IssuanceRecord_issuer_user_id_idx" ON "IssuanceRecord"("issuer_user_id");

-- CreateIndex
CREATE INDEX "VerificationLog_verifier_user_id_created_at_idx" ON "VerificationLog"("verifier_user_id", "created_at");

-- CreateIndex
CREATE INDEX "VerificationLog_result_idx" ON "VerificationLog"("result");
