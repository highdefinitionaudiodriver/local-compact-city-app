"use client";

// ────────────────────────────────────────────────────────────────────────────
// tamper-demo.tsx
//
// クライアントサイドで Web Crypto API を使い、編集に対してリアルタイムに
// HMAC-SHA256 を再計算して改ざん検知を可視化するデモコンポーネント。
//
// 本番の HMAC は src/lib/hmac.ts で `node:crypto` 経由で計算される。
// このデモは見せ方の説得力のために、サーバラウンドトリップ無しで
// ブラウザ内で同じアルゴリズムを実行する。
// ────────────────────────────────────────────────────────────────────────────
import { useEffect, useMemo, useState } from "react";

type Props = {
  demoSecret: string;
  initialCsv: string;
  initialTitle: string;
  initialBody: string;
};

async function computeHmacHex(secret: string, payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  const bytes = new Uint8Array(sig);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * 検証対象を 1 つの正規化された文字列にする。
 * 本番では canonicalize(JSON) を使うが、デモでは見やすさのため平文連結。
 */
function buildPayload(title: string, body: string, csv: string): string {
  return `TITLE:\n${title}\n\nBODY:\n${body}\n\nCSV:\n${csv}`;
}

export default function TamperDemo({
  demoSecret,
  initialCsv,
  initialTitle,
  initialBody,
}: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);
  const [csv, setCsv] = useState(initialCsv);
  const [originalHmac, setOriginalHmac] = useState<string>("");
  const [currentHmac, setCurrentHmac] = useState<string>("");
  const [editedHmac, setEditedHmac] = useState<string>("");
  const [isReady, setIsReady] = useState(false);

  // 初回マウント時に「真正版」の HMAC を計算
  useEffect(() => {
    (async () => {
      const original = await computeHmacHex(
        demoSecret,
        buildPayload(initialTitle, initialBody, initialCsv),
      );
      setOriginalHmac(original);
      setCurrentHmac(original);
      setEditedHmac(original);
      setIsReady(true);
    })();
  }, [demoSecret, initialTitle, initialBody, initialCsv]);

  // 編集のたびに HMAC を再計算（軽量なので debounce 不要）
  useEffect(() => {
    if (!isReady) return;
    let cancelled = false;
    (async () => {
      const recalc = await computeHmacHex(demoSecret, buildPayload(title, body, csv));
      if (!cancelled) setCurrentHmac(recalc);
    })();
    return () => {
      cancelled = true;
    };
  }, [title, body, csv, demoSecret, isReady]);

  const isUntouched = title === initialTitle && body === initialBody && csv === initialCsv;
  const isValid = useMemo(
    () => isReady && currentHmac === editedHmac && currentHmac !== "",
    [isReady, currentHmac, editedHmac],
  );

  const resetToOriginal = () => {
    setTitle(initialTitle);
    setBody(initialBody);
    setCsv(initialCsv);
    setEditedHmac(originalHmac);
  };

  const tamperRandomly = () => {
    setBody(body + " （←悪意ある追記）");
    // HMAC は元のまま残す → 検証が失敗する様子を見せる
  };

  return (
    <div className="space-y-6">
      {/* === 検証ステータスカード === */}
      <div
        className={`rounded-lg border-2 p-6 shadow-sm transition-colors ${
          isValid
            ? "border-green-500 bg-green-50 dark:bg-green-950/30"
            : "border-red-500 bg-red-50 dark:bg-red-950/30"
        }`}
      >
        <div className="flex items-start gap-4">
          <div className="text-4xl">{isValid ? "✅" : "❌"}</div>
          <div className="flex-1">
            <h2
              className={`text-xl font-bold mb-1 ${
                isValid
                  ? "text-green-900 dark:text-green-200"
                  : "text-red-900 dark:text-red-200"
              }`}
            >
              {isValid ? "有効な文書です" : "改ざんを検知しました"}
            </h2>
            <p
              className={`text-sm ${
                isValid
                  ? "text-green-800 dark:text-green-300"
                  : "text-red-800 dark:text-red-300"
              }`}
            >
              {isValid
                ? "HMAC-SHA256 署名が一致しています。この文書は発行時から変更されていません。"
                : "計算した HMAC-SHA256 が文書に埋め込まれた署名値と一致しません。1 ビットでも変更されている可能性があります。"}
            </p>
          </div>
        </div>
      </div>

      {/* === ハッシュ比較表示 === */}
      <div className="rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">
          HMAC-SHA256 ハッシュ比較
        </h3>
        <dl className="space-y-2 text-xs font-mono">
          <div className="grid grid-cols-[140px_1fr] gap-3 items-start">
            <dt className="text-slate-500 dark:text-slate-400">文書埋込済み</dt>
            <dd className="break-all text-slate-900 dark:text-slate-100">
              {editedHmac || "(計算中...)"}
            </dd>
          </div>
          <div className="grid grid-cols-[140px_1fr] gap-3 items-start">
            <dt className="text-slate-500 dark:text-slate-400">いま計算した値</dt>
            <dd
              className={`break-all ${
                isValid
                  ? "text-green-700 dark:text-green-400"
                  : "text-red-700 dark:text-red-400"
              }`}
            >
              {currentHmac || "(計算中...)"}
            </dd>
          </div>
        </dl>
      </div>

      {/* === 編集フォーム === */}
      <div className="rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            ✏️ 文書内容（自由に編集してください）
          </h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={tamperRandomly}
              className="text-xs px-3 py-1.5 bg-red-100 hover:bg-red-200 dark:bg-red-900/40 dark:hover:bg-red-900/60 text-red-900 dark:text-red-200 rounded border border-red-300 dark:border-red-800"
            >
              改ざんする
            </button>
            <button
              type="button"
              onClick={resetToOriginal}
              disabled={isUntouched}
              className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-100 rounded border border-slate-300 dark:border-slate-600 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              元に戻す
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            タイトル
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            請願本文
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-y"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            署名 CSV（抜粋）
          </label>
          <textarea
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            rows={8}
            className="w-full px-3 py-2 text-xs font-mono border border-slate-300 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-y"
          />
        </div>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
        💡 ヒント: 上の「改ざんする」ボタンで本文末尾に追記を試すか、CSV の数値を変えてみてください。
      </p>
    </div>
  );
}
