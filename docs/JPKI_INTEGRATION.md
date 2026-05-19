# JPKI モック → 本番接続 切替ガイド

本プロジェクトは **JPKI モック** で開発・デモが完結する設計ですが、
自治体での本格運用時には **実マイナンバーカード** との接続が必要です。
本ドキュメントは「モックから本番接続へ切り替える手順」を、契約段階で
顧客に提示できる形でまとめたものです。

---

## 🎯 切替の基本方針

| 項目 | 設計 |
|---|---|
| 切替方法 | 環境変数 `JPKI_MODE=mock|real` 一発 |
| コード変更 | **不要**（src/lib/jpki-bridge.ts が吸収） |
| 既存呼び出し側 | `authenticateWithCard()` ファサードに移行するだけ |
| セキュリティ境界 | PIN は本サーバを通らず、jpki-web 側で取得・即破棄 |

---

## 🔄 アーキテクチャ図

### モックモード（開発・デモ・自治体評価段階）

```
ブラウザ (Next.js)
   │
   ├── /login → サーバアクション
   │              │
   │              └── jpki-bridge.authenticateWithCard("chiyoda-a")
   │                        │
   │                        └── jpki-mock.readCardAsPersona(...)
   │                              （ハードコードされたペルソナを返却）
```

### 本番接続モード（実運用）

```
ブラウザ (Next.js)
   │
   ├── /login → サーバアクション
   │              │
   │              └── jpki-bridge.authenticateWithCard()
   │                        │
   │                        └── HTTP POST 127.0.0.1:8000/api/read-certificate
   │                              │
   │                              ▼
   │                        jpki-web (FastAPI, ローカル専用)
   │                              │
   │                              ├── PIN GUI 表示 → 入力
   │                              ├── PC/SC でカード読取
   │                              └── 証明書情報を返却
   │                                  （PIN はネットワークを越えない）
```

---

## 📋 切替手順

### 1. jpki-web 側の対応

現在 jpki-web には以下のエンドポイントがあります：

| エンドポイント | 用途 |
|---|---|
| `POST /api/sign` | 画像への署名（`.jpkiimg` 生成） |
| `POST /api/verify` | `.jpkiimg` の検証 |

**本接続のために追加実装が必要**：

```python
# 追加: POST /api/read-certificate
# Body: なし（PIN は GUI で取得）
# Response:
#   { "ok": true,
#     "certificate_serial": "1234567890ABCDEF",
#     "resident_code": "131016",
#     "display_name": "山田 太郎" }
```

実装の流れ：
1. jpki-web に PIN 入力 GUI を表示
2. PC/SC でカード接続を確認
3. 署名用電子証明書を読み取り
4. 証明書のシリアル番号、住所属性（→ 6 桁住所コード）、氏名を取得
5. JSON で返却

**重要**：本サーバ（local-compact-city-app）には PIN を渡さない。
jpki-web の CORS 制限により `127.0.0.1:8000` のみアクセス可能で、同一マシン
での運用が前提。

### 2. 本プロジェクト側の対応

`.env` に以下を追加：

```env
JPKI_MODE=real
JPKI_WEB_ENDPOINT=http://127.0.0.1:8000
```

呼び出し側コード（例：login の Server Action）を以下のように書き換え：

```ts
// Before
import { readCardAsPersona } from "@/lib/jpki-mock";
const auth = readCardAsPersona(personaKey);

// After
import { authenticateWithCard } from "@/lib/jpki-bridge";
const auth = await authenticateWithCard(personaKey);  // mock 時は personaKey 必要
                                                       // real 時は personaKey 不要
```

それだけで動作モードが切り替わります。

### 3. 起動手順

```powershell
# (1) jpki-web をローカル起動
cd /path/to/jpki-web
py -3.12 -m uvicorn app.main:app --host 127.0.0.1 --port 8000

# (2) 本プロジェクトを同じマシンで起動
cd /path/to/local-compact-city-app
JPKI_MODE=real npm run dev
```

---

## 🔒 セキュリティ上の注意

### PIN の取り扱い

- **本サーバには PIN を送信しない** — jpki-web 側で GUI 入力 → 即破棄
- jpki-web は `127.0.0.1` バインド必須 — リモートデプロイ厳禁
- 本プロジェクトと jpki-web は **同一物理マシン** で動作させる

### ネットワーク境界

| 通信 | 経路 | 保護 |
|---|---|---|
| ブラウザ ↔ Next.js | HTTP/HTTPS | TLS（本番） |
| Next.js ↔ jpki-web | HTTP loopback | 127.0.0.1 のみ、CORS 制限 |
| jpki-web ↔ カード | PC/SC ローカル | OS 認証 |
| カード ↔ 利用者 | PIN | 利用者の指のみ |

### 障害時の動作

- jpki-web が起動していない → `authenticateWithCard()` は `null` を返却
- カード読取失敗 → 同上
- 呼び出し側で「カード読取に失敗しました」を表示

---

## 🎁 自治体提案時の説得材料

> 「現在はモックモードで開発・評価いただけます。本格運用時は環境変数を 1 行
> 変えるだけで実カード接続に切り替わります。アプリのコードを書き換える
> 必要はなく、移行リスクが極めて小さい設計です。」

これにより、**実機検証は本契約後** に回せます。実機が無いと営業できない、
というベンダーロックインを排除できます。

---

## 🚧 現状の制限

- `authenticateWithRealCard()` 内の jpki-web API 呼び出しは **スタブ実装**
  （契約・本接続検証時にエンドポイント追加実装が必要）
- 既存の `src/app/login/` 配下は `jpki-mock` を直接 import している
  ため、本接続移行時には `jpki-bridge` 経由に書き換える必要あり

これらは本接続案件受託時にまとめて対応する想定で、設計の骨格は
このドキュメントとブリッジモジュールで確立済みです。

---

## 連絡先

実機接続・自治体導入支援は応相談：
- highdefinitionaudiodriver@gmail.com
