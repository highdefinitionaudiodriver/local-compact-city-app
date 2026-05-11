import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { MUNICIPALITIES, ProposalType } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { buttonVariants } from "@/components/ui/button";
import { StatusUpdater } from "../status-updater";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, { text: string; tone: string }> = {
  OPEN: { text: "受付中", tone: "bg-emerald-100 text-emerald-900" },
  CLOSED: { text: "締切", tone: "bg-zinc-200 text-zinc-800" },
  SUBMITTED: { text: "行政受付済", tone: "bg-blue-100 text-blue-900" },
};

const fmt = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function AdminProposalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!isAdmin(session)) redirect("/admin/forbidden");

  const { id } = await params;
  const proposal = await prisma.proposal.findUnique({
    where: { id },
    include: {
      author: { select: { display_name: true } },
      _count: { select: { votes: true, comments: true } },
    },
  });
  if (!proposal) notFound();
  if (proposal.resident_code !== session.user.resident_code) {
    // Don't leak existence of proposals from other municipalities.
    notFound();
  }

  const logs = await prisma.auditLog.findMany({
    where: { proposal_id: id },
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      old_status: true,
      new_status: true,
      admin_user_id: true,
      created_at: true,
    },
  });

  const isPetition = proposal.type === ProposalType.PETITION;
  const tone = statusLabel[proposal.status] ?? { text: proposal.status, tone: "" };
  const muni = MUNICIPALITIES[proposal.resident_code] ?? proposal.resident_code;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <Link
          href="/admin/proposals"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          ← 提案管理に戻る
        </Link>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/proposals/${proposal.id}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            住民向けページを見る
          </Link>
          {isPetition && (
            <>
              <a
                href={`/api/admin/proposals/${proposal.id}/export`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                CSV出力
              </a>
              <a
                href={`/api/admin/proposals/${proposal.id}/pdf`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                PDF報告書
              </a>
            </>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Badge variant={isPetition ? "default" : "secondary"}>
              {isPetition ? "請願" : "アイデア"}
            </Badge>
            <span className={`inline-flex rounded px-2 py-0.5 text-xs ${tone.tone}`}>
              {tone.text}
            </span>
            <span className="text-xs text-muted-foreground">{muni}</span>
          </div>
          <CardTitle className="mt-2">{proposal.title}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm">
          <p className="whitespace-pre-wrap text-muted-foreground">{proposal.content}</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-center">
            <Stat label="目標署名数" value={proposal.target_signatures.toLocaleString()} />
            <Stat label="集まった件数" value={proposal._count.votes.toLocaleString()} />
            <Stat label="コメント数" value={proposal._count.comments.toLocaleString()} />
            <Stat
              label="締切"
              value={proposal.deadline ? proposal.deadline.toLocaleDateString("ja-JP") : "—"}
            />
          </div>
          <Separator />
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">ステータス変更</p>
            <StatusUpdater proposalId={proposal.id} current={proposal.status} />
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            ステータス変更履歴
            <Badge variant="secondary">{logs.length}</Badge>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            すべての変更は監査ログに自動記録されます。レコードはアプリから編集・削除できません。
          </p>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="rounded-md border border-dashed bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
              ステータス変更の履歴はまだありません。
            </p>
          ) : (
            <ol className="relative ml-3 border-l border-border">
              {logs.map((log) => {
                const fromTone = statusLabel[log.old_status] ?? { text: log.old_status, tone: "" };
                const toTone = statusLabel[log.new_status] ?? { text: log.new_status, tone: "" };
                // Reveal only the first 8 chars of the staff hashed_id; the
                // full value stays in the DB for forensic lookups but is not
                // surfaced casually in the UI.
                const adminShort = log.admin_user_id.slice(0, 8);
                return (
                  <li key={log.id} className="ml-4 mb-5 last:mb-0">
                    <span
                      aria-hidden
                      className="absolute -left-1.5 mt-1.5 size-3 rounded-full border-2 border-background bg-primary"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex rounded px-2 py-0.5 text-xs ${fromTone.tone}`}>
                        {fromTone.text}
                      </span>
                      <span className="text-muted-foreground">→</span>
                      <span className={`inline-flex rounded px-2 py-0.5 text-xs ${toTone.tone}`}>
                        {toTone.text}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {fmt.format(log.created_at)} JST ・ 操作者:{" "}
                      <code className="font-mono">{adminShort}…</code>
                    </p>
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/30 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-semibold">{value}</p>
    </div>
  );
}
