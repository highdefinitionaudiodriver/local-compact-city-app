import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ProposalType, MUNICIPALITIES, getMunicipalityLabel } from "@/lib/constants";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { buttonVariants } from "@/components/ui/button";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth();
  const myMuni = session?.user?.resident_code ?? null;

  // Multi-tenant default: when a user is signed in, restrict the feed to
  // their own municipality. Visitors who are not signed in see everything
  // (the global fallback) so the landing page is never empty for first-time
  // browsers — once they authenticate the experience becomes hyper-local.
  const proposals = await prisma.proposal.findMany({
    where: {
      status: "OPEN",
      ...(myMuni ? { resident_code: myMuni } : {}),
    },
    orderBy: { created_at: "desc" },
    include: {
      votes: { select: { vote_type: true } },
      author: { select: { display_name: true } },
    },
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <section className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          {myMuni ? `${getMunicipalityLabel(myMuni)} の進行中の提案` : "進行中の提案"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {myMuni
            ? "あなたの自治体の住民提案・電子署名（請願）を表示しています。"
            : "全国の住民提案を表示しています。ログインすると、お住まいの自治体の提案のみに絞り込まれます。"}
          {" "}
          すべての投票・署名はマイナンバーカード認証済みの住民によるものです。
        </p>
      </section>

      {proposals.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            提案はまだありません。
            <Link className="ml-1 underline" href="/proposals/new">
              最初の提案を投稿する
            </Link>
            。
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
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
            const sigPct =
              isPetition && p.target_signatures > 0
                ? Math.min(100, Math.round((counts.SIGN / p.target_signatures) * 100))
                : 0;

            return (
              <li key={p.id}>
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Badge variant={isPetition ? "default" : "secondary"}>
                        {isPetition ? "正式な署名（請願）" : "まちのアイデア"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {MUNICIPALITIES[p.resident_code] ?? p.resident_code}
                      </span>
                    </div>
                    <CardTitle className="mt-2 leading-snug">
                      <Link href={`/proposals/${p.id}`} className="hover:underline">
                        {p.title}
                      </Link>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    <p className="line-clamp-3 whitespace-pre-wrap">{p.content}</p>
                  </CardContent>
                  <CardFooter className="flex flex-col items-stretch gap-3">
                    {isPetition ? (
                      <div>
                        <div className="flex items-baseline justify-between text-sm">
                          <span className="font-medium">
                            {counts.SIGN.toLocaleString()} /{" "}
                            {p.target_signatures.toLocaleString()} 筆
                          </span>
                          <span className="text-muted-foreground">{sigPct}%</span>
                        </div>
                        <Progress
                          value={sigPct}
                          className="mt-1"
                          aria-label={`目標署名数の${sigPct}パーセント達成`}
                        />
                      </div>
                    ) : (
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
                    <Link
                      href={`/proposals/${p.id}`}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      詳細を見る
                    </Link>
                  </CardFooter>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
