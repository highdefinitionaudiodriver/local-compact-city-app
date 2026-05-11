"use client";

import { useActionState, useState } from "react";
import { castVoteAction, type VoteState } from "../actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { VoteType } from "@/lib/constants";

const initial: VoteState = {};

export function IdeaVoteForm({ proposalId }: { proposalId: string }) {
  const [state, action, pending] = useActionState(castVoteAction, initial);

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="proposalId" value={proposalId} />
      <div className="flex gap-2">
        <Button
          type="submit"
          name="voteType"
          value={VoteType.FOR}
          disabled={pending}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          賛成する
        </Button>
        <Button
          type="submit"
          name="voteType"
          value={VoteType.AGAINST}
          disabled={pending}
          variant="outline"
          className="flex-1 border-rose-500 text-rose-700 hover:bg-rose-50 dark:text-rose-300"
        >
          反対する
        </Button>
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state.ok && <p className="text-sm text-emerald-700">記録しました。</p>}
    </form>
  );
}

export function PetitionSignForm({ proposalId }: { proposalId: string }) {
  const [state, action, pending] = useActionState(castVoteAction, initial);
  const [attested, setAttested] = useState(false);

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="proposalId" value={proposalId} />
      <input type="hidden" name="voteType" value={VoteType.SIGN} />
      {/* Hidden value driven by checkbox state. */}
      <input type="hidden" name="attest" value={attested ? "1" : "0"} />

      <label className="flex items-start gap-3 rounded-md border bg-amber-50/60 dark:bg-amber-950/20 p-4">
        <Checkbox
          checked={attested}
          onCheckedChange={(c) => setAttested(c === true)}
          aria-label="住民としての賛同を確認"
          className="mt-0.5"
        />
        <span className="text-sm leading-relaxed">
          私はこの自治体の住民として、本内容に賛同します。
          私のマイナンバーカード認証情報（証明書シリアルのハッシュ値と所属自治体コード）が
          電子署名のエビデンスとして記録されることに同意します。
        </span>
      </label>

      <Button
        type="submit"
        disabled={!attested || pending}
        size="lg"
        className="w-full"
      >
        {pending ? "署名処理中…" : "電子署名する"}
      </Button>

      <p className="text-xs text-muted-foreground">
        ※ 1人につき1回のみ署名できます。署名は取消できません（プロトタイプ仕様）。
      </p>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state.ok && <p className="text-sm text-emerald-700">署名を記録しました。</p>}
    </form>
  );
}
