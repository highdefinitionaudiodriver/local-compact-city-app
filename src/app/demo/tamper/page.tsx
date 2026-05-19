// ────────────────────────────────────────────────────────────────────────────
// /demo/tamper
//
// 営業デモ用ページ。本番のデータベース・認証・環境変数とは完全に独立した
// 自己完結デモで、HMAC-SHA256 による改ざん検知の挙動を実演します。
//
// 自治体・議員・市民団体への提案時に「PDF/CSV を改ざんすると瞬時に赤くなる」
// のを見てもらうための単独ページです。本番運用とは別の DEMO_SECRET を使用。
// ────────────────────────────────────────────────────────────────────────────
import TamperDemo from "./tamper-demo";

export const dynamic = "force-static";  // ビルド時に静的化（DB 接続不要）

export const metadata = {
  title: "改ざん検知デモ | ローカルコンパクトシティ",
  description: "HMAC-SHA256 による公文書改ざん検知の挙動を、その場で確認できる営業デモページ。",
};

// 本番運用とは無関係の固定デモシークレット。本番では EXPORT_HMAC_SECRET を使用。
const DEMO_SECRET = "demo-secret-not-for-production-use-only-for-illustration-purposes";

const DEMO_PAYLOAD_TITLE = "盛岡バスセンター歩行者天国化請願";
const DEMO_PAYLOAD_BODY =
  "私たちは、盛岡バスセンター周辺の中心市街地を歩行者天国化し、" +
  "地域経済の活性化と歩いて暮らせる街づくりを実現することを請願します。";

// デモ用 CSV（実際のエクスポート形式に近い）
const DEMO_CSV = `proposal_id,title,signature_count,target_count,closed_at
P-2026-0042,${DEMO_PAYLOAD_TITLE},487,500,2026-05-17T18:00:00+09:00
---SIGNATURES---
signature_id,user_hash,municipality,signed_at
S-001,e53b6cba12a4...,032018,2026-05-15T10:23:11+09:00
S-002,7f1d9e4b3c8a...,032018,2026-05-15T11:08:45+09:00
S-003,c4a7b2d8f193...,041009,2026-05-15T14:55:02+09:00
... (484 件省略 — デモのため)`;

export default function TamperDemoPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mb-2">
            DEMO / SALES TOOL
          </p>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-3">
            🔒 改ざん検知デモ
          </h1>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
            自治体に提出する請願 CSV / PDF に <strong>HMAC-SHA256 署名</strong> を埋め込むことで、
            「受け取った文書が改ざんされていないか」を瞬時に検証できます。
            このページで実際に文書を書き換えてみてください。<strong>1 文字でも変えると即座に赤くなります</strong>。
          </p>
        </header>

        <TamperDemo
          demoSecret={DEMO_SECRET}
          initialCsv={DEMO_CSV}
          initialTitle={DEMO_PAYLOAD_TITLE}
          initialBody={DEMO_PAYLOAD_BODY}
        />

        <section className="mt-12 p-6 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-bold mb-3 text-slate-900 dark:text-slate-100">
            🎯 このデモが営業的に意味すること
          </h2>
          <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
            <li>
              <strong>議員・自治体担当者の納得材料</strong> —
              「ネット署名は本当に改ざんされていないと言えるのか？」への直接的な答え。
            </li>
            <li>
              <strong>公文書品質の証跡</strong> —
              紙の請願書の代替として、定量的に「無視できない重み」を提示可能。
            </li>
            <li>
              <strong>鍵管理が自治体側に閉じる</strong> —
              SaaS 事業者に依存しない、自治体内で完結する暗号設計。
            </li>
            <li>
              <strong>標準アルゴリズム（HMAC-SHA256）</strong> —
              監査時に第三者ツールで再検証可能。ベンダーロックインなし。
            </li>
          </ul>
        </section>

        <section className="mt-6 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
          <p className="text-xs text-amber-900 dark:text-amber-200">
            ⚠️ <strong>このページのシークレットは固定のデモ用</strong>です（ソースコードに露出しています）。
            本番運用では環境変数 <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded">EXPORT_HMAC_SECRET</code> に強いランダム値を設定し、
            自治体内で厳重に管理してください。
          </p>
        </section>

        <footer className="mt-8 text-center text-xs text-slate-500 dark:text-slate-400">
          <p>
            実装は本リポジトリの{" "}
            <code className="font-mono">src/lib/hmac.ts</code> /{" "}
            <code className="font-mono">src/app/admin/verify/</code> 参照。
          </p>
          <p className="mt-2">
            商用利用・カスタマイズ依頼：highdefinitionaudiodriver@gmail.com
          </p>
        </footer>
      </div>
    </main>
  );
}
