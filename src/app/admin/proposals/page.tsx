import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { MUNICIPALITIES, ProposalType } from "@/lib/constants";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { StatusUpdater } from "./status-updater";
import { Sparkline } from "@/components/sparkline";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, { text: string; tone: string }> = {
  OPEN: { text: "受付中", tone: "bg-emerald-100 text-emerald-900" },
  CLOSED: { text: "締切", tone: "bg-zinc-200 text-zinc-800" },
  SUBMITTED: { text: "行政受付済", tone: "bg-blue-100 text-blue-900" },
};

export default async function AdminProposalsPage() {
  const session = await auth();
  if (!isAdmin(session)) redirect("/admin/forbidden");

  // Staff can only manage their own municipality's proposals.
  const proposals = await prisma.proposal.findMany({
    where: { resident_code: session.user.resident_code },
    orderBy: [{ status: "asc" }, { created_at: "desc" }],
    include: {
      votes: { select: { vote_type: true, created_at: true } },
      author: { select: { display_name: true } },
    },
  });

  // Pre-aggregate the last-14-days daily SIGN counts for each row so the
  // <Sparkline/> client component can render directly without per-row
  // database access. Done in JST so day boundaries match the analytics page.
  const dayFmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  function buildSpark(votes: { vote_type: string; created_at: Date }[]) {
    const buckets = new Map<string, number>();
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      buckets.set(dayFmt.format(d), 0);
    }
    for (const v of votes) {
      if (v.vote_type !== "SIGN") continue;
      const k = dayFmt.format(v.created_at);
      if (buckets.has(k)) buckets.set(k, (buckets.get(k) ?? 0) + 1);
    }
    return [...buckets.entries()].map(([date, daily]) => ({
      date: date.slice(5),
      daily,
    }));
  }

  const muni = MUNICIPALITIES[session.user.resident_code] ?? session.user.resident_code;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">バックオフィス｜提案管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {muni} の管轄下にある提案を表示しています。
          ステータスは <strong>受付中 → 締切</strong>、または{" "}
          <strong>受付中 → 行政受付済</strong> に変更できます。
        </p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[110px]">種別</TableHead>
              <TableHead>タイトル</TableHead>
              <TableHead className="w-[110px]">ステータス</TableHead>
              <TableHead className="w-[140px] text-right">集計</TableHead>
              <TableHead className="w-[110px]">投稿日</TableHead>
              <TableHead className="w-[260px]">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {proposals.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-10">
                  対象提案はありません。
                </TableCell>
              </TableRow>
            )}
            {proposals.map((p) => {
              const isPetition = p.type === ProposalType.PETITION;
              const counts = p.votes.reduce(
                (acc, v) => {
                  acc[v.vote_type as keyof typeof acc] =
                    (acc[v.vote_type as keyof typeof acc] ?? 0) + 1;
                  return acc;
                },
                { FOR: 0, AGAINST: 0, SIGN: 0 } as Record<string, number>,
              );
              const tone = statusLabel[p.status] ?? { text: p.status, tone: "" };

              return (
                <TableRow key={p.id}>
                  <TableCell>
                    <Badge variant={isPetition ? "default" : "secondary"}>
                      {isPetition ? "請願" : "アイデア"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/proposals/${p.id}`}
                      className="font-medium hover:underline"
                    >
                      {p.title}
                    </Link>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      投稿者: {p.author.display_name ?? "—"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex rounded px-2 py-0.5 text-xs ${tone.tone}`}>
                      {tone.text}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {isPetition ? (
                      <div className="flex flex-col items-end gap-1">
                        <span>
                          署名 <strong>{counts.SIGN.toLocaleString()}</strong> /{" "}
                          {p.target_signatures.toLocaleString()}
                        </span>
                        <Sparkline data={buildSpark(p.votes)} />
                      </div>
                    ) : (
                      <span>
                        賛 {counts.FOR} ・ 反 {counts.AGAINST}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {p.created_at.toLocaleDateString("ja-JP")}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusUpdater proposalId={p.id} current={p.status} />
                      <Link
                        href={`/admin/proposals/${p.id}`}
                        className={buttonVariants({ variant: "ghost", size: "sm" })}
                        aria-label="この提案の詳細と履歴を表示"
                      >
                        詳細・履歴
                      </Link>
                      {isPetition && (
                        <>
                          <a
                            href={`/api/admin/proposals/${p.id}/export`}
                            className={buttonVariants({ variant: "outline", size: "sm" })}
                            aria-label="この請願の署名データをCSVでダウンロード"
                          >
                            CSV出力
                          </a>
                          <a
                            href={`/api/admin/proposals/${p.id}/pdf`}
                            className={buttonVariants({ variant: "outline", size: "sm" })}
                            aria-label="この請願の最終報告書をPDFでダウンロード"
                          >
                            PDF報告書
                          </a>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        ※ プロトタイプにつき、ステータス変更履歴の保存・通知は未実装です。
      </p>
    </main>
  );
}
