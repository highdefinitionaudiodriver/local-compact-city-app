# ローカルコンパクトシティ｜住民提案・デジタル署名プラットフォーム

> マイナンバーカード（JPKI）認証を活用し、自治体が「無視できない重みのある住民の総意」をデジタルで集約するプロトタイプ。

「単なる電子掲示板」ではなく、**居住確認済みの住民による電子署名**としてエビデンスを残し、**改ざん検知可能な公文書**として行政に届けるところまでを一気通貫で扱います。

---

## 🎯 これは何？（30秒で）

- **誰のため**：自治体DX担当・地方議員・住民参加プラットフォームを検討している市民団体
- **何が解決される**：ネット署名は「誰が署名したか」が証明できず行政が受け取れない、紙の請願は集計・保管が重い、という二重の問題を、**JPKI 認証 + HMAC-SHA256 検証可能 PDF** で同時に解決
- **なぜ既存ツールではダメか**：Change.org 等の海外プラットフォームは本人確認が無く、行政が公式に扱えない。本ツールは **居住確認済みの住民による電子署名** をエビデンスとして残し、改ざん検知可能な公文書として出力できる
- **使う条件**：Node.js 20+ / Next.js 16、ローカル運用（自治体内ネットワーク想定）

## 💰 想定ユースケース・価格帯

| 用途 | 形態 |
|---|---|
| プロトタイプ評価・PoC | 無料（MIT） |
| 自治体実証実験（カスタマイズ・JPKI 実接続） | 導入支援 応相談 |
| 議員・市民団体向けデモ実演 | 無償実演可（応相談） |

---

---

## 🎯 プロジェクトの狙い

| 課題 | 本プロトタイプの解 |
|---|---|
| ネット署名は「誰の署名か」が証明できない | JPKI で**住民であること**を証明し、SHA-256 ハッシュを ID に |
| 行政が受け取った文書が改ざんされていないか不安 | **HMAC-SHA256** を CSV/PDF に埋め込み、専用ページで再検証可能 |
| 紙の請願は集計・保管・電子化が大変 | ボタン一つで Excel CSV / 公文書品質 PDF を生成 |
| 自治体職員が市民の関心を肌感で掴めない | **Recharts** ベースの統計ダッシュボードで日次トレンド可視化 |

---

## 🏗 技術スタック

- **Frontend**: Next.js 16（App Router・Turbopack）、TypeScript、Tailwind CSS v4、shadcn/ui
- **Backend**: Next.js Server Actions / Route Handlers（Node Runtime）
- **DB**: Prisma 6 + SQLite（ローカル）
- **Auth**: NextAuth.js v5（Auth.js）— JPKI 認証はモック実装
- **PDF**: `@react-pdf/renderer` v4 + Noto Sans JP 同梱
- **検証**: `pdf-lib`（PDF metadata 読み取り）+ Node `crypto`（HMAC）
- **可視化**: `recharts` v3

### 主要ルート

```
住民向け
├── /                              提案一覧（プログレスバー）
├── /login                         JPKI モック認証（カードリーダ風アニメ）
├── /proposals/new                 提案投稿（IDEA / PETITION）
└── /proposals/[id]                詳細（賛否・電子署名・コメント）

行政向け
├── /report                        請願一覧（公開）
├── /report/[id]                   エビデンス画面（印刷向け）
├── /admin/proposals               提案管理ダッシュボード（Sparkline）
├── /admin/proposals/[id]          個別管理（ステータス変更履歴タイムライン）
├── /admin/analytics               統計ダッシュボード（時系列・属性別）★
├── /admin/verify                  原本性検証（HMAC 再計算 + 台帳照合）★
└── /admin/forbidden               非職員フォールバック

API
├── /api/auth/[...nextauth]
├── /api/admin/proposals/[id]/export   CSV (HMAC 署名付き)
└── /api/admin/proposals/[id]/pdf      PDF (HMAC + metadata 埋込)
```

---

## ⚙️ セットアップ

### 必要環境
- Node.js 22+ / npm 10+
- Windows ユーザは PowerShell 実行ポリシーを `RemoteSigned` に設定済みであること

