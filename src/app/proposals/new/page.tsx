import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ProposalForm } from "./proposal-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MUNICIPALITIES } from "@/lib/constants";

export default async function NewProposalPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const home = MUNICIPALITIES[session.user.resident_code] ?? session.user.resident_code;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold">新しい提案を投稿</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        投稿者: <strong>{session.user.name}</strong>（{home}・認証済み住民）
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">提案の重みを選んでください</CardTitle>
          <CardDescription>
            「アイデア」は気軽な提案として賛成/反対が集まります。
            「正式な署名」は行政に提出する請願となり、より重い意思表示として
            個別の確認を経た電子署名が集まります。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProposalForm />
        </CardContent>
      </Card>
    </main>
  );
}
