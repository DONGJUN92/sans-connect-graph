import { SANS_CLUBS } from '../data/sansData';

const MEMBERS_CACHE_KEY = 'sans_members_neon_cache_v4';

export const DEFAULT_RECOVERED_MEMBERS = [
  {
    id: 'member-이동훈 대표님',
    name: '이동훈 대표님',
    team: '전체 조',
    allTeams: true,
    isRepresentative: true,
    isSeed: true,
    isLiveJoined: true,
    clubs: SANS_CLUBS.map((c) => c.name),
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
    id: 'member-신동준',
    name: '신동준',
    team: '5조',
    allTeams: false,
    isRepresentative: false,
    isSeed: true,
    isLiveJoined: true,
    clubs: ['멘토링 클럽', '스피치 클럽', 'AI 클럽'],
    keywords: ['#함께걷는동료', '#성장의자극제', '#따뜻한경청자', '#상부상조메이트'],
    updatedAt: 1792634372624
  },
  {
    id: 'member-권여정',
    name: '권여정',
    team: '5조',
    allTeams: false,
    isRepresentative: false,
    isSeed: false,
    isLiveJoined: true,
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
    id: 'member-김재휘',
    name: '김재휘',
    team: '5조',
    allTeams: false,
    isRepresentative: false,
    isSeed: false,
    isLiveJoined: true,
    clubs: ['인생책편데', '투자북클럽'],
    keywords: ['#성장의자극제', '#배울점이가득한', '#함께걷는동료'],
    updatedAt: 1792635737844
  },
  {
    id: 'member-박진현',
    name: '박진현',
    team: '5조',
    allTeams: false,
    isRepresentative: false,
    isSeed: false,
    isLiveJoined: true,
    clubs: [],
    keywords: ['#함께걷는동료', '#성장의자극제', '#배울점이가득한', '#끊임없는도전'],
    updatedAt: 1792635922377
  },
  {
    id: 'member-조민형',
    name: '조민형',
    team: '5조',
    allTeams: false,
    isRepresentative: false,
    isSeed: false,
    isLiveJoined: true,
    clubs: [],
    keywords: ['#함께걷는동료', '#끊임없는도전', '#앞으로더친해져요'],
    updatedAt: 1792828188220
  },
  {
    id: 'member-박주은',
    name: '박주은',
    team: '20조',
    allTeams: false,
    isRepresentative: false,
    isSeed: false,
    isLiveJoined: true,
    clubs: ['부동산 클럽'],
    keywords: ['#함께걷는동료', '#따뜻한시선', '#오래함께해요'],
    updatedAt: 1792927029714
  }
];

export function getCachedMembers() {
  try {
    // Clean up legacy event keys
    localStorage.removeItem('sans_connect_events_v1');
    localStorage.removeItem('sans_connect_events_v2');

    const raw = localStorage.getItem(MEMBERS_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore storage errors
  }
  return DEFAULT_RECOVERED_MEMBERS;
}

export function saveCachedMembers(members) {
  try {
    if (Array.isArray(members)) {
      localStorage.setItem(MEMBERS_CACHE_KEY, JSON.stringify(members));
    }
  } catch {
    // ignore quota errors
  }
}

/**
 * If this browser still has an older localStorage v3 event log with members
 * not yet migrated, extract them once and push to Neon DB.
 */
export async function migrateLegacyLocalEventsOnce() {
  try {
    const migratedFlag = localStorage.getItem('sans_neon_migrated_v4');
    if (migratedFlag === 'true') return;

    const rawV3 = localStorage.getItem('sans_connect_events_v3');
    if (rawV3) {
      const events = JSON.parse(rawV3);
      if (Array.isArray(events) && events.length > 0) {
        const map = new Map();
        for (const ev of events) {
          if (ev?.type === 'UPSERT_MEMBER' && ev.member?.name) {
            const name = ev.member.name.trim();
            if (name && name !== 'test' && name !== 'test2') {
              map.set(name, {
                name,
                team: ev.member.team || '5조',
                clubs: Array.isArray(ev.member.clubs) ? ev.member.clubs : [],
                keywords: Array.isArray(ev.member.keywords) ? ev.member.keywords : [],
                updatedAt: ev.timestamp || Date.now()
              });
            }
          } else if (ev?.type === 'DELETE_MEMBER' && ev.name) {
            map.delete(ev.name.trim());
          }
        }
        const legacyMembers = Array.from(map.values());
        if (legacyMembers.length > 0) {
          await fetch('/api/state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'BATCH_SYNC_MEMBERS',
              members: legacyMembers
            })
          });
        }
      }
    }
    localStorage.setItem('sans_neon_migrated_v4', 'true');
    localStorage.removeItem('sans_connect_events_v3');
  } catch {
    // ignore migration error
  }
}

export async function fetchMembersFromNeon() {
  try {
    const res = await fetch(`/api/state?t=${Date.now()}`, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.members)) {
        saveCachedMembers(data.members);
        return data.members;
      }
    }
  } catch {
    // offline or local preview without API
  }
  return null;
}

export async function upsertMemberInNeon(memberData) {
  try {
    const res = await fetch('/api/state', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'UPSERT_MEMBER',
        member: memberData
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.members)) {
        saveCachedMembers(data.members);
        return data.members;
      }
    }
  } catch {
    // fallback handled by optimistic update
  }
  return null;
}

export async function deleteMemberInNeon(memberName) {
  try {
    const res = await fetch('/api/state', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'DELETE_MEMBER',
        name: memberName
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.members)) {
        saveCachedMembers(data.members);
        return data.members;
      }
    }
  } catch {
    // fallback handled by optimistic update
  }
  return null;
}