```powershell
# 初回のみ
git clone <repo>
cd local-compact-city-app
npm install
Copy-Item .env.example .env
npm run check:env
npx prisma migrate dev   # SQLite DB 初期化
npm run db:seed          # シードデータ投入（提案 3 + モック署名 480 件）

# 起動
npm run dev
# → http://localhost:3000
```

### 環境変数 (`.env`)

```env
DATABASE_URL="file:./dev.db"
AUTH_SECRET="<32 バイトの base64 ランダム文字列>"
AUTH_TRUST_HOST="true"
EXPORT_HMAC_SECRET="<エクスポート HMAC 用シークレット>"
JPKI_MODE="mock"
JPKI_WEB_ENDPOINT="http://127.0.0.1:8000"
```

`AUTH_SECRET` と `EXPORT_HMAC_SECRET` は `openssl rand -base64 32` 等で個別に生成してください。
設定後に `npm run check:env` を実行すると、デモ起動前に必須環境変数と JPKI/xID 設定の不足を確認できます。

---

## 🎬 デモ実演シナリオ — 「盛岡バスセンター歩行者天国化請願」

### 舞台設定

> **岩手県盛岡市・盛岡バスセンター周辺**。コンパクトシティ政策の一環として、住民が「中心市街地を歩行者天国化し、地域経済を活性化させる」よう市に正式請願したい。本プラットフォームを使って **3 日で 500 筆**を集め、市議会に提出する。

**登場人物（既存ペルソナを物語上で読み替え）:**

| 画面表示 | デモ脚本上の役 | 役割 |
|---|---|---|
| 千代田区住民 A（山田 太郎） | 盛岡市民 A・山田 太郎さん | 請願の起ち上げ人 |
| 千代田区住民 B（佐藤 花子） | 盛岡市民 B・佐藤 花子さん | 賛同住民 |
| 千代田区住民 C（鈴木 一郎） | 盛岡市民 C・鈴木 一郎さん | 賛同住民 |
| 港区住民（田中 次郎） | 仙台市民 D・田中 次郎さん | 区外からの賛同 |
| 千代田区役所 担当者 | 盛岡市役所・コンパクトシティ推進課 | 行政側の検証役 |

> 💡 **on-screen 表示も「岩手県盛岡市」に揃えたい場合**は、[`src/lib/constants.ts`](src/lib/constants.ts) の `MUNICIPALITIES` に `"032018": "岩手県盛岡市"` を追加し、`HOME_MUNICIPALITY_CODE` を `"032018"` に変更、シードの `resident_code: "131016"` を `"032018"` に置換して `npx prisma migrate reset && npm run db:seed` で再構築できます。本 README はナラティブとしての読み替えを前提に書かれています。

---

### 🎬 シーン 1: 請願の起ち上げ（住民 A） — 約 2 分

**画面操作**
1. `/login` を開く
2. ドロップダウンから **「区内住民 → 千代田区住民 A」**（＝盛岡市民 A）を選択
3. 「カードを読み取る」をクリック
4. リーダ・アニメーション（〜2 秒）→ 「読み取った氏名: 山田 太郎」
5. **「ログインしてダッシュボードへ →」** をクリック
6. ヘッダーの **「提案する」** から `/proposals/new` へ
7. 種別は **「正式な署名（請願）」** を選択
8. タイトル: 「盛岡バスセンター周辺の歩行者天国化と地域活性化に関する請願」
9. 本文: （あらかじめ用意した 200 字程度の請願文を貼付）
10. 目標署名数: **500**、締切: 3 日後
11. 「投稿する」 → 詳細ページへ自動遷移

**観客への解説（話すセリフ）**

> 「いま画面で起こっていることに注目してください。リストにはまだ氏名が出ていません。ここに表示されているのは『区内住民 A』という匿名ラベルだけ。**マイナンバーカードを読み取った後で初めて山田太郎という氏名が現れる**設計になっています。
>
> これは『リーダーが本物の認証を通すまで個人情報は伏せられる』という JPKI 実機の挙動を、UI でも忠実に再現したものです。デモ用のモックですが、本番でも『カードと PIN が両方揃った瞬間しか個人特定情報は出ない』という原則を守ります。
>
> 投稿時、ユーザー ID として保存されるのは**マイナンバー（個人番号）ではありません**。署名用電子証明書のシリアル番号を SHA-256 でハッシュ化した不可逆値です。マイナンバー本体は最初から最後までシステムに触れません。」

