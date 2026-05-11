import Link from "next/link";
import { auth } from "@/auth";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getMunicipalityLabel, PRODUCT_NAME } from "@/lib/constants";
import { logoutAction } from "@/app/login/actions";
import { isAdmin } from "@/lib/admin";

export async function SiteHeader() {
  const session = await auth();
  const admin = isAdmin(session);

  // Multi-tenant header: while a user is signed in, the brand reflects
  // *their* municipality. Logged-out visitors see the generic product name
  // because the platform itself is municipality-agnostic until someone
  // authenticates with a JPKI-issued resident_code.
  const localityLabel = session?.user
    ? getMunicipalityLabel(session.user.resident_code)
    : "住民ポータル";

  return (
    <header className="border-b bg-card">
      <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between gap-4">
        <Link href="/" className="font-semibold tracking-tight">
          <span className="text-primary">●</span>{" "}
          <span>ローカル・コンパクトシティ</span>
          <span className="ml-2 text-xs text-muted-foreground">
            {session?.user ? localityLabel : PRODUCT_NAME.replace("ローカル・コンパクトシティ ", "")}
          </span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link href="/" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            提案一覧
          </Link>
          <Link
            href="/proposals/new"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            提案する
          </Link>
          <Link href="/report" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            行政レポート
          </Link>
          {admin && (
            <>
              <Link
                href="/admin/proposals"
                className={buttonVariants({ variant: "secondary", size: "sm" })}
              >
                管理画面
              </Link>
              <Link
                href="/admin/analytics"
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                統計
              </Link>
              <Link
                href="/admin/verify"
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                原本性検証
              </Link>
            </>
          )}
          {session?.user ? (
            <form action={logoutAction} className="flex items-center gap-2">
              <Badge variant="outline" className="hidden sm:inline-flex">
                {session.user.name ?? "認証済み住民"} ・ {localityLabel}
              </Badge>
              <Button type="submit" variant="outline" size="sm">
                ログアウト
              </Button>
            </form>
          ) : (
            <Link href="/login" className={buttonVariants({ size: "sm" })}>
              マイナで認証
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
