import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProposalType, MUNICIPALITIES } from "@/lib/constants";
import { auth } from "@/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { IdeaVoteForm, PetitionSignForm } from "./vote-forms";
import { buttonVariants } from "@/components/ui/button";
import { CommentForm } from "./comment-form";
import { CommentList } from "./comment-list";

export const dynamic = "force-dynamic";

export default async function ProposalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const proposal = await prisma.proposal.findUnique({
    where: { id },
    include: {
      author: { select: { display_name: true } },
      votes: { select: { vote_type: true, user_id: true } },
    },
  });
  if (!proposal) notFound();

  const comments = await prisma.comment.findMany({
    where: { proposal_id: id },
    orderBy: { created_at: "desc" },
    select: { id: true, text: true, created_at: true },
  });

  const session = await auth();
  const myUserId = session?.user?.id;
  const isPetition = proposal.type === ProposalType.PETITION;

  const counts = proposal.votes.reduce(
    (acc, v) => {
      acc[v.vote_type as keyof typeof acc] = (acc[v.vote_type as keyof typeof acc] ?? 0) + 1;
      return acc;
    },
    { FOR: 0, AGAINST: 0, SIGN: 0 } as Record<string, number>,
  );
  const sigPct =
    isPetition && proposal.target_signatures > 0
      ? Math.min(100, Math.round((counts.SIGN / proposal.target_signatures) * 100))
      : 0;
  const alreadyVoted = !!myUserId && proposal.votes.some((v) => v.user_id === myUserId);
  const expired = !!proposal.deadline && proposal.deadline.getTime() < Date.now();

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-2 flex items-center gap-2">
        <Badge variant={isPetition ? "default" : "secondary"}>
          {isPetition ? "正式な署名（請願）" : "まちのアイデア"}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {MUNICIPALITIES[proposal.resident_code] ?? proposal.resident_code} ・
          投稿者: {proposal.author.display_name ?? "（匿名）"}
        </span>
      </div>
      <h1 className="text-2xl font-bold leading-snug">{proposal.title}</h1>

      <Card className="mt-6">
        <CardContent className="pt-6 whitespace-pre-wrap text-sm leading-7">
          {proposal.content}
        </CardContent>
      </Card>

      <Separator className="my-8" />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {isPetition ? "電子署名で意思表示する" : "賛否を表明する"}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5">
          {isPetition && (
            <div>
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium">
                  {counts.SIGN.toLocaleString()} / {proposal.target_signatures.toLocaleString()} 筆
                </span>
                <span className="text-muted-foreground">{sigPct}% 達成</span>
              </div>
              <Progress
                value={sigPct}
                className="mt-2"
                aria-label={`目標署名数の${sigPct}パーセント達成`}
              />
              {proposal.deadline && (
                <p className="mt-2 text-xs text-muted-foreground">
                  締切: {proposal.deadline.toLocaleDateString("ja-JP")}
                  {expired ? "（受付終了）" : ""}
                </p>
              )}
            </div>
          )}
          {!isPetition && (
            <div className="text-sm">
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                賛成 {counts.FOR}
              </span>
              <span className="mx-2 text-muted-foreground">·</span>
              <span className="text-rose-600 dark:text-rose-400 font-medium">
                反対 {counts.AGAINST}
              </span>
            </div>
          )}

          {!session?.user ? (
            <div className="rounded-md border bg-muted/40 p-4 text-sm">
              投票・署名にはマイナンバーカード認証が必要です。
              <Link
                href="/login"
                className={buttonVariants({ size: "sm" }) + " ml-3"}
              >
                マイナで認証
              </Link>
            </div>
          ) : alreadyVoted ? (
            <div className="rounded-md border bg-emerald-50 dark:bg-emerald-950/30 p-4 text-sm">
              ✓ あなたの意思は記録されています。1人につき1回のみ受け付けています。
            </div>
          ) : expired ? (
            <div className="rounded-md border bg-muted p-4 text-sm">
              この提案は締切を過ぎています。
            </div>
          ) : isPetition ? (
            <PetitionSignForm proposalId={proposal.id} />
          ) : (
            <IdeaVoteForm proposalId={proposal.id} />
          )}
        </CardContent>
      </Card>

      <Separator className="my-8" />

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <span>みんなの声</span>
            <Badge variant="secondary" aria-label={`${comments.length}件のコメント`}>
              {comments.length}
            </Badge>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            コメントは認証済み住民として匿名で表示されます。建設的な議論を心がけましょう。
          </p>
        </CardHeader>
        <CardContent className="grid gap-5">
          {session?.user ? (
            <CommentForm proposalId={proposal.id} />
          ) : (
            <div className="rounded-md border bg-muted/40 p-4 text-sm">
              コメントの投稿にはマイナンバーカード認証が必要です。
              <Link
                href="/login"
                className={buttonVariants({ size: "sm" }) + " ml-3"}
              >
                ログインして発言する
              </Link>
            </div>
          )}
          <CommentList comments={comments} />
        </CardContent>
      </Card>
    </main>
  );
}
