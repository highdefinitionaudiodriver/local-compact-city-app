"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ProposalType, VoteType } from "@/lib/constants";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@prisma/client";

// ────────────────────────────────────────────────────────────────────────────
// Create proposal
// ────────────────────────────────────────────────────────────────────────────

const createSchema = z.object({
  title: z.string().min(4, "タイトルは4文字以上で入力してください").max(120),
  content: z.string().min(20, "本文は20文字以上で記述してください").max(5000),
  type: z.enum([ProposalType.IDEA, ProposalType.PETITION]),
  target_signatures: z.coerce.number().int().min(1).max(1000000).optional(),
  deadline: z.string().optional(),
});

export type CreateState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function createProposalAction(
  _prev: CreateState,
  formData: FormData,
): Promise<CreateState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "ログインが必要です。" };

  const parsed = createSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
    type: formData.get("type"),
    target_signatures: formData.get("target_signatures") || undefined,
    deadline: formData.get("deadline") || undefined,
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  const isPetition = data.type === ProposalType.PETITION;

  const created = await prisma.proposal.create({
    data: {
      title: data.title,
      content: data.content,
      type: data.type,
      target_signatures: isPetition ? data.target_signatures ?? 100 : 0,
      deadline: data.deadline ? new Date(data.deadline) : null,
      resident_code: session.user.resident_code,
      author_id: session.user.id,
    },
  });

  revalidatePath("/");
  redirect(`/proposals/${created.id}`);
}

// ────────────────────────────────────────────────────────────────────────────
// Vote / sign
// ────────────────────────────────────────────────────────────────────────────

const voteSchema = z.object({
  proposalId: z.string().min(1),
  voteType: z.enum([VoteType.FOR, VoteType.AGAINST, VoteType.SIGN]),
  // PETITION only: must equal "1" to confirm the legal-style attestation.
  attest: z.string().optional(),
});

export type VoteState = { error?: string; ok?: boolean };

export async function castVoteAction(
  _prev: VoteState,
  formData: FormData,
): Promise<VoteState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "ログインが必要です。" };

  const parsed = voteSchema.safeParse({
    proposalId: formData.get("proposalId"),
    voteType: formData.get("voteType"),
    attest: formData.get("attest") ?? undefined,
  });
  if (!parsed.success) return { error: "不正な入力です。" };

  const { proposalId, voteType, attest } = parsed.data;

  const proposal = await prisma.proposal.findUnique({ where: { id: proposalId } });
  if (!proposal) return { error: "提案が見つかりません。" };
  if (proposal.status !== "OPEN") return { error: "この提案は受付終了です。" };

  // ─── Multi-tenant scope check ────────────────────────────────────────
  // A petition (or idea) can only be acted on by residents of the same
  // municipality. We re-verify here even though the UI usually filters out
  // cross-municipality proposals, because the proposal id is the only
  // input from the client and could otherwise be spoofed.
  if (proposal.resident_code !== session.user.resident_code) {
    return {
      error:
        "他自治体の提案には署名・投票できません。お住まいの自治体の提案のみご参加いただけます。",
    };
  }

  // Type/vote consistency.
  if (proposal.type === ProposalType.IDEA && voteType === VoteType.SIGN) {
    return { error: "アイデアには「署名」ではなく賛成/反対を選択してください。" };
  }
  if (proposal.type === ProposalType.PETITION && voteType !== VoteType.SIGN) {
    return { error: "正式な署名提案には「署名」のみ可能です。" };
  }
  // The weighted attestation gate for petitions.
  if (proposal.type === ProposalType.PETITION && attest !== "1") {
    return { error: "署名にあたっては住民である旨の確認チェックが必要です。" };
  }
  if (proposal.deadline && proposal.deadline.getTime() < Date.now()) {
    return { error: "締切を過ぎているため受付できません。" };
  }

  try {
    await prisma.vote.create({
      data: {
        proposal_id: proposalId,
        user_id: session.user.id,
        vote_type: voteType,
        resident_code: session.user.resident_code,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "この提案には既に投票/署名済みです。1人につき1回のみ可能です。" };
    }
    throw e;
  }

  revalidatePath(`/proposals/${proposalId}`);
  revalidatePath("/");
  return { ok: true };
}

// ────────────────────────────────────────────────────────────────────────────
// Post comment
// ────────────────────────────────────────────────────────────────────────────

const commentSchema = z.object({
  proposalId: z.string().min(1),
  text: z
    .string()
    .transform((s) => s.trim())
    .pipe(
      z
        .string()
        .min(1, "コメントを入力してください")
        .max(400, "コメントは400文字以内で入力してください"),
    ),
});

export type CommentState = { error?: string; ok?: boolean };

export async function postCommentAction(
  _prev: CommentState,
  formData: FormData,
): Promise<CommentState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "ログインが必要です。" };

  const parsed = commentSchema.safeParse({
    proposalId: formData.get("proposalId"),
    text: formData.get("text"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "不正な入力です。" };
  }

  const proposal = await prisma.proposal.findUnique({
    where: { id: parsed.data.proposalId },
    select: { id: true, status: true },
  });
  if (!proposal) return { error: "提案が見つかりません。" };
  if (proposal.status === "CLOSED") {
    return { error: "受付終了の提案にはコメントできません。" };
  }

  await prisma.comment.create({
    data: {
      proposal_id: parsed.data.proposalId,
      user_id: session.user.id,
      text: parsed.data.text,
    },
  });

  revalidatePath(`/proposals/${parsed.data.proposalId}`);
  return { ok: true };
}
