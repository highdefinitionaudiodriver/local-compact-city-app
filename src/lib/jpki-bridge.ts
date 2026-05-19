// ────────────────────────────────────────────────────────────────────────────
// JPKI Bridge — mock / real 切替アダプタ
//
// 環境変数 `JPKI_MODE` で振る舞いを切り替える薄いファサード：
//
//   JPKI_MODE=mock  (default) : src/lib/jpki-mock.ts のペルソナを使う
//   JPKI_MODE=real            : ローカル jpki-web HTTP API (127.0.0.1:8000)
//                                に問い合わせる本番接続モード
//
// 本ファイルは「実カードが手元に無くても自治体に契約提案できる」状態を
// 作るためのインタフェース定義。real モードの実装はカード接続検証時に
// 完成させる前提でスタブ化しているが、契約・要件定義の段階では
// 「環境変数を変えるだけで切り替えられます」と説明できるのが営業上の鍵。
//
// 参照: docs/JPKI_INTEGRATION.md
// ────────────────────────────────────────────────────────────────────────────

import {
  JPKI_PERSONAS,
  type JpkiAuthResult,
  hashCertificateSerial,
  readCardAsPersona,
} from "./jpki-mock";

export type JpkiMode = "mock" | "real";

export function getJpkiMode(): JpkiMode {
  const raw = (process.env.JPKI_MODE || "mock").toLowerCase();
  return raw === "real" ? "real" : "mock";
}

/**
 * mock / real を意識せずに「カードを読み取ってアプリ ID を得る」操作。
 *
 * @param personaKey  mock モードでは `JPKI_PERSONAS[].key`。real モードでは
 *                    UI から渡される必要なし（カードリーダー読取で確定）。
 *                    互換性のため引数は残してあるが real モードでは無視する。
 */
export async function authenticateWithCard(
  personaKey?: string,
): Promise<JpkiAuthResult | null> {
  const mode = getJpkiMode();
  if (mode === "mock") {
    if (!personaKey) return null;
    return readCardAsPersona(personaKey);
  }
  return authenticateWithRealCard();
}

// ────────────────────────────────────────────────────────────────────────────
// REAL モード — jpki-web のローカル HTTP API を叩く
//
// jpki-web プロジェクト (https://github.com/highdefinitionaudiodriver/jpki-web)
// が同一ホストで `127.0.0.1:8000` にバインドして起動している前提。
// PIN は jpki-web 側の GUI で入力され、本リポジトリ側のサーバには渡らない
// （セキュリティ境界の維持）。
// ────────────────────────────────────────────────────────────────────────────

const JPKI_WEB_ENDPOINT =
  process.env.JPKI_WEB_ENDPOINT || "http://127.0.0.1:8000";

type JpkiWebReadResponse = {
  ok: boolean;
  certificate_serial?: string;
  resident_code?: string;
  display_name?: string;
  error?: string;
};

async function authenticateWithRealCard(): Promise<JpkiAuthResult | null> {
  // 注：jpki-web 側の `/api/read-certificate` エンドポイントは
  // 現時点では未実装。本プロジェクトとの正式接続時に jpki-web 側に
  // 以下の契約で実装する必要がある：
  //
  //   POST /api/read-certificate
  //     body: { } （PIN は jpki-web の GUI で取得・即破棄）
  //     200: { ok: true, certificate_serial, resident_code, display_name }
  //     4xx/5xx: { ok: false, error }
  //
  // 既存の jpki-web は `.jpkiimg` の生成 (POST /api/sign) と検証
  // (POST /api/verify) のみを公開しているため、本人認証専用の
  // `/api/read-certificate` を追加実装する必要がある。

  try {
    const res = await fetch(`${JPKI_WEB_ENDPOINT}/api/read-certificate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // 本接続時は CSRF トークン等を加える
      body: JSON.stringify({}),
      // jpki-web は CORS で localhost のみ許可するため、本サーバが同一ホスト
      // 上で動いていることが必要
      cache: "no-store",
    });

    if (!res.ok) return null;
    const data = (await res.json()) as JpkiWebReadResponse;
    if (!data.ok || !data.certificate_serial) return null;

    return {
      hashed_id: hashCertificateSerial(data.certificate_serial),
      resident_code: data.resident_code || "",
      display_name: data.display_name || "",
    };
  } catch (err) {
    // 接続失敗・パースエラー・タイムアウトは全て null に丸めて
    // 呼び出し側で「カード読取失敗」として表示する
    if (process.env.NODE_ENV !== "production") {
      console.warn("[jpki-bridge] real mode failed:", err);
    }
    return null;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// 補助：UI 側で「現在のモード」を表示するためのヘルパー
// ────────────────────────────────────────────────────────────────────────────

export function getJpkiModeLabel(): string {
  return getJpkiMode() === "real"
    ? "本番接続 (jpki-web HTTP API)"
    : "モック (デモ用ペルソナ)";
}

export function isMockModeAvailable(): boolean {
  // mock モードはペルソナがハードコードされているので常に true
  return JPKI_PERSONAS.length > 0;
}
