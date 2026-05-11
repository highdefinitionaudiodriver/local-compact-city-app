import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MUNICIPALITIES, ProposalType } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { PrintClient } from "./print-client";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const proposal = await prisma.proposal.findUnique({
    where: { id },
    include: {
      votes: {
        select: { resident_code: true, created_at: true, user_id: true },
      },
      _count: { select: { votes: true } },
    },
  });
  if (!proposal || proposal.type !== ProposalType.PETITION) notFound();

  const session = await auth();
  const admin = isAdmin(session);

  const total = proposal.votes.length;
  const targetMuni = proposal.resident_code;

  // Count signers by current verified status. Because every vote is recorded
  // only after JPKI authentication, all votes are "verified" by definition;
  // we surface this as 100% but compute it explicitly so the field stays
  // honest if the policy ever loosens.
  const verifiedUserIds = new Set(
    (
      await prisma.user.findMany({
        where: { id: { in: proposal.votes.map((v) => v.user_id) }, is_verified: true },
        select: { id: true },
      })
    ).map((u) => u.id),
  );
  const verifiedCount = proposal.votes.filter((v) => verifiedUserIds.has(v.user_id)).length;
  const verifiedPct = total > 0 ? Math.round((verifiedCount / total) * 100) : 0;

  const localSigners = proposal.votes.filter((v) => v.resident_code === targetMuni).length;
  const localPct = total > 0 ? Math.round((localSigners / total) * 100) : 0;

  const targetPct =
    proposal.target_signatures > 0
      ? Math.min(100, Math.round((total / proposal.target_signatures) * 100))
      : 0;

  // Signatures per day timeline.
  const byDay = new Map<string, number>();
  for (const v of proposal.votes) {
    const key = v.created_at.toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) ?? 0) + 1);
  }
  const timeline = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b));

  // Cross-municipality breakdown.
  const muniBreakdown = new Map<string, number>();
  for (const v of proposal.votes) {
    muniBreakdown.set(v.resident_code, (muniBreakdown.get(v.resident_code) ?? 0) + 1);
  }
  const muniRows = [...muniBreakdown.entries()].sort(([, a], [, b]) => b - a);

  const firstSig = proposal.votes.length > 0
    ? proposal.votes.reduce((min, v) => (v.created_at < min ? v.created_at : min), proposal.votes[0].created_at)
    : null;
  const lastSig = proposal.votes.length > 0
    ? proposal.votes.reduce((max, v) => (v.created_at > max ? v.created_at : max), proposal.votes[0].created_at)
    : null;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 print:max-w-none print:py-0">
      <header className="border-b pb-4 mb-6 print:mb-4">
        <p className="text-xs text-muted-foreground">
          {MUNICIPALITIES[targetMuni] ?? targetMuni} 宛 ・ 電子署名エビデンス
        </p>
        <h1 className="text-2xl font-bold mt-1">{proposal.title}</h1>
        <p className="mt-2 text-sm whitespace-pre-wrap text-muted-foreground">
          {proposal.content}
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <Badge variant="outline">提案ID: {proposal.id}</Badge>
          <Badge variant="outline">
            投稿日: {proposal.created_at.toLocaleDateString("ja-JP")}
          </Badge>
          {proposal.deadline && (
            <Badge variant="outline">
              締切: {proposal.deadline.toLocaleDateString("ja-JP")}
            </Badge>
          )}
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 print:grid-cols-2">
        <Stat label="総署名数" value={total.toLocaleString()} suffix="筆" />
        <Stat label="目標達成率" value={`${targetPct}%`} hint={`目標 ${proposal.target_signatures.toLocaleString()} 筆`} />
        <Stat label="認証済み住民率" value={`${verifiedPct}%`} hint={`${verifiedCount} / ${total}`} />
        <Stat label={`地元住民率（${MUNICIPALITIES[targetMuni] ?? targetMuni}）`} value={`${localPct}%`} hint={`${localSigners} / ${total}`} />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">目標達成状況</CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={targetPct} aria-label={`${targetPct}パーセント達成`} />
          <p className="mt-2 text-sm">
            {total.toLocaleString()} / {proposal.target_signatures.toLocaleString()} 筆 ・ {targetPct}%
          </p>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">自治体別内訳</CardTitle>
        </CardHeader>
        <CardContent>
          {muniRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">署名はまだありません。</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-1">自治体</th>
                  <th className="py-1 text-right">署名数</th>
                  <th className="py-1 text-right">割合</th>
                </tr>
              </thead>
              <tbody>
                {muniRows.map(([code, n]) => (
                  <tr key={code} className="border-t">
                    <td className="py-1">
                      {MUNICIPALITIES[code] ?? code}
                      {code === targetMuni && (
                        <span className="ml-2 text-xs text-emerald-700">（地元）</span>
                      )}
                    </td>
                    <td className="py-1 text-right">{n.toLocaleString()}</td>
                    <td className="py-1 text-right">
                      {total > 0 ? Math.round((n / total) * 100) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">日別署名数</CardTitle>
        </CardHeader>
        <CardContent>
          {timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground">署名はまだありません。</p>
          ) : (
            <ul className="text-sm">
              {timeline.map(([day, n]) => (
                <li key={day} className="flex justify-between border-t py-1">
                  <span>{day}</span>
                  <span className="font-medium">{n.toLocaleString()} 筆</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Separator className="my-8" />

      <section className="text-xs text-muted-foreground">
        <h2 className="font-semibold text-foreground mb-2">エビデンスとしての性質</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>各署名は、マイナンバーカードの署名用電子証明書による認証を経て記録されています。</li>
          <li>個人特定可能な情報（氏名・住所・マイナンバー・証明書シリアル）は本レポートに含まれません。</li>
          <li>同一人物による重複署名はデータベースの一意制約により防止されています。</li>
          <li>初回署名: {firstSig ? firstSig.toLocaleString("ja-JP") : "—"}</li>
          <li>最終署名: {lastSig ? lastSig.toLocaleString("ja-JP") : "—"}</li>
          <li>レポート出力日時: {new Date().toLocaleString("ja-JP")}</li>
        </ul>
      </section>

      <div className="mt-6 flex gap-2 print:hidden">
        <PrintClient />
        {admin && (
          <>
            <a
              href={`/api/admin/proposals/${proposal.id}/export`}
              className={buttonVariants({ variant: "outline" })}
              aria-label="この請願の署名データをCSVでダウンロード"
            >
              🗂 署名データをCSVで取得
            </a>
            <a
              href={`/api/admin/proposals/${proposal.id}/pdf`}
              className={buttonVariants({ variant: "outline" })}
              aria-label="この請願の最終報告書をPDFでダウンロード"
            >
              📄 最終報告書をPDFで生成
            </a>
          </>
        )}
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  suffix,
  hint,
}: {
  label: string;
  value: string;
  suffix?: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1">
        <span className="text-2xl font-bold">{value}</span>
        {suffix && <span className="ml-1 text-sm text-muted-foreground">{suffix}</span>}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
