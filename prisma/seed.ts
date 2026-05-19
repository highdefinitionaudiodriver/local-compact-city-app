import { PrismaClient } from "@prisma/client";
import { createHash } from "crypto";

const prisma = new PrismaClient();

const hash = (s: string) => createHash("sha256").update(s).digest("hex");

// ────────────────────────────────────────────────────────────────────────────
// Multi-tenant seed.
//
// Each proposal is anchored to a real-looking municipality and authored by
// the corresponding mock JPKI persona. seedPetitionActivity then fabricates
// ~weeks of signature activity using strictly LOCAL fake citizens, so the
// "same-municipality only" rule the production app now enforces is never
// violated by the seed itself. Older Chiyoda data carries some cross-muni
// signers from before that policy existed — that's intentional historical
// noise that gives the analytics pie charts more visual variety.
// ────────────────────────────────────────────────────────────────────────────

type SeedAuthor = {
  serial: string;
  display_name: string;
  resident_code: string;
};

const AUTHORS: Record<string, SeedAuthor> = {
  chiyoda: {
    serial: "JPKI-MOCK-CERT-CHIYODA-A-0001",
    display_name: "山田 太郎",
    resident_code: "131016",
  },
  morioka: {
    serial: "JPKI-MOCK-CERT-MORIOKA-A-0006",
    display_name: "佐々木 拓也",
    resident_code: "132012",
  },
  osaka: {
    serial: "JPKI-MOCK-CERT-OSAKA-A-0005",
    display_name: "高橋 美咲",
    resident_code: "271004",
  },
  minato: {
    serial: "JPKI-MOCK-CERT-MINATO-A-0004",
    display_name: "田中 次郎",
    resident_code: "131032",
  },
  // ── 自治体追加: 提案多様性のため ─────────────────────────────────
  kyoto: {
    serial: "JPKI-MOCK-CERT-KYOTO-A-0007",
    display_name: "中川 千夏",
    resident_code: "261009",
  },
  fukuoka: {
    serial: "JPKI-MOCK-CERT-FUKUOKA-A-0008",
    display_name: "緒方 直人",
    resident_code: "401307",
  },
  sapporo: {
    serial: "JPKI-MOCK-CERT-SAPPORO-A-0009",
    display_name: "宮原 和歌",
    resident_code: "011002",
  },
  sendai: {
    serial: "JPKI-MOCK-CERT-SENDAI-A-0010",
    display_name: "三浦 健介",
    resident_code: "041009",
  },
};

type SeedProposal = {
  id: string;
  authorKey: keyof typeof AUTHORS;
  resident_code: string;
  title: string;
  content: string;
  type: "IDEA" | "PETITION";
  target_signatures: number;
  /** If set, mock-seed roughly this many SIGN votes from local citizens. */
  seedSignatures?: number;
};