**裏側で動いている技術ポイント**
- `src/lib/jpki-mock.ts` で `_mock_certificate_serial` を `crypto.createHash("sha256")` でハッシュ化
- `User.id` カラムは `String @id` で**ハッシュ済み値が主キー**
- `Proposal.author_id` は `User.id` への FK なので、マイナンバーへ辿れる経路が DB スキーマに**存在しない**

---

### 🎬 シーン 2: 議論の波及 — 約 3 分

**画面操作**
1. ヘッダー **「ログアウト」** → 「区内住民 B（佐藤 花子）」で再ログイン
2. シーン 1 で投稿した請願詳細を開く
3. 「私はこの自治体の住民として、本内容に賛同します」**チェックを入れる**
4. **「電子署名する」** ボタンをクリック → 即時に署名数が +1
5. 下部の「みんなの声」にコメント投稿:
   > 「バスセンターの利便性は守りつつ、子供と歩ける街にしたい。賛成です。」
6. ログアウトして「区内住民 C」で再ログイン → 同じ提案に署名 + コメント
7. ログアウトして「区外住民（仙台市民 D）」で再ログイン → 署名のみ
8. **二重投票テスト**: 仙台市民 D で同じ提案に再度「電子署名する」を試みる → 「**この提案には既に投票/署名済みです**」エラー

**観客への解説**

> 「3 名が次々と署名し、コメントで議論が深まっていきます。コメント欄の表示を見てください。**『ある住民・認証済み』としか出ていない**でしょう？ 本人特定情報は他の住民にも、画面のスクショからも、漏れない設計です。
>
> もう一つ大事な動きを見せます — 同じ人が二回署名できないことの実証です。ご覧の通り、エラーが返ってきました。これはアプリケーション層のバリデーションだけでなく、**データベースの一意制約 `@@unique([proposal_id, user_id])`** で物理的に防いでいます。仮にバックエンドのコードにバグがあっても、DB が二重署名を拒否します。」

**裏側で動いている技術ポイント**
- `prisma/schema.prisma` の `Vote` モデル: `@@unique([proposal_id, user_id])` で DB レベルガード
- Server Action は `Prisma.PrismaClientKnownRequestError` の `P2002` を捕捉して友好的なエラーメッセージを返却
- コメントは `display_name` を**意図的に SELECT しない**ことで漏洩経路を断つ

---

### 🎬 シーン 3: 行政の介入 — 約 3 分

**画面操作**
1. ログアウト → 「**自治体職員 → 千代田区役所 担当者**」（＝盛岡市役所担当）でログイン
2. ヘッダーに通常住民にはない **「管理画面 / 統計 / 原本性検証」** が出現
3. **「統計」**（`/admin/analytics`）を開く
4. KPI バー: 累計署名数 480 筆、ユニーク署名者 480 人 を確認
5. 請願カードに注目:
   - **AreaChart**: 過去 14 日で曲線が上昇、終盤で加速
   - **PieChart**: **緑（地元・盛岡市）が約 60%**、外側自治体（仙台・大阪・福岡）はそれぞれ 5〜15%
6. 「管理画面」（`/admin/proposals`）に戻る → 各行に Sparkline が表示
7. 該当請願の **「詳細・履歴」** をクリック
8. ステータスを **「受付中 → 行政受付済」** に変更 → 「✓ 保存」
9. 下部のタイムラインに 「OPEN → SUBMITTED」 が記録され、操作者ハッシュ先頭 8 文字が表示

**観客への解説**

> 「盛岡市役所の担当職員でログインすると、住民には見えない 3 つのメニューが現れます：管理画面、統計、原本性検証。
>
> 統計ダッシュボードの円グラフを見てください。**緑が地元住民、それ以外は区外**です。緑が大半を占めている — これは『地元住民の関心が高い』ことの定量的な証拠で、市議会への提出材料として説得力があります。
>
> 時系列グラフでは『キャンペーン開始から徐々に署名が増え、終盤に加速した』という熱量カーブが読み取れます。SNS 拡散のタイミングと連動して、行政側がリアルタイムに反応できる設計です。
>
> ステータスを『行政受付済』に変えました。**この変更は監査ログに自動記録されます**。誰が、いつ、どの状態に変えたか — 後から動かせない append-only 台帳に刻まれます。タイムラインの『操作者: e53b6cba…』は、職員のハッシュ ID の先頭 8 文字です。完全な値は DB に保管され、内部監査が必要な時だけ突合できます。」

