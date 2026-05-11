"use server";

import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { ProposalStatus } from "@/lib/constants";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const statusSchema = z.object({
  proposalId: z.string().min(1),
  status: z.enum([
    ProposalStatus.OPEN,
    ProposalStatus.CLOSED,
    ProposalStatus.SUBMITTED,
  ]),
});

export type StatusState = { error?: string; ok?: boolean };

export async function updateProposalStatusAction(
  _prev: StatusState,
  formData: FormData,
): Promise<StatusState> {
  const session = await auth();
  if (!isAdmin(session)) {
    return { error: "この操作は自治体職員のみ実行できます。" };
  }

  const parsed = statusSchema.safeParse({
    proposalId: formData.get("proposalId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return { error: "不正な入力です。" };

  // Defense in depth: only allow staff to manage proposals belonging to their
  // own municipality. We perform the read, the validation, the update, and
  // the audit-log insert inside a single transaction so a partial failure
  // can never leave the system with a status change but no audit record.
  const adminId = session.user.id;
  const newStatus = parsed.data.status;
  const proposalId = parsed.data.proposalId;

  try {
    await prisma.$transaction(async (tx) => {
      const before = await tx.proposal.findUnique({
        where: { id: proposalId },
        select: { id: true, status: true, resident_code: true },
      });
      if (!before) throw new Error("NOT_FOUND");
      if (before.resident_code !== session.user.resident_code) {
        throw new Error("WRONG_MUNICIPALITY");
      }
      // No-op when the status doesn't actually change; we do NOT write an
      // audit log for non-changes, so the timeline stays clean.
      if (before.status === newStatus) return;

      await tx.proposal.update({
        where: { id: before.id },
        data: { status: newStatus },
      });
      await tx.auditLog.create({
        data: {
          proposal_id: before.id,
          admin_user_id: adminId,
          old_status: before.status,
          new_status: newStatus,
        },
      });
    });
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === "NOT_FOUND") return { error: "提案が見つかりません。" };
      if (e.message === "WRONG_MUNICIPALITY") {
        return { error: "他自治体の提案は変更できません。" };
      }
    }
    throw e;
  }

  revalidatePath("/admin/proposals");
  revalidatePath(`/admin/proposals/${proposalId}`);
  revalidatePath("/");
  revalidatePath(`/proposals/${proposalId}`);
  return { ok: true };
}
