"use client";

import { useActionState } from "react";
import { updateProposalStatusAction, type StatusState } from "../actions";
import { Button } from "@/components/ui/button";
import { ProposalStatus } from "@/lib/constants";

const initial: StatusState = {};

export function StatusUpdater({
  proposalId,
  current,
}: {
  proposalId: string;
  current: string;
}) {
  const [state, action, pending] = useActionState(
    updateProposalStatusAction,
    initial,
  );

  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="proposalId" value={proposalId} />
      <select
        name="status"
        defaultValue={current}
        className="h-7 rounded-md border bg-background px-2 text-xs"
        aria-label="新しいステータス"
      >
        <option value={ProposalStatus.OPEN}>受付中</option>
        <option value={ProposalStatus.CLOSED}>締切</option>
        <option value={ProposalStatus.SUBMITTED}>行政受付済</option>
      </select>
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "更新中…" : "更新"}
      </Button>
      {state.error && (
        <span className="text-xs text-destructive ml-2">{state.error}</span>
      )}
      {state.ok && <span className="text-xs text-emerald-700 ml-2">✓ 保存</span>}
    </form>
  );
}