**裏側で動いている技術ポイント**
- ステータス変更は `prisma.$transaction(async tx => { ... })` で **Proposal 更新と AuditLog 作成が原子的に実行**
- `AuditLog` テーブルはアプリケーションコード上**更新・削除メソッドを提供しない**（append-only）
- `/admin/*` のアクセス制御は **多層防御**：(1) middleware (edge) + (2) Server Component の `isAdmin()` + (3) Server Action 内の再検証

---

### 🎬 シーン 4: 公文書化（PDF レポート発行） — 約 2 分

**画面操作**
1. `/admin/proposals/[id]` 詳細ページの右上 **「PDF報告書」** をクリック
2. ダウンロードされた PDF を開く（`petition-report-...-2026-05-10.pdf`）
3. 中身を確認:
   - タイトル「**住民提案（請願） デジタル署名 最終報告書**」
   - 4 つの統計ボックス（有効署名数 / 目標達成率 / JPKI認証済み率 / 地元住民率）
   - 自治体別内訳テーブル
   - 「**セキュリティ証明**」枠囲み（…JPKI による公的個人認証を経た…）
   - フッター: **「文書検証用ハッシュ (HMAC-SHA256): b0d3141ea3f88d…」**

**観客への解説**

> 「ボタン一つで A4 の公文書品質 PDF が生成されます。日本語も Noto Sans JP がバンドルされているので印字崩れはありません。
>
> 重要なのはフッターのハッシュです。**HMAC-SHA256 で計算された 64 桁の hex 値**が、報告書の数値・タイトル・発行日時から決定的に算出され、ここに刻まれています。サーバが保有する秘密鍵 `EXPORT_HMAC_SECRET` がないと再現できません。
>
> 同じ仕組みは CSV エクスポートにも入っていて、CSV の場合は末尾に `# HMAC-SHA256: …` というコメント行が追加されます。Excel で開いても問題なく読めます。」

**裏側で動いている技術ポイント**
- `@react-pdf/renderer` の Document `keywords` メタデータに `hmac=...;proposalId=...;issuedAt=...` を埋め込み（機械可読）
- PDF 生成と同時に `IssuanceRecord` テーブルに発行台帳エントリを upsert（HMAC をユニーク主キー）
- HMAC 入力は `buildHmacPayload()` が返す**正規化済 JSON**：キー昇順・タイムスタンプ ISO 化

---

### 🎬 シーン 5: 原本性検証（最大の見せ場）— 約 3 分

**画面操作**
1. ヘッダーの **「原本性検証」** をクリック → `/admin/verify`
2. ドラッグ＆ドロップ欄にシーン 4 でダウンロードした PDF を投入
3. **緑カード「✅ 原本性が確認されました」** が表示
   - 提案タイトル「盛岡バスセンター…」が DB から復元
   - 発行日時、発行者ハッシュ先頭 8 文字
   - 64 桁 HMAC 全文
4. 続いて **意図的に改ざんしたファイル**を投入:
   - テキストエディタで CSV を開いて 1 文字書き換え → 保存 → アップロード
   - **赤カード「❌ 警告: 改ざんが検出されました」** が表示
5. ページ下部の「最近の検証履歴」に 2 件が積み上がる（OK / TAMPERED）

**観客への解説**

