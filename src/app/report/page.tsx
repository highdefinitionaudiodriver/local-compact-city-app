import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ProposalType, MUNICIPALITIES } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function ReportIndexPage() {
  const petitions = await prisma.proposal.findMany({
    where: { type: ProposalType.PETITION },
    orderBy: { created_at: "desc" },
    include: { _count: { select: { votes: true } } },
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold">行政提出用エビデンス（請願一覧）</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        マイナンバーカード認証済み住民による電子署名の集計レポートです。
        個別の署名者情報は表示せず、集計値のみを公開します。
      </p>

      <ul className="mt-6 grid gap-3">
        {petitions.map((p) => {
          const pct =
            p.target_signatures > 0
              ? Math.min(100, Math.round((p._count.votes / p.target_signatures) * 100))
              : 0;
          return (
            <li key={p.id}>
              <Card>
                <CardHeader className="flex-row items-center justify-between gap-4">
                  <div>
                    <Badge variant="outline">
                      {MUNICIPALITIES[p.resident_code] ?? p.resident_code}
                    </Badge>
                    <CardTitle className="mt-2 text-base">
                      <Link className="hover:underline" href={`/report/${p.id}`}>
                        {p.title}
                      </Link>
                    </CardTitle>
                  </div>
                  <div className="text-right text-sm shrink-0">
                    <div className="font-semibold">
                      {p._count.votes.toLocaleString()} / {p.target_signatures.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">{pct}%</div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Progress value={pct} aria-label={`${pct}パーセント達成`} />
                </CardContent>
              </Card>
            </li>
          );
        })}
        {petitions.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              請願はまだありません。
            </CardContent>
          </Card>
        )}
      </ul>
    </main>
  );
}