const PROPOSALS: SeedProposal[] = [
  // ── 千代田区 (existing) ─────────────────────────────────────────────
  {
    id: "seed-library-hours",
    authorKey: "chiyoda",
    resident_code: "131016",
    title: "千代田区立図書館の開館時間を平日21時まで延長",
    content:
      "共働き世帯や学生にとって、平日19時閉館は実質利用が難しくなっています。\n人件費・運営コストの試算を含めた段階的な実証実験から始めることを提案します。",
    type: "IDEA",
    target_signatures: 0,
  },
  {
    id: "seed-bike-lane",
    authorKey: "chiyoda",
    resident_code: "131016",
    title: "皇居外周の自転車レーン整備に関する請願",
    content:
      "通勤・健康増進に伴い自転車利用が増加しているなか、歩行者と自転車の動線が交錯し危険な状況が常態化しています。\n本請願は、皇居外周の歩道と車道の境界に物理的に分離された自転車レーンを整備することを区および関係機関に求めるものです。",
    type: "PETITION",
    target_signatures: 500,
    seedSignatures: 300,
  },
  {
    id: "seed-ev-trucks",
    authorKey: "chiyoda",
    resident_code: "131016",
    title: "ごみ収集車の電動化スケジュール公表を求める請願",
    content:
      "脱炭素社会の実現に向け、区が委託するごみ収集車のEV化計画を、年度ごとの台数目標と合わせて公表することを求めます。",
    type: "PETITION",
    target_signatures: 300,
    seedSignatures: 180,
  },
  // ── 岩手県盛岡市 (new) ─────────────────────────────────────────────
  {
    id: "seed-morioka-bus",
    authorKey: "morioka",
    resident_code: "132012",
    title: "盛岡バスセンター周辺の歩行者天国化に関する請願",
    content:
      "コンパクトシティ政策の中核として、盛岡バスセンター周辺の中心市街地を週末の歩行者天国とすることで、地域経済と賑わいの再生を図ります。\n本請願は、商店街・交通事業者・市民の協議会設置と、社会実験の実施を市に求めるものです。",
    type: "PETITION",
    target_signatures: 500,
    seedSignatures: 220,
  },
  {
    id: "seed-morioka-snow",
    authorKey: "morioka",
    resident_code: "132012",
    title: "高齢者世帯への除雪支援拡充を求める請願",
    content:
      "盛岡市は豪雪地帯であり、独居高齢者世帯にとって冬季の除雪は生命線に関わる課題です。\n地域コミュニティと市が協働した除雪支援制度の予算拡充を求めます。",
    type: "PETITION",
    target_signatures: 300,
    seedSignatures: 95,
  },
  // ── 大阪府大阪市 (new) ─────────────────────────────────────────────
  {
    id: "seed-osaka-park",
    authorKey: "osaka",
    resident_code: "271004",
    title: "中之島周辺の緑地化と歩行者導線の再整備に関する請願",
    content:
      "中之島はビジネス街と文化施設が共存する地域でありながら、緑地が極端に少ないことが課題です。\n回遊性のある緑地ネットワークの整備と、車中心から人中心への動線再設計を求めます。",
    type: "PETITION",
    target_signatures: 600,
    seedSignatures: 410,
  },
  // ── 東京都港区 (new) ───────────────────────────────────────────────
  {
    id: "seed-minato-crossing",
    authorKey: "minato",
    resident_code: "131032",
    title: "六本木交差点の横断歩道デザイン見直し",
    content:
      "通行量の多い六本木交差点で、夜間の視認性が低く歩行者事故が多発しています。\n発光型誘導サインや色分け塗装などのデザイン改善を提案します。",
    type: "IDEA",
    target_signatures: 0,
  },

  // ────────────────────────────────────────────────────────────────
  //  追加：デモのリアル感向上のための提案群（合計 20 件に拡充）
  //  教育・交通・環境・福祉・防災・DX・文化 の 7 ジャンルに横断
  // ────────────────────────────────────────────────────────────────

  // ── 千代田区 追加 ───────────────────────────────────────────────
  {
    id: "seed-chiyoda-wifi",
    authorKey: "chiyoda",
    resident_code: "131016",
    title: "区内公衆無線LANの整備拡充を求める請願",
    content:
      "観光客のみならず、災害時の通信手段確保の観点からも、区内公共施設・主要交差点周辺の公衆無線LANの拡充は急務です。\n本請願は、設置箇所の年度別計画と予算配分を区議会で公開協議することを求めます。",
    type: "PETITION",
    target_signatures: 400,
    seedSignatures: 168,
  },
  {
    id: "seed-chiyoda-bus",
    authorKey: "chiyoda",
    resident_code: "131016",
    title: "コミュニティバス「風ぐるま」のフリーパス制度提案",
    content:
      "区内コミュニティバスの利用促進と、高齢者・子育て世帯の移動支援を目的に、年間 6,000 円程度のフリーパス制度の導入を提案します。",
    type: "IDEA",
    target_signatures: 0,
  },

  // ── 盛岡市 追加 ─────────────────────────────────────────────────
  {
    id: "seed-morioka-startup",
    authorKey: "morioka",
    resident_code: "132012",
    title: "中心市街地への学生創業支援センター誘致提案",
    content:
      "盛岡市の人口流出対策として、岩手大学・盛岡大学等の学生が起業しやすい環境整備が必要です。\n中心市街地の空き店舗を活用した創業支援センターの設置を提案します。",
    type: "IDEA",
    target_signatures: 0,
  },
  {
    id: "seed-morioka-flood",
    authorKey: "morioka",
    resident_code: "132012",
    title: "中津川・北上川流域の防災避難計画見直し請願",
    content:
      "近年の気候変動に伴う豪雨災害の頻発を踏まえ、中津川・北上川合流地点周辺の浸水想定区域と避難計画の全面見直しを求めます。\n特に高齢者世帯への個別避難計画 (個別避難計画) の策定支援を要望します。",
    type: "PETITION",
    target_signatures: 400,
    seedSignatures: 245,
  },

  // ── 大阪市 追加 ─────────────────────────────────────────────────
  {
    id: "seed-osaka-bike",
    authorKey: "osaka",
    resident_code: "271004",
    title: "御堂筋の自転車専用道整備に関する請願",
    content:
      "大阪都心部の脱炭素・健康増進のため、御堂筋全長にわたる物理分離型の自転車専用道の整備を求めます。\n商店街への配慮として、夜間時間帯の貨物用車線との共用も併せて検討対象とします。",
    type: "PETITION",
    target_signatures: 800,
    seedSignatures: 522,
  },
  {
    id: "seed-osaka-aitranslate",
    authorKey: "osaka",
    resident_code: "271004",
    title: "AI 翻訳機の観光案内所への配備提案",
    content:
      "大阪万博後のインバウンド観光継続を見据え、主要観光案内所への音声 AI 翻訳機の配備を提案します。多言語対応スタッフの人件費削減と観光客満足度向上を両立できます。",
    type: "IDEA",
    target_signatures: 0,
  },

  // ── 港区 追加 ───────────────────────────────────────────────────
  {
    id: "seed-minato-kodomo",
    authorKey: "minato",
    resident_code: "131032",
    title: "子ども食堂への財政支援拡充を求める請願",
    content:
      "区内の子ども食堂運営団体への安定的な財政支援の制度化を求めます。\n単年度補助ではなく、3 年度ごとの中期計画として位置づけることで、運営団体の人材確保・場所確保を可能にします。",
    type: "PETITION",
    target_signatures: 500,
    seedSignatures: 312,
  },

  // ── 京都市 ─────────────────────────────────────────────────────
  {
    id: "seed-kyoto-minpaku",
    authorKey: "kyoto",
    resident_code: "261009",
    title: "観光地周辺の民泊規制強化を求める請願",
    content:
      "オーバーツーリズム問題の深刻化を受け、清水寺・祇園・嵐山等の主要観光地周辺における民泊施設の新規認可基準の引き上げ、騒音・ゴミ問題への近隣住民通報窓口の整備を求めます。",
    type: "PETITION",
    target_signatures: 1000,
    seedSignatures: 738,
  },
  {
    id: "seed-kyoto-bunkazai",
    authorKey: "kyoto",
    resident_code: "261009",
    title: "文化財公開施設での多言語ガイド整備提案",
    content:
      "重要文化財・世界遺産を含む公開施設に、QR コード経由でアクセスできる多言語ガイド (音声・テキスト) の標準整備を提案します。京都市が標準仕様を策定し、各施設の負担を最小化します。",
    type: "IDEA",
    target_signatures: 0,
  },

  // ── 福岡市 ─────────────────────────────────────────────────────
  {
    id: "seed-fukuoka-yatai",
    authorKey: "fukuoka",
    resident_code: "401307",
    title: "屋台文化保全条例の制定を求める請願",
    content:
      "福岡の屋台文化を将来世代に継承するため、屋台営業者の世代交代支援、立地・衛生基準の明文化、新規参入の枠組み整備を含む条例の制定を求めます。",
    type: "PETITION",
    target_signatures: 600,
    seedSignatures: 419,
  },
  {
    id: "seed-fukuoka-startup",
    authorKey: "fukuoka",
    resident_code: "401307",
    title: "スタートアップ向け公共施設の夜間開放提案",
    content:
      "天神ビッグバン後の起業エコシステム強化のため、市役所・図書館・公民館等の一部スペースを 22 時まで開放し、共創スペースとして活用する提案です。",
    type: "IDEA",
    target_signatures: 0,
  },

  // ── 札幌市 ─────────────────────────────────────────────────────
  {
    id: "seed-sapporo-carnival",
    authorKey: "sapporo",
    resident_code: "011002",
    title: "ホワイトイルミネーション期間延長と中規模イベント復活提案",
    content:
      "観光閑散期の冬季対策として、ホワイトイルミネーションの期間を 1 月末まで延長し、中規模の屋外イベント (旧ホワイトカーニバル相当) を復活させる提案です。地下街・商店街への経済効果が期待されます。",
    type: "IDEA",
    target_signatures: 0,
  },

  // ── 仙台市 ─────────────────────────────────────────────────────
  {
    id: "seed-sendai-chuodori",
    authorKey: "sendai",
    resident_code: "041009",
    title: "中央通り再整備計画の住民説明会開催を求める請願",
    content:
      "仙台市中央通り再整備計画は、地元商店街・通勤者・観光客に大きな影響を与えるにもかかわらず、住民への説明機会が限定的です。\n各地区での説明会開催と、設計案へのフィードバック反映プロセスの公開を求めます。",
    type: "PETITION",
    target_signatures: 700,
    seedSignatures: 488,
  },
];

