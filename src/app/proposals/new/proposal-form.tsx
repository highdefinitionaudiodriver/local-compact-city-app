"use client";

import { useActionState, useState } from "react";
import { createProposalAction, type CreateState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ProposalType } from "@/lib/constants";

const initial: CreateState = {};

export function ProposalForm() {
  const [state, formAction, pending] = useActionState(createProposalAction, initial);
  const [type, setType] = useState<string>(ProposalType.IDEA);

  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="grid gap-5">
      <fieldset>
        <legend className="text-sm font-medium mb-2">種別</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          <label
            className={`cursor-pointer rounded-md border p-3 text-sm ${
              type === ProposalType.IDEA ? "border-primary ring-2 ring-primary/30" : "border-input"
            }`}
          >
            <input
              type="radio"
              name="type"
              value={ProposalType.IDEA}
              checked={type === ProposalType.IDEA}
              onChange={() => setType(ProposalType.IDEA)}
              className="sr-only"
            />
            <span className="font-semibold block">まちのアイデア</span>
            <span className="text-muted-foreground text-xs">気軽な改善提案。賛成/反対で意思表示。</span>
          </label>
          <label
            className={`cursor-pointer rounded-md border p-3 text-sm ${
              type === ProposalType.PETITION
                ? "border-primary ring-2 ring-primary/30"
                : "border-input"
            }`}
          >
            <input
              type="radio"
              name="type"
              value={ProposalType.PETITION}
              checked={type === ProposalType.PETITION}
              onChange={() => setType(ProposalType.PETITION)}
              className="sr-only"
            />
            <span className="font-semibold block">正式な署名（請願）</span>
            <span className="text-muted-foreground text-xs">行政提出を前提とした電子署名を集めます。</span>
          </label>
        </div>
      </fieldset>

      <div className="grid gap-2">
        <Label htmlFor="title">タイトル</Label>
        <Input id="title" name="title" required minLength={4} maxLength={120} />
        {fe.title?.[0] && <p className="text-sm text-destructive">{fe.title[0]}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="content">本文</Label>
        <Textarea id="content" name="content" required minLength={20} maxLength={5000} rows={8} />
        {fe.content?.[0] && <p className="text-sm text-destructive">{fe.content[0]}</p>}
      </div>

      {type === ProposalType.PETITION && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="target_signatures">目標署名数</Label>
            <Input
              id="target_signatures"
              name="target_signatures"
              type="number"
              min={1}
              max={1000000}
              defaultValue={500}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="deadline">締切日（任意）</Label>
            <Input id="deadline" name="deadline" type="date" />
          </div>
        </div>
      )}

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "投稿中…" : "投稿する"}
        </Button>
      </div>
    </form>
  );
}
