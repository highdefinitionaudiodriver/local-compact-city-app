import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export default function AdminForbiddenPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>このページは自治体職員専用です</CardTitle>
          <CardDescription>
            管理画面（バックオフィス機能）にアクセスする権限がありません。
            自治体職員アカウントでログインしてください。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Link href="/login" className={buttonVariants({ size: "sm" })}>
            ログイン画面へ
          </Link>
          <Link href="/" className={buttonVariants({ variant: "outline", size: "sm" })}>
            トップへ戻る
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
