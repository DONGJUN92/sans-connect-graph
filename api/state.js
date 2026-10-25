import { neon } from '@neondatabase/serverless';

// Neon PostgreSQL connection string (uses Vercel env vars first, with pre-provisioned Neon DB fallback)
const DEFAULT_NEON_DATABASE_URL =
  'postgresql://neondb_owner:npg_kujhQ4JCWqF9@ep-blue-boat-b5817vlg-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require';

function getDatabaseUrl() {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL ||
    process.env.STORAGE_URL ||
    DEFAULT_NEON_DATABASE_URL
  );
}

const ALL_20_CLUBS = [
  '멘토링 클럽',
  '스피치 클럽',
  'AI 클럽',
  '골프 클럽',
  '논어 클럽',
  '댄스 클럽',
  '러닝 클럽',
  '바이오 클럽',
  '부동산 클럽',
  '연극 클럽',
  '영화 클럽',
  '중급 영어 북클럽',
  '초급 영어 북클럽',
  '태극권 클럽',
  'English Speech 클럽',
  'Sans 레가타 (SANS REGATTA)',
  '인생책편데',
  '기산편데',
  '아트편데',
  '투자북클럽'
];

const INITIAL_SEED_MEMBERS = [
  {
    name: '이동훈 대표님',
    team: '전체 조',
    allTeams: true,
    isRepresentative: true,
    isSeed: true,
    clubs: ALL_20_CLUBS,
    keywords: [
      '#든든한버팀목',
      '#함께걷는동료',
      '#성장의자극제',
      '#따뜻한시선',
      '#산스최고의만남',
      '#오래함께해요'
    ],
    updatedAt: 1700000000000
  },
  {
    name: '신동준',
    team: '5조',
    allTeams: false,
    isRepresentative: false,
    isSeed: true,
    clubs: ['멘토링 클럽', '스피치 클럽', 'AI 클럽'],
    keywords: ['#함께걷는동료', '#성장의자극제', '#따뜻한경청자', '#상부상조메이트'],
    updatedAt: 1792634372624
  },
  {
    name: '권여정',
    team: '5조',
    allTeams: false,
    isRepresentative: false,
    isSeed: false,
    clubs: ['부동산 클럽', '영화 클럽'],
    keywords: [
      '#든든한버팀목',
      '#언제나내편',
      '#함께걷는동료',
      '#성장의자극제',
      '#배울점이가득한',
      '#든든한멘토'
    ],
    updatedAt: 1792635473541
  },
  {
    name: '김재휘',
    team: '5조',
    allTeams: false,
    isRepresentative: false,
    isSeed: false,
    clubs: ['인생책편데', '투자북클럽'],
    keywords: ['#성장의자극제', '#배울점이가득한', '#함께걷는동료'],
    updatedAt: 1792635737844
  },
  {
    name: '박진현',
    team: '5조',
    allTeams: false,
    isRepresentative: false,
    isSeed: false,
    clubs: [],
    keywords: ['#함께걷는동료', '#성장의자극제', '#배울점이가득한', '#끊임없는도전'],
    updatedAt: 1792635922377
  },
  {
    name: '조민형',
    team: '5조',
    allTeams: false,
    isRepresentative: false,
    isSeed: false,
    clubs: [],
    keywords: ['#함께걷는동료', '#끊임없는도전', '#앞으로더친해져요'],
    updatedAt: 1792828188220
  },
  {
    name: '박주은',
    team: '20조',
    allTeams: false,
    isRepresentative: false,
    isSeed: false,
    clubs: ['부동산 클럽'],
    keywords: ['#함께걷는동료', '#따뜻한시선', '#오래함께해요'],
    updatedAt: 1792927029714
  }
];

async function ensureMembersTable(sql) {
  if (globalThis.__SANS_MEMBERS_TABLE_READY__) return;

  await sql`
    CREATE TABLE IF NOT EXISTS sans_members (
      name TEXT PRIMARY KEY,
      team TEXT NOT NULL DEFAULT '5조',
      clubs JSONB NOT NULL DEFAULT '[]'::jsonb,
      keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
      all_teams BOOLEAN NOT NULL DEFAULT FALSE,
      is_representative BOOLEAN NOT NULL DEFAULT FALSE,
      is_seed BOOLEAN NOT NULL DEFAULT FALSE,
      updated_at BIGINT NOT NULL
    )
  `;

  // Only seed if the table is completely empty (e.g. newly connected Neon database)
  const countRows = await sql`SELECT count(*)::int AS cnt FROM sans_members`;
  const count = countRows[0]?.cnt ?? 0;

  if (count === 0) {
    for (const m of INITIAL_SEED_MEMBERS) {
      await sql`
        INSERT INTO sans_members (
          name, team, clubs, keywords, all_teams, is_representative, is_seed, updated_at
        ) VALUES (
          ${m.name},
          ${m.team},
          ${JSON.stringify(m.clubs)}::jsonb,
          ${JSON.stringify(m.keywords)}::jsonb,
          ${m.allTeams},
          ${m.isRepresentative},
          ${m.isSeed},
          ${m.updatedAt}
        )
        ON CONFLICT (name) DO NOTHING
      `;
    }
  }

  globalThis.__SANS_MEMBERS_TABLE_READY__ = true;
}

