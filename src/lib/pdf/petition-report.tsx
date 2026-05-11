/* eslint-disable jsx-a11y/alt-text */
import path from "node:path";
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import { MUNICIPALITIES } from "@/lib/constants";

// ────────────────────────────────────────────────────────────────────────────
// JAPANESE FONT REGISTRATION
// @react-pdf/renderer's PDF engine cannot subset arbitrary text without an
// explicitly registered TTF/OTF. WITHOUT this block, every CJK glyph would
// silently render as an empty rectangle (so-called "豆腐").
//
// We register Noto Sans JP from a file shipped in /public/fonts. We pass an
// absolute filesystem path so that:
//   - no network fetch happens at request time (works offline / in CI)
//   - we don't depend on the dev server URL being reachable from itself
// ────────────────────────────────────────────────────────────────────────────
const FONT_PATH = path.join(
  process.cwd(),
  "public",
  "fonts",
  "NotoSansJP-Regular.otf",
);

Font.register({
  family: "NotoSansJP",
  src: FONT_PATH,
});

// Hyphenation policy:
//   In @react-pdf/renderer v4, the `hyphens: "none"` style is silently
//   ignored and a forced break inside a single Text fragment ALWAYS inserts
//   a visible "-" glyph. The only reliable workaround for CJK is to feed
//   the line breaker many sibling inline Text fragments, so that breaks
//   happen *between* siblings (a regular run boundary, no hyphen) instead
//   of *within* a single long fragment. The `<Jp>` component below does
//   exactly that for any paragraph it wraps.
Font.registerHyphenationCallback((word) => [word]);

// Render a long CJK / mixed paragraph as a flex-wrap row of small <Text>
// nodes. This sidesteps @react-pdf's line breaker entirely: wrapping is
// performed by the flex layout engine instead, which never inserts a hyphen.
// Each CJK character becomes its own flex item; runs of Latin / digits /
// punctuation are grouped together so English words don't split mid-letter.
// react-pdf's Style typing is recursive (Style | Style[] | (Style|Style[])[]),
// which makes a clean generic helper miserable to type. We accept anything
// the underlying View/Text accept and pass through.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Jp({ children, style }: { children: string; style?: any }) {
  const isCjk = (c: string) => /[　-鿿＀-￯]/.test(c);
  const tokens: string[] = [];
  let buf = "";
  for (const ch of Array.from(children)) {
    if (isCjk(ch)) {
      if (buf) {
        tokens.push(buf);
        buf = "";
      }
      tokens.push(ch);
    } else {
      buf += ch;
    }
  }
  if (buf) tokens.push(buf);
  return (
    <View style={[{ flexDirection: "row", flexWrap: "wrap" }, style]}>
      {tokens.map((t, i) => (
        <Text key={i} style={style}>
          {t}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    fontFamily: "NotoSansJP",
    fontSize: 10.5,
    paddingTop: 48,
    paddingBottom: 64,
    paddingHorizontal: 56,
    color: "#111",
    lineHeight: 1.5,
  },
  headerBar: {
    borderBottom: "1pt solid #333",
    paddingBottom: 8,
    marginBottom: 16,
  },
  documentTag: { fontSize: 9, color: "#555" },
  title: {
    fontSize: 18,
    marginTop: 4,
    fontWeight: 700,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
    fontSize: 9,
    color: "#444",
  },
  section: { marginTop: 18 },
  h2: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 6,
    paddingBottom: 2,
    borderBottom: "0.5pt solid #888",
  },
  proposalBody: {
    fontSize: 10,
    color: "#222",
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  statBox: {
    flex: 1,
    flexDirection: "column",
    border: "0.5pt solid #888",
    padding: 10,
    borderRadius: 4,
  },
  statLabel: { fontSize: 8.5, color: "#555", lineHeight: 1.2 },
  statValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 6,
  },
  statValue: { fontSize: 18, fontWeight: 700, lineHeight: 1.2 },
  statValueUnit: { fontSize: 9, color: "#444", marginLeft: 3, lineHeight: 1.2 },
  statHint: { fontSize: 8.5, color: "#666", marginTop: 6, lineHeight: 1.2 },
  evidenceBox: {
    marginTop: 18,
    border: "1pt solid #1f2937",
    backgroundColor: "#f3f4f6",
    padding: 12,
    borderRadius: 4,
  },
  evidenceTitle: { fontSize: 11, fontWeight: 700, marginBottom: 4 },
  evidenceText: { fontSize: 9.5, color: "#111", lineHeight: 1.6 },
  table: {
    marginTop: 6,
    border: "0.5pt solid #aaa",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#eee",
  },
  tableRow: {
    flexDirection: "row",
    borderTop: "0.5pt solid #ccc",
  },
  th: {
    padding: 4,
    fontSize: 9,
    fontWeight: 700,
  },
  td: {
    padding: 4,
    fontSize: 9,
  },
  colMuni: { flex: 3 },
  colCount: { flex: 1, textAlign: "right" },
  colPct: { flex: 1, textAlign: "right" },
  footer: {
    position: "absolute",
    left: 56,
    right: 56,
    bottom: 18,
    paddingTop: 6,
    borderTop: "0.5pt solid #aaa",
    fontSize: 8.5,
    color: "#555",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerHmac: {
    fontSize: 7.5,
    color: "#555",
    marginTop: 2,
    // Intentionally NOT setting fontFamily: "Courier" here — Courier has no
    // CJK glyphs, so the Japanese label "文書検証用ハッシュ" was rendering
    // as missing-glyph squares. The hash itself is rendered with a Courier
    // child <Text> below so the hex string still looks monospaced.
  },
  footerHash: {
    fontFamily: "Courier",
  },
});

export type PetitionReportData = {
  proposalId: string;
  title: string;
  content: string;
  createdAt: Date;
  deadline: Date | null;
  residentCode: string;
  status: string;
  targetSignatures: number;
  totalSignatures: number;
  verifiedCount: number; // currently always == total in our model
  localSignerCount: number;
  muniBreakdown: { code: string; count: number }[];
  firstSignatureAt: Date | null;
  lastSignatureAt: Date | null;
  /**
   * The exact issuance instant printed on the document. Bound here (rather
   * than computed inside the component) so the route handler can hash this
   * same value and produce a verifiable HMAC.
   */
  issuedAt: Date;
  /**
   * HMAC-SHA256 (hex) of a canonical JSON of the substantive fields on this
   * report, computed by the route handler with EXPORT_HMAC_SECRET. The
   * receiving authority can recompute and compare to detect tampering.
   */
  hmac: string;
};

/**
 * Build the canonical payload that the HMAC is computed over. Kept in the
 * report module so the producing route and any future verifier import the
 * same shape and never drift.
 */
export function buildHmacPayload(d: PetitionReportData): {
  v: number;
  proposalId: string;
  title: string;
  status: string;
  residentCode: string;
  targetSignatures: number;
  totalSignatures: number;
  verifiedCount: number;
  localSignerCount: number;
  firstSignatureAt: string | null;
  lastSignatureAt: string | null;
  issuedAt: string;
} {
  return {
    v: 1,
    proposalId: d.proposalId,
    title: d.title,
    status: d.status,
    residentCode: d.residentCode,
    targetSignatures: d.targetSignatures,
    totalSignatures: d.totalSignatures,
    verifiedCount: d.verifiedCount,
    localSignerCount: d.localSignerCount,
    firstSignatureAt: d.firstSignatureAt ? d.firstSignatureAt.toISOString() : null,
    lastSignatureAt: d.lastSignatureAt ? d.lastSignatureAt.toISOString() : null,
    issuedAt: d.issuedAt.toISOString(),
  };
}

const fmtJST = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});
const fmtJSTDate = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const statusLabel: Record<string, string> = {
  OPEN: "受付中",
  CLOSED: "締切",
  SUBMITTED: "行政受付済",
};

