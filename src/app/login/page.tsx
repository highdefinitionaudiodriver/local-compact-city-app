import { auth, isXidEnabled } from "@/auth";
import { redirect } from "next/navigation";
import { JPKI_PERSONAS } from "@/lib/jpki-mock";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoginForm, type PersonaPublic } from "./login-form";

// NextAuth's known error codes that we want to surface in plain Japanese.
// Anything else falls through to a generic message.
const ERROR_LABELS: Record<string, string> = {
  Configuration:
    "認証プロバイダの設定に問題があります。OIDC issuer / Client ID / Secret を確認してください。（example.com 等のダミー値では接続できません）",
  AccessDenied: "アクセスが拒否されました。",
  Verification: "検証用リンクが無効か期限切れです。",
  OAuthSignin: "OAuth サインイン要求の送信に失敗しました。",
  OAuthCallback: "OAuth コールバック処理でエラーが発生しました。",
  OAuthCreateAccount: "OAuth ユーザの作成に失敗しました。",
  EmailCreateAccount: "ユーザの作成に失敗しました。",
  Callback: "コールバック処理に失敗しました。",
  OAuthAccountNotLinked: "このアカウントは既存ユーザに紐づいていません。",
  CredentialsSignin: "資格情報での認証に失敗しました。",
  SessionRequired: "ログインが必要です。",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/");

  const xidEnabled = isXidEnabled();
  const { error } = await searchParams;
  const errorLabel = error
    ? ERROR_LABELS[error] ?? `認証中にエラーが発生しました（${error}）。`
    : null;

  // Strip the mock certificate serial before sending to the client. Even
  // though it's a fake value in the prototype, this matches the real
  // production constraint: cryptographic material never leaves the server.
  const personas: PersonaPublic[] = JPKI_PERSONAS.map((p) => ({
    key: p.key,
    category: p.category,
    anonymous_label: p.anonymous_label,
    display_name: p.display_name,
    resident_code: p.resident_code,
  }));

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">
          マイナンバーカードでログイン
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          住民であることをマイナンバーカードで証明します。
          証明書のシリアル番号はサーバ側で <strong>SHA-256 ハッシュ化</strong> され、
          マイナンバー（個人番号）そのものは取得・保存されません。
        </p>
      </div>

      {errorLabel && (
        <Card className="mb-5 border-rose-400/70 bg-rose-50/60 dark:bg-rose-950/20">
          <CardContent className="pt-6 text-sm">
            <p className="font-semibold text-rose-900 dark:text-rose-200">
              ⚠ 認証に失敗しました
            </p>
            <p className="mt-1 text-rose-900/90 dark:text-rose-200/90">
              {errorLabel}
            </p>
            <p className="mt-2 text-xs text-rose-900/70 dark:text-rose-200/70">
              下のモック認証は引き続きご利用いただけます。
            </p>
          </CardContent>
        </Card>
      )}

      {/* Real xID / OIDC entry point — featured at the top so the production
          path is the visually default option whenever credentials are set. */}
      <Card className="mb-5 border-emerald-400/70 bg-emerald-50/60 dark:bg-emerald-950/20">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <span aria-hidden>🪪</span> 実機で認証する（xID 連携）
            </CardTitle>
            {xidEnabled ? (
              <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">
                有効
              </Badge>
            ) : (
              <Badge variant="outline">未設定</Badge>
            )}
          </div>
          <CardDescription>
            本番環境では、お手元のマイナンバーカードと IC カードリーダー（または
            スマートフォンの NFC）を使い、xID などの公的個人認証ブリッジ経由で
            ログインします。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {xidEnabled ? (
            <a
              href="/api/auth/signin/xid"
              className="inline-flex h-10 w-full items-center justify-center rounded-md bg-emerald-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 transition-colors"
            >
              マイナンバーカードで実機認証する →
            </a>
          ) : (
            <div className="rounded-md border border-dashed bg-muted/40 px-3 py-3 text-xs text-muted-foreground">
              <p>
                <code className="font-mono">XID_ISSUER</code> /{" "}
                <code className="font-mono">XID_CLIENT_ID</code> /{" "}
                <code className="font-mono">XID_CLIENT_SECRET</code> を{" "}
                <code className="font-mono">.env</code> に設定すると、ここに本番認証ボタンが現れます。
                クライアント設定例は{" "}
                <code className="font-mono">README.md</code> を参照。
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="my-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">または デモ用モック</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <Card className="mb-5 border-amber-300 bg-amber-50/50 dark:bg-amber-950/20">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <span aria-hidden>🟠</span> プロトタイプ用モック
          </CardTitle>
          <CardDescription>
            実機の代わりに、下のドロップダウンから「読み取った人物」を選んで
            JPKI の挙動を再現します。実演・テスト用です。
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <LoginForm personas={personas} />
        </CardContent>
      </Card>
    </main>
  );
}
