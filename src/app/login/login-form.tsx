"use client";

import { useState, useTransition, useEffect } from "react";
import { jpkiLoginAction } from "./actions";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { MUNICIPALITIES } from "@/lib/constants";

// `import type` keeps the heavy node:crypto dependency of jpki-mock.ts out
// of the client bundle while still letting us share the persona shape.
import type { JpkiPersona, PersonaCategory } from "@/lib/jpki-mock";

const CAT_LABEL: Record<PersonaCategory, string> = {
  RESIDENT: "区内住民",
  OUTSIDE: "区外住民",
  STAFF: "自治体職員",
};

/** What the picker shows: anonymous label only, not display_name. */
export type PersonaPublic = Pick<
  JpkiPersona,
  "key" | "category" | "anonymous_label" | "display_name" | "resident_code"
>;

type Stage = "idle" | "reading" | "revealed" | "submitting";

const READER_STEPS: { ms: number; label: string }[] = [
  { ms: 350, label: "カードを検出しました" },
  { ms: 950, label: "PIN を検証中（モック: 自動入力）..." },
  { ms: 1500, label: "署名用電子証明書を読み取り中..." },
  { ms: 1850, label: "認証完了" },
];

export function LoginForm({ personas }: { personas: PersonaPublic[] }) {
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [stage, setStage] = useState<Stage>("idle");
  const [completedSteps, setCompletedSteps] = useState<number>(0);
  const [, startTransition] = useTransition();

  const grouped: Record<PersonaCategory, PersonaPublic[]> = {
    RESIDENT: [],
    OUTSIDE: [],
    STAFF: [],
  };
  for (const p of personas) grouped[p.category].push(p);

  const selected = personas.find((p) => p.key === selectedKey);

  // Reader animation timeline. We pause at the "revealed" stage and wait
  // for the operator to confirm the identity by clicking the explicit
  // "ログインしてダッシュボードへ" button. This deliberate hand-off is
  // important during demos: the audience needs a clear beat to register
  // that authentication succeeded before the screen changes.
  useEffect(() => {
    if (stage !== "reading") return;
    setCompletedSteps(0);
    const timers: ReturnType<typeof setTimeout>[] = [];
    READER_STEPS.forEach((step, idx) => {
      timers.push(
        setTimeout(() => setCompletedSteps(idx + 1), step.ms),
      );
    });
    timers.push(
      setTimeout(() => setStage("revealed"), READER_STEPS.at(-1)!.ms + 200),
    );
    return () => timers.forEach(clearTimeout);
  }, [stage]);

  function confirmAndLogin() {
    if (!selectedKey || stage !== "revealed") return;
    setStage("submitting");
    const fd = new FormData();
    fd.set("personaKey", selectedKey);
    startTransition(() => {
      // Server Action triggers redirect to "/", which navigates away
      // from this component — no further state changes needed.
      jpkiLoginAction(fd);
    });
  }

  function reset() {
    setStage("idle");
    setCompletedSteps(0);
    setSelectedKey("");
  }

  if (stage === "idle") {
    return (
      <div className="grid gap-4">
        <div className="grid gap-2">
          <label htmlFor="persona" className="text-sm font-medium">
            🪪 読み取りカードを選択
          </label>
          <Select value={selectedKey} onValueChange={(v) => setSelectedKey(v ?? "")}>
            <SelectTrigger id="persona" className="w-full">
              <SelectValue placeholder="ペルソナを選択..." />
            </SelectTrigger>
            <SelectContent>
              {(["RESIDENT", "OUTSIDE", "STAFF"] as PersonaCategory[]).map(
                (cat) => {
                  const list = grouped[cat];
                  if (list.length === 0) return null;
                  return (
                    <SelectGroup key={cat}>
                      <SelectLabel>{CAT_LABEL[cat]}</SelectLabel>
                      {list.map((p) => (
                        <SelectItem key={p.key} value={p.key}>
                          <span className="font-medium">{p.anonymous_label}</span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            {MUNICIPALITIES[p.resident_code] ?? p.resident_code}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  );
                },
              )}
            </SelectContent>
          </Select>
        </div>

        <Button
          type="button"
          size="lg"
          className="w-full"
          disabled={!selectedKey}
          onClick={() => setStage("reading")}
        >
          ── カードを読み取る ──
        </Button>

        <p className="text-xs text-muted-foreground">
          ※ 名前と認証情報はカード読み取りの完了後にのみ表示されます。
        </p>
      </div>
    );
  }

  // Reader animation / revealed identity / submitting all share the same
  // full-card visual — only the line content shifts.
  return (
    <div className="grid gap-4 rounded-md border bg-muted/30 px-4 py-6">
      <div className="flex items-center gap-3">
        <CardIcon spinning={stage === "reading" || stage === "submitting"} />
        <div>
          <p className="font-semibold">
            {stage === "reading" && "カード読み取り中..."}
            {stage === "revealed" && "認証完了"}
            {stage === "submitting" && "セッションを開始しています..."}
          </p>
          <p className="text-xs text-muted-foreground">
            {selected && MUNICIPALITIES[selected.resident_code]} ・{" "}
            {selected?.anonymous_label}
          </p>
        </div>
      </div>

      <ol className="grid gap-1.5 text-sm">
        {READER_STEPS.map((s, i) => {
          const done = completedSteps > i;
          const active = completedSteps === i && stage === "reading";
          return (
            <li
              key={i}
              className={`flex items-center gap-2 ${
                done ? "text-foreground" : active ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              <span
                aria-hidden
                className={`inline-flex size-4 items-center justify-center rounded-full text-[10px] ${
                  done
                    ? "bg-emerald-500 text-white"
                    : active
                      ? "bg-primary/30 text-primary animate-pulse"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {done ? "✓" : "•"}
              </span>
              <span>{s.label}</span>
            </li>
          );
        })}
      </ol>

      {stage !== "reading" && selected && (
        <div className="mt-2 rounded-md border-2 border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-4">
          <p className="text-xs text-muted-foreground">
            ✅ JPKI 認証成功 — 読み取った氏名
          </p>
          <p className="mt-1 text-2xl font-bold tracking-wide">
            {selected.display_name} <span className="text-base text-muted-foreground">さん</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {MUNICIPALITIES[selected.resident_code]} の住民であることを
            マイナンバーカードの署名用電子証明書で確認しました。
          </p>
        </div>
      )}

      {stage === "revealed" && (
        <div className="mt-1 grid gap-2">
          <Button
            type="button"
            size="lg"
            className="w-full"
            onClick={confirmAndLogin}
            autoFocus
          >
            ログインしてダッシュボードへ →
          </Button>
          <button
            type="button"
            onClick={reset}
            className="text-xs text-muted-foreground hover:text-foreground hover:underline self-center"
          >
            もう一度カードを読み取り直す
          </button>
        </div>
      )}

      {stage === "submitting" && (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          セッションを確立しています...
        </p>
      )}
    </div>
  );
}

function CardIcon({ spinning }: { spinning: boolean }) {
  return (
    <span
      aria-hidden
      className={`text-3xl ${spinning ? "animate-pulse" : ""}`}
    >
      🪪
    </span>
  );
}
