import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { VerifyForm } from "./verify-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const fmt = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function AdminVerifyPage() {
  const session = await auth();
  if (!isAdmin(session)) redirect("/admin/forbidden");

  // Show the most recent 10 verification attempts so auditors can see at a
  // glance who has been checking which files.
  const recent = await prisma.verificationLog.findMany({
    orderBy: { created_at: "desc" },
    take: 10,
  });

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">原本性検証</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            本システムが発行した CSV / PDF が改ざんされていないかを確認します。
            検証はサーバ側で HMAC-SHA256 を再計算して行われます。
          </p>
        </div>
        <Link
          href="/admin/proposals"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          管理画面へ戻る
        </Link>
      </div>

      <VerifyForm />

      <Card className="mt-10">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            最近の検証履歴
            <Badge variant="secondary">{recent.length}</Badge>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            検証実行は監査ログに記録されます。
          </p>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="rounded-md border border-dashed bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
              検証履歴はまだありません。
            </p>
          ) : (
            <ul className="grid gap-2 text-sm">
              {recent.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center gap-2 rounded-md border bg-card px-3 py-2"
                >
                  <ResultBadge result={r.result} />
                  <Badge variant="outline">{r.kind}</Badge>
                  <span className="font-mono text-xs">
                    {r.file_name ?? "(unknown file)"}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {fmt.format(r.created_at)} JST ／ 操作者:{" "}
                    <code className="font-mono">{r.verifier_user_id.slice(0, 8)}…</code>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function ResultBadge({ result }: { result: string }) {
  if (result === "OK") {
    return <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-900">原本一致</span>;
  }
  if (result === "TAMPERED") {
    return <span className="rounded bg-rose-100 px-2 py-0.5 text-xs text-rose-900">改ざん検出</span>;
  }
  return <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-900">判定不能</span>;
}
