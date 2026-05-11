"use client";

import { Button } from "@/components/ui/button";

export function PrintClient() {
  return (
    <Button variant="outline" onClick={() => window.print()}>
      🖨 このエビデンスを印刷 / PDF 保存
    </Button>
  );
}
