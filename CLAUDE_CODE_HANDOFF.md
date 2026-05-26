# Claude Code 引き継ぎメモ

`HANDOFF_FOR_CODEX.md` と同じ要点です。

## 2026-05-26 Codex作業

デモ起動前の環境変数確認として `.env.example` と `npm run check:env` (`scripts/check-env.mjs`) を追加しました。

主な確認内容:

- `DATABASE_URL`
- `AUTH_SECRET`
- `EXPORT_HMAC_SECRET`
- `JPKI_MODE`
- `JPKI_WEB_ENDPOINT`
- xID/OIDC 変数の部分設定 warning

確認済み:

```powershell
npm run check:env  # OK
npm run build      # OK（Google Fonts取得のためネットワーク許可が必要）
```

`npm run lint` は既存コード由来の React/Next ルール違反で失敗します。次は既存 lint エラーの解消、`JPKI_MODE=real` の疎通確認スクリプト、または brochure PDF 再生成のCI化がよいです。