export function PetitionReport({ data }: { data: PetitionReportData }) {
  const muniName = MUNICIPALITIES[data.residentCode] ?? data.residentCode;
  const targetPct =
    data.targetSignatures > 0
      ? Math.min(100, Math.round((data.totalSignatures / data.targetSignatures) * 100))
      : 0;
  const verifiedPct =
    data.totalSignatures > 0
      ? Math.round((data.verifiedCount / data.totalSignatures) * 100)
      : 0;
  const localPct =
    data.totalSignatures > 0
      ? Math.round((data.localSignerCount / data.totalSignatures) * 100)
      : 0;
  const issuedAt = fmtJST.format(data.issuedAt) + " JST";

  return (
    <Document
      title={`住民提案デジタル署名 最終報告書 ${data.title}`}
      author="ローカルコンパクトシティ・住民提案システム"
      subject="JPKI 認証済み電子署名エビデンス"
      // Machine-readable HMAC reference embedded into PDF keywords metadata.
      // The verifier (`/admin/verify`) uses pdf-lib to parse this back out
      // without having to OCR the rendered footer.
      keywords={`hmac=${data.hmac};proposalId=${data.proposalId};issuedAt=${data.issuedAt.toISOString()}`}
    >
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.headerBar}>
          <Text style={styles.documentTag}>
            {muniName}　|　住民提案・デジタル署名プラットフォーム
          </Text>
          <Text style={styles.title}>住民提案（請願） デジタル署名 最終報告書</Text>
          <View style={styles.metaRow}>
            <Text>提案ID: {data.proposalId}</Text>
            <Text>ステータス: {statusLabel[data.status] ?? data.status}</Text>
            <Text>発行日時: {issuedAt}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>1. 提案概要</Text>
          <Text style={[styles.proposalBody, { fontWeight: 700 }]}>{data.title}</Text>
          <View style={[styles.metaRow, { marginTop: 4 }]}>
            <Text>投稿日: {fmtJSTDate.format(data.createdAt)}</Text>
            {data.deadline && <Text>締切: {fmtJSTDate.format(data.deadline)}</Text>}
            <Text>対象自治体: {muniName}</Text>
          </View>
          <Jp style={[styles.proposalBody, { marginTop: 8 }]}>{data.content}</Jp>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>2. 署名結果サマリー</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>有効署名数</Text>
              <View style={styles.statValueRow}>
                <Text style={styles.statValue}>
                  {data.totalSignatures.toLocaleString()}
                </Text>
                <Text style={styles.statValueUnit}>筆</Text>
              </View>
              <Text style={styles.statHint}>
                目標 {data.targetSignatures.toLocaleString()} 筆
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>目標達成率</Text>
              <View style={styles.statValueRow}>
                <Text style={styles.statValue}>{targetPct}</Text>
                <Text style={styles.statValueUnit}>%</Text>
              </View>
              <Text style={styles.statHint}>
                {data.totalSignatures.toLocaleString()} /{" "}
                {data.targetSignatures.toLocaleString()}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>JPKI認証済み率</Text>
              <View style={styles.statValueRow}>
                <Text style={styles.statValue}>{verifiedPct}</Text>
                <Text style={styles.statValueUnit}>%</Text>
              </View>
              <Text style={styles.statHint}>
                {data.verifiedCount} / {data.totalSignatures}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>地元住民率</Text>
              <View style={styles.statValueRow}>
                <Text style={styles.statValue}>{localPct}</Text>
                <Text style={styles.statValueUnit}>%</Text>
              </View>
              <Text style={styles.statHint}>
                {data.localSignerCount} / {data.totalSignatures}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>3. 自治体別 内訳</Text>
          {data.muniBreakdown.length === 0 ? (
            <Text style={styles.proposalBody}>署名はまだありません。</Text>
          ) : (
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.th, styles.colMuni]}>自治体</Text>
                <Text style={[styles.th, styles.colCount]}>署名数</Text>
                <Text style={[styles.th, styles.colPct]}>割合</Text>
              </View>
              {data.muniBreakdown.map((row) => {
                const pct =
                  data.totalSignatures > 0
                    ? Math.round((row.count / data.totalSignatures) * 100)
                    : 0;
                const name = MUNICIPALITIES[row.code] ?? row.code;
                const isHome = row.code === data.residentCode;
                return (
                  <View key={row.code} style={styles.tableRow}>
                    <Text style={[styles.td, styles.colMuni]}>
                      {name}
                      {isHome ? "（地元）" : ""}
                    </Text>
                    <Text style={[styles.td, styles.colCount]}>
                      {row.count.toLocaleString()}
                    </Text>
                    <Text style={[styles.td, styles.colPct]}>{pct}%</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>4. 署名期間</Text>
          <Text style={styles.proposalBody}>
            初回署名: {data.firstSignatureAt ? fmtJST.format(data.firstSignatureAt) + " JST" : "—"}
          </Text>
          <Text style={styles.proposalBody}>
            最終署名: {data.lastSignatureAt ? fmtJST.format(data.lastSignatureAt) + " JST" : "—"}
          </Text>
        </View>

        <View style={styles.evidenceBox}>
          <Text style={styles.evidenceTitle}>セキュリティ証明</Text>
          <Jp style={styles.evidenceText}>
            本報告書の署名数は、すべてマイナンバーカード（JPKI）による公的個人認証を経た、居住確認済みの有効な住民署名であることをシステムが証明します。
          </Jp>
          <Jp style={[styles.evidenceText, { marginTop: 6, color: "#444" }]}>
            ・各署名は署名用電子証明書のシリアル番号（SHA-256ハッシュ）で一意に識別され、同一人物による重複署名はデータベースの一意制約により防止されています。
          </Jp>
          <Jp style={[styles.evidenceText, { color: "#444" }]}>
            ・本報告書には個人を特定可能な情報（氏名・住所・マイナンバー等）は一切含まれていません。
          </Jp>
        </View>

        <View style={styles.footer} fixed>
          <View style={styles.footerRow}>
            <Text>
              ローカルコンパクトシティ・住民提案システム ／ 発行: {issuedAt}
            </Text>
            <Text
              render={({ pageNumber, totalPages }) =>
                `${pageNumber} / ${totalPages}`
              }
            />
          </View>
          <Text style={styles.footerHmac}>
            文書検証用ハッシュ (HMAC-SHA256):{" "}
            <Text style={styles.footerHash}>{data.hmac}</Text>
          </Text>
        </View>
      </Page>
    </Document>
  );
}