function rowToMember(r) {
  const isRep = Boolean(r.is_representative) || r.name === '이동훈 대표님';
  return {
    id: `member-${r.name}`,
    name: r.name,
    team: isRep ? '전체 조' : r.team || '5조',
    allTeams: isRep || Boolean(r.all_teams),
    isRepresentative: isRep,
    isSeed: Boolean(r.is_seed),
    isLiveJoined: true,
    clubs: isRep ? ALL_20_CLUBS : Array.isArray(r.clubs) ? r.clubs : [],
    keywords: Array.isArray(r.keywords) ? r.keywords : [],
    updatedAt: Number(r.updated_at) || Date.now()
  };
}

async function fetchAllMembersFromNeon(sql) {
  await ensureMembersTable(sql);
  const rows = await sql`
    SELECT name, team, clubs, keywords, all_teams, is_representative, is_seed, updated_at
    FROM sans_members
    ORDER BY is_representative DESC, updated_at ASC
  `;
  return rows.map(rowToMember);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Cache-Control');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const sql = neon(getDatabaseUrl());

  try {
    if (req.method === 'GET') {
      const members = await fetchAllMembersFromNeon(sql);
      return res.status(200).json({
        ok: true,
        storage: 'neon-postgres',
        table: 'sans_members',
        count: members.length,
        members
      });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!body || typeof body !== 'object') {
        return res.status(400).json({ error: 'Invalid request body' });
      }

      await ensureMembersTable(sql);

      if (body.type === 'UPSERT_MEMBER' && body.member && body.member.name) {
        const cleanName = String(body.member.name).trim();
        const isRep = cleanName === '이동훈 대표님';
        const team = isRep ? '전체 조' : body.member.team || '5조';
        const clubs = isRep
          ? ALL_20_CLUBS
          : Array.isArray(body.member.clubs)
          ? body.member.clubs
          : [];
        const keywords = Array.isArray(body.member.keywords) ? body.member.keywords : [];
        const now = Date.now();

        await sql`
          INSERT INTO sans_members (
            name, team, clubs, keywords, all_teams, is_representative, is_seed, updated_at
          ) VALUES (
            ${cleanName},
            ${team},
            ${JSON.stringify(clubs)}::jsonb,
            ${JSON.stringify(keywords)}::jsonb,
            ${isRep},
            ${isRep},
            ${isRep || cleanName === '신동준'},
            ${now}
          )
          ON CONFLICT (name) DO UPDATE SET
            team = EXCLUDED.team,
            clubs = EXCLUDED.clubs,
            keywords = EXCLUDED.keywords,
            updated_at = EXCLUDED.updated_at
        `;

        const members = await fetchAllMembersFromNeon(sql);
        return res.status(200).json({
          ok: true,
          storage: 'neon-postgres',
          action: 'UPSERT_MEMBER',
          name: cleanName,
          count: members.length,
          members
        });
      }

      if (body.type === 'DELETE_MEMBER' && body.name) {
        const cleanName = String(body.name).trim();
        if (cleanName && cleanName !== '이동훈 대표님') {
          await sql`
            DELETE FROM sans_members
            WHERE name = ${cleanName}
          `;
        }

        const members = await fetchAllMembersFromNeon(sql);
        return res.status(200).json({
          ok: true,
          storage: 'neon-postgres',
          action: 'DELETE_MEMBER',
          name: cleanName,
          count: members.length,
          members
        });
      }

      if (body.type === 'BATCH_SYNC_MEMBERS' && Array.isArray(body.members)) {
        for (const m of body.members) {
          if (!m || !m.name) continue;
          const cleanName = String(m.name).trim();
          const isRep = cleanName === '이동훈 대표님';
          await sql`
            INSERT INTO sans_members (
              name, team, clubs, keywords, all_teams, is_representative, is_seed, updated_at
            ) VALUES (
              ${cleanName},
              ${isRep ? '전체 조' : m.team || '5조'},
              ${JSON.stringify(Array.isArray(m.clubs) ? m.clubs : [])}::jsonb,
              ${JSON.stringify(Array.isArray(m.keywords) ? m.keywords : [])}::jsonb,
              ${isRep},
              ${isRep},
              ${Boolean(m.isSeed)},
              ${Number(m.updatedAt) || Date.now()}
            )
            ON CONFLICT (name) DO NOTHING
          `;
        }

        const members = await fetchAllMembersFromNeon(sql);
        return res.status(200).json({
          ok: true,
          storage: 'neon-postgres',
          action: 'BATCH_SYNC_MEMBERS',
          count: members.length,
          members
        });
      }

      return res.status(400).json({ error: 'Unsupported action type' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Neon DB API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
