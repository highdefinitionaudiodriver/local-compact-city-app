import path from "node:path";
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";

// Register Japanese Font
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

Font.registerHyphenationCallback((word) => [word]);

// Helper component to fix react-pdf line wrapping issues for CJK
function Jp({ children, style }: { children: string; style?: Style | Style[] }) {
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
    fontSize: 9.5,
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 48,
    color: "#1f2937",
    lineHeight: 1.4,
  },
  header: {
    borderBottom: "2pt solid #10b981", // Emerald color theme
    paddingBottom: 8,
    marginBottom: 16,
  },
  tagline: {
    fontSize: 8.5,
    color: "#059669",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 20,
    marginTop: 4,
    fontWeight: 900,
    color: "#065f46",
  },
  subtitle: {
    fontSize: 11,
    color: "#4b5563",
    marginTop: 2,
  },
  section: {
    marginTop: 14,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: "#0f766e",
    borderLeft: "3pt solid #10b981",
    paddingLeft: 6,
    marginBottom: 6,
  },
  grid: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  card: {
    flex: 1,
    border: "0.5pt solid #d1d5db",
    borderRadius: 4,
    padding: 8,
    backgroundColor: "#f9fafb",
  },
  cardTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: "#111827",
    marginBottom: 4,
  },
  cardText: {
    fontSize: 8.5,
    color: "#4b5563",
  },
  table: {
    marginTop: 4,
    border: "0.5pt solid #d1d5db",
    borderRadius: 4,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#10b981",
    color: "#ffffff",
    fontWeight: 700,
  },
  tableRow: {
    flexDirection: "row",
    borderTop: "0.5pt solid #e5e7eb",
  },
  th: {
    padding: 6,
    fontSize: 9,
  },
  td: {
    padding: 6,
    fontSize: 8.5,
  },
  col1: { flex: 1.2, borderRight: "0.5pt solid #d1d5db" },
  col2: { flex: 2 },
  bulletList: {
    marginTop: 4,
    paddingLeft: 10,
  },
  bulletItem: {
    flexDirection: "row",
    marginBottom: 3,
  },
  bulletDot: {
    width: 8,
    fontSize: 8.5,
    color: "#10b981",
  },
  bulletText: {
    flex: 1,
    fontSize: 8.5,
    color: "#374151",
  },
  highlightBox: {
    backgroundColor: "#ecfdf5",
    border: "0.5pt solid #a7f3d0",
    padding: 10,
    borderRadius: 4,
    marginTop: 6,
  },
  highlightText: {
    fontSize: 8.5,
    color: "#065f46",
    lineHeight: 1.4,
  },
  footer: {
    position: "absolute",
    left: 48,
    right: 48,
    bottom: 24,
    borderTop: "0.5pt solid #d1d5db",
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: "#6b7280",
  },
  contactLink: {
    color: "#059669",
    fontWeight: 700,
  },
});

