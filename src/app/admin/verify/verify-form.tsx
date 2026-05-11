"use client";

import { useState, useTransition } from "react";
import { verifyExportAction, type VerifyResult } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const fmt = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function VerifyForm() {
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  function submit(formData: FormData) {
    setResult(null);
    startTransition(async () => {
      const r = await verifyExportAction(formData);
      setResult(r);
    });
  }

  function handleFile(file: File | null) {
    if (!file) {
      setFileName(null);
      return;
    }
    setFileName(file.name);
    const fd = new FormData();
    fd.set("file", file);
    submit(fd);
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">CSV / PDF をアップロード</CardTitle>
          <p className="text-xs text-muted-foreground">
            ローカルに保存された CSV / PDF をドラッグ＆ドロップするか、
            ファイル選択ボタンから読み込んでください。ファイルはサーバ側で照合のみに使用され、保存はされません。
          </p>
        </CardHeader>
        <CardContent>
          <label
            htmlFor="verify-file"
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) handleFile(f);
            }}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-6 py-10 text-sm transition-colors ${
              dragOver ? "border-primary bg-primary/5" : "border-input bg-muted/30"
            }`}
          >
            <span className="text-3xl" aria-hidden>
              📄
            </span>
            <span className="font-medium">
              {fileName ?? "ファイルをここにドロップ、またはクリックして選択"}
            </span>
            <span className="text-xs text-muted-foreground">
              対応形式: .csv / .pdf（最大 25MB）
            </span>
            <input
              id="verify-file"
              type="file"
              accept=".csv,.pdf,application/pdf,text/csv"
              className="sr-only"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
          </label>
          {pending && (
            <p className="mt-3 text-sm text-muted-foreground">検証中…</p>
          )}
        </CardContent>
      </Card>

      {result && <ResultCard result={result} />}

      {result && (
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setResult(null);
              setFileName(null);
            }}
          >
            別のファイルを検証
          </Button>
        </div>
      )}
    </div>
  );
}

function ResultCard({ result }: { result: VerifyResult }) {
  const ok = result.result === "OK";
  const tampered = result.result === "TAMPERED";
  const tone = ok
    ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30"
    : tampered
      ? "border-rose-400 bg-rose-50 dark:bg-rose-950/30"
      : "border-amber-400 bg-amber-50 dark:bg-amber-950/30";
  const icon = ok ? "✅" : tampered ? "❌" : "⚠️";
  const heading = ok
    ? "原本性が確認されました"
    : tampered
      ? "警告: 改ざんが検出されました"
      : "判定不能";

  return (
    <Card className={tone}>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <span aria-hidden>{icon}</span>
          {heading}
          <Badge variant="outline" className="ml-auto">
            {result.kind}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        <p>{result.message}</p>
        {result.result === "OK" && (
          <dl className="grid gap-1 rounded-md border bg-background/60 p-3 text-xs">
            {result.details.proposalTitle && (
              <Row label="提案タイトル" value={result.details.proposalTitle} />
            )}
            {result.details.proposalId && (
              <Row label="提案ID" value={result.details.proposalId} mono />
            )}
            {typeof result.details.signatureCount === "number" && (
              <Row
                label={result.kind === "PDF" ? "報告書記載の署名数" : "発行時点の署名件数"}
                value={`${result.details.signatureCount.toLocaleString()} 件`}
              />
            )}
            {result.details.issuedAt && (
              <Row
                label="発行日時"
                value={fmt.format(new Date(result.details.issuedAt)) + " JST"}
              />
            )}
            {result.details.issuerShortHash && (
              <Row
                label="発行者ID（先頭8文字）"
                value={`${result.details.issuerShortHash}…`}
                mono
              />
            )}
            <Row label="HMAC-SHA256" value={result.details.hmac} mono break />
          </dl>
        )}
        {result.result !== "OK" && result.details?.hmac && (
          <p className="text-xs text-muted-foreground">
            参考: ファイル内の HMAC =
            <code className="ml-1 break-all font-mono">{result.details.hmac}</code>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Row({
  label,
  value,
  mono,
  break: doBreak,
}: {
  label: string;
  value: string;
  mono?: boolean;
  break?: boolean;
}) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={`${mono ? "font-mono" : ""} ${doBreak ? "break-all" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
