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