export function BrochureReport() {
  return (
    <Document
      title="住民提案・デジタル署名プラットフォーム 自治体向けパンフレット"
      author="ローカルコンパクトシティ"
      subject="自治体DX・住民参加型合意形成ツール"
      keywords="住民提案, デジタル署名, JPKI, 自治体DX, 請願, 電子署名"
    >
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.tagline}>Local Compact City DX Platform</Text>
          <Text style={styles.title}>住民提案・デジタル署名プラットフォーム</Text>
          <Text style={styles.subtitle}>
            マイナンバーカード（JPKI）で住民の総意を安全に可視化し、議会と行政をつなぐ
          </Text>
        </View>

        {/* Section 1: 課題と解決 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>なぜ今、住民提案のデジタル化が必要か</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, styles.col1]}>現状の課題</Text>
              <Text style={[styles.th, styles.col2, { borderRight: 0 }]}>解決される自治体の負担・メリット</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.td, styles.col1]}>紙の請願は集計・保管・電子化が大変</Text>
              <View style={[styles.td, styles.col2]}>
                <Jp style={styles.cardText}>
                  署名データはデジタルで自動集計され、A4 PDFレポートやExcel CSV形式で一発出力。仕分けや管理の事務コストを極小化します。
                </Jp>
              </View>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.td, styles.col1]}>ネット署名等は「本人確認」が無い</Text>
              <View style={[styles.td, styles.col2]}>
                <Jp style={styles.cardText}>
                  公的個人認証（JPKI）に基づき居住確認された有効な住民署名のみを担保。二重投票防止やハッシュ化保存で、公文書として扱える品質を確保。
                </Jp>
              </View>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.td, styles.col1]}>議会提出用データに「熱量」が無い</Text>
              <View style={[styles.td, styles.col2]}>
                <Jp style={styles.cardText}>
                  時系列グラフや自治体別内訳など、請願の加速タイミングや地元居住率の割合を定量分析でき、合意形成のための説得資料として活用可能です。
                </Jp>
              </View>
            </View>
          </View>
        </View>

        {/* Section 2: プラットフォームが解決すること */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>本プラットフォームの3大特徴</Text>
          <View style={styles.grid}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>1. 公文書品質の証明と改ざん検知</Text>
              <Jp style={styles.cardText}>
                HMAC-SHA256ハッシュを埋め込んだPDFレポートを出力。受取側は専用ページで改ざんの有無を1秒で検証でき、偽造やデータの書き換えをシャットアウトします。
              </Jp>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>2. 安全なJPKI・マイナンバー運用</Text>
              <Jp style={styles.cardText}>
                個人情報（氏名・住所等）はハッシュ化して安全に処理。マイナンバー本体は取得せず、PIN（暗証番号）が外部ネットに出ない完全ローカル動作設計です。
              </Jp>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>3. リアルタイム統計と監査ログ</Text>
              <Jp style={styles.cardText}>
                ダッシュボードで時系列推移や地域比率を円グラフ可視化。「いつ・誰が（管理者等）・何を変更したか」を改ざん不可能な追加専用ログで追跡できます。
              </Jp>
            </View>
          </View>
        </View>

        {/* Section 3: 導入シナリオ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>選べる導入・実証シナリオ</Text>
          <View style={styles.bulletList}>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletDot}>•</Text>
              <View style={styles.bulletText}>
                <Text style={{ fontWeight: 700, color: "#111827" }}>シナリオ A：住民請願プラットフォームとして本格運用</Text>
                <Jp style={{ marginTop: 2, color: "#4b5563" }}>
                  自治体公式サイトに設置し、一定署名数（例：人口の 1% 以上）で自動的に議会へ付託。傍聴や住民説明会と連動した民主的な合意形成に。
                </Jp>
              </View>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletDot}>•</Text>
              <View style={styles.bulletText}>
                <Text style={{ fontWeight: 700, color: "#111827" }}>シナリオ B：特定地域・テーマでの実証実験（PoC）</Text>
                <Jp style={{ marginTop: 2, color: "#4b5563" }}>
                  「中心市街地活性化」や「地域課題解決」などテーマを限定して3ヶ月間テスト運用。効果測定後に本格的なシステム導入判断を行えます。
                </Jp>
              </View>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletDot}>•</Text>
              <View style={styles.bulletText}>
                <Text style={{ fontWeight: 700, color: "#111827" }}>シナリオ C：職員・議員向け簡易デモ実演（実費不要）</Text>
                <Jp style={{ marginTop: 2, color: "#4b5563" }}>
                  ノートPC1台で住民役と役所役のロールプレイ動作、およびPDF改ざん検知の仕組みをその場で体感できる10分間のデモ実演を実施します。
                </Jp>
              </View>
            </View>
          </View>
        </View>

        {/* Technical specs / Highlight Box */}
        <View style={styles.highlightBox}>
          <Text style={{ fontSize: 9.5, fontWeight: 700, color: "#065f46", marginBottom: 3 }}>
            行政・議会稟議に強い技術スペック
          </Text>
          <Jp style={styles.highlightText}>
            Next.js 16 (App Router) / TypeScript / Tailwind CSS / Prisma + SQLite（自治体内クローズド運用に対応）。
            署名PDF生成には @react-pdf/renderer を採用し、Noto Sans JP を内蔵して文字化けを防止。
            ソースコードは MIT ライセンス（OSS）にて完全公開されており、セキュリティ監査や改変も自由に行えます。
          </Jp>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>住民提案・デジタル署名システム 「ローカルコンパクトシティ」 パンフレット</Text>
          <Text>
            お問い合わせ: <Text style={styles.contactLink}>highdefinitionaudiodriver@gmail.com</Text>
          </Text>
        </View>
      </Page>
    </Document>
  );
}