> 「最後にこのシステムの**最も大事な部分**をお見せします。
>
> 受け取った行政別部署、たとえば総務課が、この PDF が本当に当課（コンパクトシティ推進課）から発行された本物かを疑った場合 — **このページにファイルをドロップするだけで即座に判定**できます。
>
> 緑が出ました。これは 3 つのチェックを通過したことを意味します:
> 1. PDF メタデータから HMAC を取り出せた（フォーマット OK）
> 2. その HMAC が **発行台帳 IssuanceRecord に存在する**（システムが過去に発行した）
> 3. 台帳に保存された正規化ペイロードから HMAC を再計算しても**同じ値**になる（DB も改ざんされていない）
>
> 次に、わざとファイルの中身を 1 文字書き換えて再アップロードします — ご覧の通り**赤の警告**。たった 1 文字の改変も見逃しません。
>
> そして、**この検証行為自体も VerificationLog に記録**されます。誰が、いつ、何を、どんな結果で検証したか。これによって『検証してない』とは言えなくなります。」

**裏側で動いている技術ポイント**
- `pdf-lib` で `Keywords` メタデータをパース → HMAC 抽出
- `prisma.issuanceRecord.findUnique({ where: { hmac } })` で台帳照合
- `hmacHex(canonicalize(payload))` で **保存済正規化ペイロードから再計算** → `safeEqualHex()` で**タイミングセーフ比較**
- `VerificationLog` も append-only。OK / TAMPERED / UNKNOWN の 3 値で記録

---

## 🔐 信頼を支える仕組み（技術解説）

### 1. JPKI 認証 + SHA-256 ハッシュ化（個人特定情報の最小化）

実機マイナンバーカードからは「12 桁のマイナンバー」も取れますが、**本システムでは絶対に取得しません**。利用するのは「署名用電子証明書のシリアル番号」だけで、これも DB 保存前に SHA-256 でハッシュ化します。

```
生のシリアル番号 → SHA-256 → User.id に格納
                              ↑ 不可逆。元には戻せない
```

`src/lib/jpki-mock.ts:hashCertificateSerial()` で実装。

### 2. Prisma `@@unique` による DB レベル二重投票防止

```prisma
model Vote {
  proposal_id String
  user_id     String
  // ...
  @@unique([proposal_id, user_id])
}
```

アプリ層のバグでもこれは破れません。エラーは `P2002` として返り、Server Action が捕捉して人間可読メッセージに変換。

### 3. HMAC-SHA256 による文書改ざん検知

| 出力 | HMAC の計算対象 |
|---|---|
| **CSV** | プレアンブル（`# Proposal:` / `# Issued:`） + ヘッダー行 + データ行（BOM 含む全バイト） |
| **PDF** | `buildHmacPayload()` の正規化 JSON（提案 ID・タイトル・署名件数・発行日時 等） |

検証手順は `/admin/verify` で**コードと UI の両面から**示しています（[src/app/admin/verify/actions.ts](src/app/admin/verify/actions.ts)）。

### 4. 三段監査ログ（誰が何をしたか後から完全追跡可能）

| テーブル | 何を記録 | 性質 |
|---|---|---|
| `AuditLog` | 提案ステータス変更（誰が・OLD→NEW） | append-only |
| `IssuanceRecord` | CSV/PDF 発行（HMAC・正規化ペイロード） | append-only、`hmac` 一意 |
| `VerificationLog` | 検証実行（誰が・何を・OK/TAMPERED/UNKNOWN） | append-only |

これら 3 つの組み合わせで「**誰が**起案 → **誰が**ステータス変更 → **誰が**発行 → **誰が**検証」を全工程トレース可能。

### 5. Server / Client Component の境界によるプライバシー設計

- `jpki-mock.ts`（`node:crypto` 依存）→ Server のみ
- `auth.config.ts`（edge-safe）→ middleware で `/admin/*` をガード
- ログイン UI は `import type` のみで Persona 型を共有 → クライアントバンドルに crypto を持ち込まない
- コメント取得時は `user_id` を**SELECT しない**ことでフロント漏洩経路を断つ

### 6. JST 一貫性

すべての日時表示・ファイル名・PDF 発行日時を `Intl.DateTimeFormat("ja-JP" or "en-CA", { timeZone: "Asia/Tokyo" })` で統一。HMAC 入力にも `issuedAt.toISOString()` で UTC 値を入れ、検証側でも同じ ISO 文字列を再現可能にしています。

---

## 🚧 既知の制約 と Production Hardening Roadmap