async function main() {
  // 1. Make sure every author exists (idempotent).
  const authorIds: Record<string, string> = {};
  for (const [key, a] of Object.entries(AUTHORS)) {
    const id = hash(a.serial);
    await prisma.user.upsert({
      where: { id },
      update: {
        resident_code: a.resident_code,
        display_name: a.display_name,
        is_verified: true,
      },
      create: {
        id,
        resident_code: a.resident_code,
        display_name: a.display_name,
        is_verified: true,
      },
    });
    authorIds[key] = id;
  }

  // 2. Upsert proposals.
  for (const p of PROPOSALS) {
    await prisma.proposal.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id,
        title: p.title,
        content: p.content,
        type: p.type,
        target_signatures: p.target_signatures,
        resident_code: p.resident_code,
        author_id: authorIds[p.authorKey],
      },
    });
  }

  // 3. Mock signature activity for every petition that opted in via
  //    `seedSignatures`. Each proposal gets LOCAL-ONLY signers under the
  //    new multi-tenant policy. Older Chiyoda proposals may already carry
  //    historical mixed-municipality data; the count check below leaves
  //    that intact.
  console.log("Seeding mock signature activity...");
  for (const p of PROPOSALS) {
    if (!p.seedSignatures) continue;
    await seedPetitionActivity(p.id, p.resident_code, p.seedSignatures);
  }

  console.log("Seed completed.");
}

