import fs from 'fs';
import path from 'path';
import { neon } from '@neondatabase/serverless';

const TMP_FILE = path.join('/tmp', 'sans_connect_events_v3.json');

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

// Baseline events recovered from the initial desktop device localStorage
const RECOVERED_DESKTOP_EVENTS = [
  {
    type: 'UPSERT_MEMBER',
    member: {
      name: '신동준',
      team: '5조',
      clubs: ['멘토링 클럽', '스피치 클럽', 'AI 클럽'],
      keywords: ['#함께걷는동료', '#성장의자극제', '#따뜻한경청자', '#상부상조메이트']
    },
    id: '1792634372624-cse329',
    timestamp: 1792634372624
  },
  {
    type: 'UPSERT_MEMBER',
    member: {
      name: 'test',
      team: '1조',
      clubs: [],
      keywords: ['#함께걷는동료', '#따뜻한시선', '#오래함께해요']
    },
    id: '1792634397267-9j8rt5',
    timestamp: 1792634397267
  },
  {
    type: 'DELETE_MEMBER',
    name: 'test',
    id: '1792634424565-n4pnzc',
    timestamp: 1792634424565
  },
  {
    type: 'UPSERT_MEMBER',
    member: {
      name: '신동준',
      team: '5조',
      clubs: ['멘토링 클럽', '스피치 클럽', 'AI 클럽'],
      keywords: ['#함께걷는동료', '#성장의자극제', '#따뜻한경청자', '#상부상조메이트']
    },
    id: '1792634777718-bpm39e',
    timestamp: 1792634777718
  },
  {
    type: 'UPSERT_MEMBER',
    member: {
      name: '권여정',
      team: '5조',
      clubs: ['부동산 클럽', '영화 클럽'],
      keywords: [
        '#든든한버팀목',
        '#언제나내편',
        '#함께걷는동료',
        '#성장의자극제',
        '#배울점이가득한',
        '#든든한멘토'
      ]
    },
    id: '1792635473541-mqh0l9',
    timestamp: 1792635473541
  },
  {
    type: 'UPSERT_MEMBER',
    member: {
      name: '김재휘',
      team: '5조',
      clubs: ['인생책편데', '투자북클럽'],
      keywords: ['#성장의자극제', '#배울점이가득한', '#함께걷는동료']
    },
    id: '1792635737844-36g682',
    timestamp: 1792635737844
  },
  {
    type: 'UPSERT_MEMBER',
    member: {
      name: '박진현',
      team: '5조',
      clubs: [],
      keywords: ['#함께걷는동료', '#성장의자극제', '#배울점이가득한', '#끊임없는도전']
    },
    id: '1792635922377-iydq8j',
    timestamp: 1792635922377
  },
  {
    type: 'DELETE_MEMBER',
    name: '홍길동',
    id: '1792818740541-frbjpi',
    timestamp: 1792818740541
  },
  {
    type: 'UPSERT_MEMBER',
    member: {
      name: 'test',
      team: '7조',
      clubs: ['스피치 클럽', 'AI 클럽'],
      keywords: ['#함께걷는동료', '#따뜻한시선', '#오래함께해요']
    },
    id: '1792818784835-0u8h7d',
    timestamp: 1792818784835
  },
  {
    type: 'DELETE_MEMBER',
    name: 'test',
    id: '1792818894130-pac83h',
    timestamp: 1792818894130
  },
  {
    type: 'UPSERT_MEMBER',
    member: {
      name: '신동준',
      team: '5조',
      clubs: ['멘토링 클럽', '스피치 클럽', 'AI 클럽'],
      keywords: ['#함께걷는동료', '#성장의자극제', '#따뜻한경청자', '#상부상조메이트']
    },
    id: '1792819963757-asl0km',
    timestamp: 1792819963757
  },
  {
    type: 'UPSERT_MEMBER',
    member: {
      name: '조민형',
      team: '5조',
      clubs: [],
      keywords: ['#함께걷는동료', '#끊임없는도전', '#앞으로더친해져요']
    },
    id: '1792828188220-z8ei64',
    timestamp: 1792828188220
  },
  {
    type: 'UPSERT_MEMBER',
    member: {
      name: '박주은',
      team: '20조',
      clubs: ['부동산 클럽'],
      keywords: ['#함께걷는동료', '#따뜻한시선', '#오래함께해요']
    },
    id: '1792927029714-w9cyqv',
    timestamp: 1792927029714
  },
  {
    type: 'DELETE_MEMBER',
    name: 'test',
    id: '1792927067057-kkmu11',
    timestamp: 1792927067057
  }
];