| 領域 | 現プロト | 本番化に向けて |
|---|---|---|
| 認証 | JPKI モック | J-LIS / 公的個人認証 OP（OpenID Provider）連携、PIN ブルートフォース対策 |
| 鍵管理 | 共通鍵 HMAC | Ed25519 / ECDSA 公開鍵署名へ移行、KMS（AWS KMS / GCP KMS）で鍵管理 |
| 監査ログ | アプリ層 append-only | S3 Object Lock 等の WORM ストレージへ二重書き、改ざん不可化 |
| DB | SQLite | PostgreSQL + 暗号化バックアップ |
| アクセス制御 | persona キーから職員判定 | RBAC テーブル + MFA 必須の職員 IDP |
| スケール | 単一 Node.js プロセス | Vercel / Cloud Run + PgBouncer + Redis でセッション分散 |
| 通報・モデレーション | 未実装 | コメント通報フロー、職員レビュー UI |
| 多言語 | 日本語のみ | i18n（在留外国人への配慮） |

---

## 🛠 開発スクリプト

```powershell
npm run dev            # 開発サーバ
npm run build          # 本番ビルド
npm run lint           # ESLint
npm run db:seed        # シード再投入（冪等）
npx prisma studio      # DB GUI
npx prisma migrate dev # マイグレーション作成 / 適用
npx tsx scripts/check-admin-ids.ts  # 職員ハッシュ整合性チェック
```

---

## 📁 ディレクトリ構成（抜粋）

```
src/
├── app/
│   ├── (住民向けページ)
│   ├── admin/
│   │   ├── proposals/         提案管理ダッシュボード
│   │   ├── analytics/         統計ダッシュボード ★
│   │   ├── verify/            原本性検証ページ ★
│   │   └── ...
│   ├── api/admin/proposals/[id]/
│   │   ├── export/route.ts    CSV エクスポート
│   │   └── pdf/route.tsx      PDF レポート
│   ├── login/                 JPKI モックログイン UI
│   └── proposals/             提案投稿・詳細・コメント
├── components/
│   ├── ui/                    shadcn/ui コンポーネント群
│   ├── site-header.tsx        職員時に管理リンクが出る
│   └── sparkline.tsx          一覧用ミニトレンド
├── lib/
│   ├── prisma.ts              シングルトンクライアント
│   ├── jpki-mock.ts           JPKI 認証モック（Server only）
│   ├── admin.ts               isAdmin() / ADMIN_USER_IDS（edge-safe）
│   ├── hmac.ts                hmacHex / canonicalize / safeEqualHex
│   ├── constants.ts           自治体マスタ・enum 定数
│   └── pdf/
│       └── petition-report.tsx  PDF テンプレート
├── auth.ts                    NextAuth (Node)
├── auth.config.ts             NextAuth (edge-safe)
└── proxy.ts                   middleware（edge ガード）
prisma/
├── schema.prisma
├── seed.ts                    シード + アナリティクス模擬データ
└── migrations/
public/fonts/
└── NotoSansJP-Regular.otf     PDF 用日本語フォント（4.5MB バンドル）
```

---

## ライセンス・クレジット

- 本プロトタイプは概念実証目的の参考実装です
- Noto Sans JP: SIL Open Font License 1.1

---

## 🤝 商用利用・カスタマイズ依頼

- プロトタイプ評価は無料（MIT ライセンス）
- 自治体実証、JPKI 実カード接続、独自フォーマット対応、デモ実演は応相談
- 連絡先：highdefinitionaudiodriver@gmail.com

<!-- CODEX-CURRENT-STATUS:START -->
## 現状サマリ (2026-05-25)

- 対象: ローカルコンパクトシティ｜住民提案・デジタル署名プラットフォーム
- 作業ブランチ: feat/sellable-v1
- README更新時点の参照コミット: 2cd60f7 feat: implement PDF brochure generation script and export PDF
- Node.js / JavaScript 系プロジェクト。package.json を起点に依存関係とスクリプトを管理。
- docs ディレクトリ配下に設計・運用・補足資料を配置。
- src ディレクトリ配下に主要実装を配置。
- 主要な確認コマンド: npm test / npm run check（定義がある場合）
- 次に進めるなら、README 内の利用手順と既存 docs / tests を起点に、未整備の検証手順・引き継ぎメモ・CI 化を補強する。
<!-- CODEX-CURRENT-STATUS:END -->