async function seedPetitionActivity(
  proposalId: string,
  proposalCode: string,
  target: number,
) {
  const existing = await prisma.vote.count({
    where: { proposal_id: proposalId, vote_type: "SIGN" },
  });
  if (existing >= target) {
    console.log(`  - ${proposalId}: already has ${existing} signatures, skipping.`);
    return;
  }
  const need = target - existing;
  console.log(`  - ${proposalId} (${proposalCode}): seeding ${need} local signatures…`);

  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  for (let i = 0; i < need; i++) {
    // Bias toward recent days: r^2 maps uniform [0,1) → curve with peak near 0
    const bias = Math.pow(((i * 7919) % 1000) / 1000, 2);
    const daysAgo = bias * 14;
    const hourOffset = ((i * 31) % 86) / 4;
    const ts = new Date(now - daysAgo * DAY - hourOffset * 60 * 60 * 1000);

    // Multi-tenant rule: every fake signer is a local resident of the
    // same municipality as the proposal.
    const code = proposalCode;
    const userKey = `${proposalId}-fake-${i}`;
    const id = hash(`FAKE-CITIZEN-${userKey}`);

    await prisma.user.upsert({
      where: { id },
      update: {},
      create: {
        id,
        resident_code: code,
        display_name: null,
        is_verified: true,
      },
    });

    try {
      await prisma.vote.create({
        data: {
          proposal_id: proposalId,
          user_id: id,
          vote_type: "SIGN",
          resident_code: code,
          created_at: ts,
        },
      });
    } catch {
      // P2002 (already voted) — fine, just continue.
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
