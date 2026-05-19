# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- README に「これは何？（30秒で）」「想定ユースケース・価格帯」セクションを追加（自治体・議員向け提案の判断材料）
- SECURITY.md を追加（脆弱性報告フロー）
- 商用利用・カスタマイズ依頼の連絡先を README 末尾に明記

## [0.1.0] - 2026-05-10

### Added
- 住民提案・電子署名プラットフォームの初版（Next.js 16 + Prisma 6 + SQLite）
- JPKI モック認証（カードリーダ風アニメーション）
- HMAC-SHA256 による CSV / PDF の改ざん検知
- 統計ダッシュボード（Recharts）と自治体別内訳の可視化
- 多層防御による `/admin/*` アクセス制御
- AuditLog による append-only な変更履歴
- `@react-pdf/renderer` + Noto Sans JP による公文書品質 PDF 出力
