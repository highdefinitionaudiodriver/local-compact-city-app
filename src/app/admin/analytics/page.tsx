import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { MUNICIPALITIES, ProposalType, VoteType } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { PetitionCharts, type DailyPoint, type MuniSlice } from "./analytics-charts";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const session = await auth();
  if (!isAdmin(session)) redirect("/admin/forbidden");

  // ── Overview KPIs ──────────────────────────────────────────────────────
  const myMuni = session.user.resident_code;
  const [
    proposalCount,
    petitionCount,
    submittedCount,
    totalSignatures,
    uniqueSigners,
  ] = await Promise.all([
    prisma.proposal.count({ where: { resident_code: myMuni } }),
    prisma.proposal.count({
      where: { resident_code: myMuni, type: ProposalType.PETITION },
    }),
    prisma.proposal.count({
      where: { resident_code: myMuni, status: "SUBMITTED" },
    }),
    prisma.vote.count({
      where: { vote_type: VoteType.SIGN, proposal: { resident_code: myMuni } },
    }),
    // Unique signers across all petitions of this municipality.
    prisma.vote
      .findMany({
        where: { vote_type: VoteType.SIGN, proposal: { resident_code: myMuni } },
        select: { user_id: true },
        distinct: ["user_id"],
      })
      .then((rs) => rs.length),
  ]);

  // ── Per-petition data ──────────────────────────────────────────────────
  const petitions = await prisma.proposal.findMany({
    where: {
      type: ProposalType.PETITION,
      resident_code: myMuni,
    },
    orderBy: { created_at: "desc" },
    include: {
      votes: {
        where: { vote_type: VoteType.SIGN },
        select: { created_at: true, resident_code: true },
      },
    },
  });

  const petitionData = petitions.map((p) => {
    const sigs = p.votes;
    const totals = sigs.length;
    const targetPct = p.target_signatures > 0
      ? Math.min(100, Math.round((totals / p.target_signatures) * 100))
      : 0;

    // Daily aggregation over the last 14 days, JST.
    const daily = computeDailyTimeline(sigs.map((v) => v.created_at), 14);

    // Resident-code breakdown for the pie chart.
    const muniMap = new Map<string, number>();
    for (const v of sigs) {
      muniMap.set(v.resident_code, (muniMap.get(v.resident_code) ?? 0) + 1);
    }
    const muniSlices: MuniSlice[] = [...muniMap.entries()]
      .map(([code, count]) => ({
        code,
        label: MUNICIPALITIES[code] ?? code,
        count,
        isLocal: code === p.resident_code,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      id: p.id,
      title: p.title,
      status: p.status,
      target: p.target_signatures,
      totals,
      targetPct,
      daily,
      muniSlices,
    };
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">統計ダッシュボード</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {MUNICIPALITIES[myMuni] ?? myMuni} の住民提案・電子署名の活動量を可視化します。
          </p>
        </div>
        <Link
          href="/admin/proposals"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          ← 提案管理に戻る
        </Link>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="提案数（全種別）" value={proposalCount.toLocaleString()} />
        <Kpi label="請願数" value={petitionCount.toLocaleString()} />
        <Kpi
          label="行政受付済"
          value={submittedCount.toLocaleString()}
          hint={proposalCount > 0 ? `${Math.round((submittedCount / proposalCount) * 100)}%` : "—"}
        />
        <Kpi label="累計署名数" value={totalSignatures.toLocaleString()} suffix="筆" />
      </section>

      <p className="mt-2 text-xs text-muted-foreground">
        ユニーク署名者数（提案を跨いで重複除外）:{" "}
        <strong>{uniqueSigners.toLocaleString()}</strong> 人
      </p>

      <h2 className="mt-10 mb-4 text-lg font-semibold">請願ごとの動向</h2>

      {petitionData.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            可視化対象の請願がありません。
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-6">
          {petitionData.map((p) => (
            <li key={p.id}>
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>請願</Badge>
                    <Badge variant="outline">
                      {p.totals.toLocaleString()} / {p.target.toLocaleString()} 筆 ({p.targetPct}%)
                    </Badge>
                    <CardTitle className="text-base ml-1">
                      <Link href={`/admin/proposals/${p.id}`} className="hover:underline">
                        {p.title}
                      </Link>
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <PetitionCharts
                    daily={p.daily}
                    muniSlices={p.muniSlices}
                    homeCode={myMuni}
                    target={p.target}
                  />
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function Kpi({
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
    <div className="rounded-md border bg-card px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1">
        <span className="text-2xl font-bold">{value}</span>
        {suffix && <span className="ml-1 text-sm text-muted-foreground">{suffix}</span>}
      </p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Aggregation helper. Buckets signature timestamps by JST calendar day for
// the last `days` days (inclusive of today). Returns an array sorted by day
// with cumulative + per-day counts so the AreaChart can show the rising
// curve at a glance.
// ─────────────────────────────────────────────────────────────────────────

function computeDailyTimeline(timestamps: Date[], days: number): DailyPoint[] {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const today = new Date();
  const buckets = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    buckets.set(fmt.format(d), 0);
  }
  for (const ts of timestamps) {
    const key = fmt.format(ts);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  let cumulative = 0;
  return [...buckets.entries()].map(([date, count]) => {
    cumulative += count;
    return {
      date: date.slice(5), // MM-DD for chart label
      isoDate: date,
      daily: count,
      cumulative,
    };
  });
}
