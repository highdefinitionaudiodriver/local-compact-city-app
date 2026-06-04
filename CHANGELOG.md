# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-06-04

### Fixed
- ESLint エラー/警告を解消（`npm run lint` がグリーンに）
  - `src/lib/pdf/brochure-report.tsx`: `style?: any` を `Style | Style[]`（@react-pdf/types）に修正
  - `brochure-report.tsx` / `petition-report.tsx` / `prisma.ts` の不要になった eslint-disable ディレクティブを削除
  - 新しい `react-hooks`(v6) / `@next/next` ルールが正当なパターンを誤検知する3箇所（OAuth サインイン API ルートへの実ナビゲーション `<a>`、リーダー演出の effect 内同期初期化、`force-dynamic` サーバーコンポーネントでのリクエスト時刻判定）に、理由コメント付きの局所 disable を付与

### Added
- 署名ヘルパー `src/lib/hmac.ts`（CSV/PDF エクスポートの HMAC-SHA256 署名）の単体テスト `tests/hmac.test.ts`（11ケース）。参照ダイジェスト一致、決定性、`canonicalize` の再帰キーソート、`safeEqualHex` の定数時間比較などを検証。`npm test`（`node --test tests/*.test.ts`、Node 24 ネイティブ TS 実行）を追加
- README に「これは何？（30秒で）」「想定ユースケース・価格帯」セクションを追加（自治体・議員向け提案の判断材料）
- SECURITY.md を追加（脆弱性報告フロー）
- 商用利用・カスタマイズ依頼の連絡先を README 末尾に明記
- docs/brochure/BROCHURE_JA.md — 自治体・議員向け 1 枚パンフレット
- **`/demo/tamper` 改ざん検知デモページ**（営業ツール）
  - Web Crypto API でクライアントサイド HMAC-SHA256 リアルタイム再計算
  - 文書編集に応じて瞬時に ✅/❌ が切り替わるビジュアルデモ
  - 本番 `EXPORT_HMAC_SECRET` ではなく固定 DEMO_SECRET 使用（自己完結）
  - 静的化 (`force-static`) で DB・認証なしでも動作
- **prisma/seed.ts デモデータを 7 件 → 20 件に拡充**（デモ実演のリアリティ向上）
  - 自治体: 千代田・盛岡・大阪・港 → 京都・福岡・札幌・仙台を追加（計 8 自治体）
  - 提案ジャンル: 教育・交通・環境・福祉・防災・DX・文化 の 7 ジャンルを横断
  - 各提案にリアル感ある架空タイトル・本文と適切な seedSignatures を設定
  - 統計ダッシュボード（円グラフ・時系列）の見栄えが大幅に向上
- **src/lib/jpki-bridge.ts** — JPKI mock/real 切替アダプタ
  - 環境変数 `JPKI_MODE=mock|real` で振る舞い切替
  - real モードは jpki-web の HTTP API (127.0.0.1:8000) を叩く設計
  - PIN は jpki-web 側で取得・即破棄 — 本サーバを経由しない
  - 既存 jpki-mock の呼び出し側は無変更で並存可能
- **docs/JPKI_INTEGRATION.md** — モック→本番接続の切替ガイド
  - jpki-web 側の追加実装契約（`/api/read-certificate` API）を明文化
  - 自治体提案時の説得材料（「環境変数 1 行で切替・コード変更不要」）

## [0.1.0] - 2026-05-10

### Added
- 住民提案・電子署名プラットフォームの初版（Next.js 16 + Prisma 6 + SQLite）
- JPKI モック認証（カードリーダ風アニメーション）
- HMAC-SHA256 による CSV / PDF の改ざん検知
- 統計ダッシュボード（Recharts）と自治体別内訳の可視化
- 多層防御による `/admin/*` アクセス制御
- AuditLog による append-only な変更履歴
- `@react-pdf/renderer` + Noto Sans JP による公文書品質 PDF 出力