function mergeEventArrays(...lists) {
  const map = new Map();
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const ev of list) {
      if (ev && ev.id && ev.type) {
        map.set(ev.id, ev);
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
}

function loadFallbackEvents() {
  if (globalThis.__SANS_EVENTS__) {
    return globalThis.__SANS_EVENTS__;
  }
  try {
    if (fs.existsSync(TMP_FILE)) {
      const raw = fs.readFileSync(TMP_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        globalThis.__SANS_EVENTS__ = mergeEventArrays(RECOVERED_DESKTOP_EVENTS, parsed);
        return globalThis.__SANS_EVENTS__;
      }
    }
  } catch {
    // ignore read error
  }
  globalThis.__SANS_EVENTS__ = [...RECOVERED_DESKTOP_EVENTS];
  return globalThis.__SANS_EVENTS__;
}

function saveFallbackEvents(events) {
  const merged = mergeEventArrays(RECOVERED_DESKTOP_EVENTS, events);
  globalThis.__SANS_EVENTS__ = merged;
  try {
    fs.writeFileSync(TMP_FILE, JSON.stringify(merged), 'utf8');
  } catch {
    // ignore write error on read-only fs
  }
  return merged;
}

async function ensureNeonTableAndSeed(sql) {
  if (globalThis.__SANS_NEON_READY__) return;

  await sql`
    CREATE TABLE IF NOT EXISTS sans_events (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      payload JSONB NOT NULL,
      timestamp BIGINT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // Ensure baseline recovered desktop events exist in Neon DB
  await sql`
    INSERT INTO sans_events (id, type, payload, timestamp)
    SELECT
      elem->>'id' AS id,
      elem->>'type' AS type,
      elem AS payload,
      COALESCE((elem->>'timestamp')::bigint, 0) AS timestamp
    FROM jsonb_array_elements(${JSON.stringify(RECOVERED_DESKTOP_EVENTS)}::jsonb) AS elem
    WHERE elem->>'id' IS NOT NULL AND elem->>'type' IS NOT NULL
    ON CONFLICT (id) DO NOTHING
  `;

  globalThis.__SANS_NEON_READY__ = true;
}

async function getNeonEvents(sql) {
  await ensureNeonTableAndSeed(sql);
  const rows = await sql`
    SELECT payload
    FROM sans_events
    ORDER BY timestamp ASC
  `;
  const dbEvents = rows.map((r) => r.payload).filter((ev) => ev && ev.id && ev.type);
  return mergeEventArrays(RECOVERED_DESKTOP_EVENTS, dbEvents);
}

async function upsertNeonEvents(sql, incomingEvents) {
  await ensureNeonTableAndSeed(sql);
  if (incomingEvents.length > 0) {
    await sql`
      INSERT INTO sans_events (id, type, payload, timestamp)
      SELECT
        elem->>'id' AS id,
        elem->>'type' AS type,
        elem AS payload,
        COALESCE((elem->>'timestamp')::bigint, (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint) AS timestamp
      FROM jsonb_array_elements(${JSON.stringify(incomingEvents)}::jsonb) AS elem
      WHERE elem->>'id' IS NOT NULL AND elem->>'type' IS NOT NULL
      ON CONFLICT (id) DO UPDATE SET
        type = EXCLUDED.type,
        payload = EXCLUDED.payload,
        timestamp = EXCLUDED.timestamp
    `;
  }
  return getNeonEvents(sql);
}

function normalizeEvent(raw) {
  if (!raw || typeof raw !== 'object' || !raw.type) return null;
  if (raw.type === 'BATCH_SYNC') return null;
  return {
    ...raw,
    id: raw.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Number(raw.timestamp) || Date.now()
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const dbUrl = getDatabaseUrl();
  const sql = dbUrl ? neon(dbUrl) : null;

  if (req.method === 'GET') {
    if (sql) {
      try {
        const events = await getNeonEvents(sql);
        saveFallbackEvents(events);
        return res.status(200).json({
          ok: true,
          storage: 'neon-postgres',
          count: events.length,
          events
        });
      } catch (err) {
        console.error('Neon GET error, falling back to local cache:', err.message);
      }
    }
    const events = loadFallbackEvents();
    return res.status(200).json({
      ok: true,
      storage: 'fallback-memory',
      count: events.length,
      events
    });
  }

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const incoming = [];

      if (body && Array.isArray(body.events)) {
        for (const item of body.events) {
          const norm = normalizeEvent(item);
          if (norm) incoming.push(norm);
        }
      } else if (body && body.type) {
        const norm = normalizeEvent(body);
        if (norm) incoming.push(norm);
      } else {
        return res.status(400).json({ error: 'Invalid event payload' });
      }

      if (sql) {
        try {
          const events = await upsertNeonEvents(sql, incoming);
          saveFallbackEvents(events);
          return res.status(200).json({
            ok: true,
            storage: 'neon-postgres',
            syncedCount: incoming.length,
            count: events.length,
            events
          });
        } catch (err) {
          console.error('Neon POST error, falling back to local cache:', err.message);
        }
      }

      const current = loadFallbackEvents();
      const events = saveFallbackEvents([...current, ...incoming]);
      return res.status(200).json({
        ok: true,
        storage: 'fallback-memory',
        syncedCount: incoming.length,
        count: events.length,
        events
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
