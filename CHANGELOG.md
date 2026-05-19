# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
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

## [0.1.0] - 2026-05-10

### Added
- 住民提案・電子署名プラットフォームの初版（Next.js 16 + Prisma 6 + SQLite）
- JPKI モック認証（カードリーダ風アニメーション）
- HMAC-SHA256 による CSV / PDF の改ざん検知
- 統計ダッシュボード（Recharts）と自治体別内訳の可視化
- 多層防御による `/admin/*` アクセス制御
- AuditLog による append-only な変更履歴
- `@react-pdf/renderer` + Noto Sans JP による公文書品質 PDF 出力
