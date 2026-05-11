"use client";

import { useActionState, useRef, useState, useEffect } from "react";
import { postCommentAction, type CommentState } from "../actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const initial: CommentState = {};
const MAX = 400;

export function CommentForm({ proposalId }: { proposalId: string }) {
  const [state, action, pending] = useActionState(postCommentAction, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const [text, setText] = useState("");

  // Clear the textarea after a successful post.
  useEffect(() => {
    if (state.ok) {
      setText("");
      formRef.current?.reset();
    }
  }, [state.ok]);

  const remaining = MAX - text.length;
  const overLimit = remaining < 0;

  return (
    <form ref={formRef} action={action} className="grid gap-2">
      <input type="hidden" name="proposalId" value={proposalId} />
      <Textarea
        name="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="この提案について、住民として意見を共有しましょう。建設的な議論を歓迎します。"
        aria-label="コメント本文"
        maxLength={MAX + 50}
        required
      />
      <div className="flex items-center justify-between gap-3">
        <span
          className={`text-xs ${overLimit ? "text-destructive" : "text-muted-foreground"}`}
          aria-live="polite"
        >
          {text.length} / {MAX} 文字
        </span>
        <Button
          type="submit"
          size="sm"
          disabled={pending || text.trim().length === 0 || overLimit}
        >
          {pending ? "投稿中…" : "コメントを投稿"}
        </Button>
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
