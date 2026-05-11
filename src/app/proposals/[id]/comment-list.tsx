import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export type CommentItem = {
  id: string;
  text: string;
  created_at: Date;
};

const fmt = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function relative(date: Date): string {
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "たった今";
  if (m < 60) return `${m}分前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}時間前`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}日前`;
  return fmt.format(date);
}

export function CommentList({ comments }: { comments: CommentItem[] }) {
  if (comments.length === 0) {
    return (
      <p className="rounded-md border border-dashed bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
        まだコメントはありません。最初の発言をしてみましょう。
      </p>
    );
  }
  return (
    <ul className="grid gap-3">
      {comments.map((c) => (
        <li
          key={c.id}
          className="flex gap-3 rounded-md border bg-card px-4 py-3"
        >
          <Avatar className="size-9 shrink-0" aria-hidden>
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              住民
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-sm font-medium">ある住民</span>
              <span className="text-xs text-muted-foreground">認証済み</span>
              <span
                className="ml-auto text-xs text-muted-foreground"
                title={fmt.format(c.created_at) + " JST"}
              >
                {relative(c.created_at)}
              </span>
            </div>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed">
              {c.text}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
