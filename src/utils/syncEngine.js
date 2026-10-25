import { INITIAL_MEMBERS, SYNC_TOPIC_ID } from '../data/sansData';

const LOCAL_STORAGE_KEY = 'sans_connect_events_v3';

// Baseline events recovered from the primary desktop device
export const RECOVERED_DESKTOP_EVENTS = [
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

export function mergeEventLists(...lists) {
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

export function getLocalEvents() {
  try {
    // Clean up older legacy mock keys
    localStorage.removeItem('sans_connect_events_v1');
    localStorage.removeItem('sans_connect_events_v2');

    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [...RECOVERED_DESKTOP_EVENTS];
    const parsed = JSON.parse(raw);
    const localArr = Array.isArray(parsed) ? parsed : [];
    return mergeEventLists(RECOVERED_DESKTOP_EVENTS, localArr);
  } catch {
    return [...RECOVERED_DESKTOP_EVENTS];
  }
}

export function saveLocalEvents(events) {
  try {
    const merged = mergeEventLists(RECOVERED_DESKTOP_EVENTS, events);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // ignore storage quota errors
  }
}

export function computeMembersFromEvents(events) {
  // Find the most recent RESET event if any
  let lastResetTime = 0;
  for (const ev of events) {
    if (ev.type === 'RESET' && (ev.timestamp || 0) > lastResetTime) {
      lastResetTime = ev.timestamp;
    }
  }

  // Start with a deep clone of INITIAL_MEMBERS
  const memberMap = new Map();
  for (const m of INITIAL_MEMBERS) {
    memberMap.set(m.name.trim(), {
      ...m,
      clubs: [...m.clubs],
      keywords: [...m.keywords]
    });
  }

  // Replay all events after lastResetTime
  for (const ev of events) {
    if ((ev.timestamp || 0) <= lastResetTime) continue;
    if (ev.type === 'UPSERT_MEMBER' && ev.member && ev.member.name) {
      const cleanName = ev.member.name.trim();
      const existing = memberMap.get(cleanName);
      memberMap.set(cleanName, {
        id: `member-${cleanName}`,
        name: cleanName,
        team: ev.member.team || existing?.team || '5조',
        allTeams: existing?.allTeams || false,
        isRepresentative: existing?.isRepresentative || false,
        clubs: Array.isArray(ev.member.clubs)
          ? ev.member.clubs
          : (existing?.clubs || []),
        keywords: Array.isArray(ev.member.keywords) && ev.member.keywords.length > 0
          ? ev.member.keywords
          : (existing?.keywords || []),
        isSeed: existing?.isSeed || false,
        isLiveJoined: true,
        updatedAt: ev.timestamp || Date.now()
      });
    } else if (ev.type === 'DELETE_MEMBER' && ev.name) {
      memberMap.delete(ev.name.trim());
    }
  }

  return Array.from(memberMap.values());
}

export async function fetchAllRemoteEvents() {
  const localEvents = getLocalEvents();
  let serverEvents = [];
  let serverReachable = false;
  let ntfyEvents = [];

  // 1. Fetch from Vercel Serverless API backed by Neon PostgreSQL (/api/state)
  const fetchServerPromise = (async () => {
    try {
      const res = await fetch('/api/state', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.events)) {
          serverEvents = data.events;
          serverReachable = true;
        }
      }
    } catch {
      // ignore when offline or static preview
    }
  })();

  // 2. Fetch from cloud event log (ntfy.sh JSON poll) with fast timeout so it never blocks
  const fetchNtfyPromise = (async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2200);
      const res = await fetch(`https://ntfy.sh/${SYNC_TOPIC_ID}/json?poll=1&since=all`, {
        cache: 'no-store',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const text = await res.text();
        const lines = text.split('\n').filter(Boolean);
        const parsed = [];
        for (const line of lines) {
          try {
            const wrapper = JSON.parse(line);
            if (wrapper.event === 'message' && wrapper.message) {
              const payload = JSON.parse(wrapper.message);
              if (payload && payload.id && payload.type) {
                parsed.push(payload);
              }
            }
          } catch {
            // ignore malformed line
          }
        }
        ntfyEvents = parsed;
      }
    } catch {
      // ignore timeout or network error
    }
  })();

  await Promise.allSettled([fetchServerPromise, fetchNtfyPromise]);

  // 3. Auto-Recovery (데스크톱 등 기기 로컬에만 있는 과거 이벤트를 Neon DB 서버로 자동 역동기화)
  if (serverReachable) {
    const serverEventIds = new Set(serverEvents.map((ev) => ev?.id).filter(Boolean));
    const candidateEvents = mergeEventLists(localEvents, ntfyEvents);
    const missingOnServer = candidateEvents.filter(
      (ev) => ev && ev.id && ev.type && !serverEventIds.has(ev.id)
    );

    if (missingOnServer.length > 0) {
      try {
        const pushRes = await fetch('/api/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'BATCH_SYNC',
            events: missingOnServer
          })
        });
        if (pushRes.ok) {
          const pushData = await pushRes.json();
          if (Array.isArray(pushData?.events)) {
            serverEvents = pushData.events;
          }
        }
      } catch {
        // ignore push error; will retry on next poll
      }
    }
  }

  return mergeEventLists(RECOVERED_DESKTOP_EVENTS, localEvents, serverEvents, ntfyEvents);
}

export async function publishSyncEvent(eventPayload) {
  const event = {
    ...eventPayload,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now()
  };

  // 1. Save immediately to localStorage
  const updatedLocal = mergeEventLists(getLocalEvents(), [event]);
  saveLocalEvents(updatedLocal);

  // 2. Persist immediately to Neon PostgreSQL via /api/state
  try {
    const res = await fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event)
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.events)) {
        saveLocalEvents(data.events);
      }
    }
  } catch {
    // will auto-recover on next poll if offline
  }

  // 3. Broadcast to ntfy.sh in background with short timeout
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 2000);
    fetch(`https://ntfy.sh/${SYNC_TOPIC_ID}`, {
      method: 'POST',
      body: JSON.stringify(event),
      signal: controller.signal
    }).catch(() => {});
  } catch {
    // ignore background broadcast error
  }

  return event;
}

export function subscribeToLiveEvents(onNewEvent) {
  let es = null;
  let closed = false;

  try {
    es = new EventSource(`https://ntfy.sh/${SYNC_TOPIC_ID}/sse`);
    es.onmessage = (e) => {
      if (closed) return;
      try {
        const wrapper = JSON.parse(e.data);
        if (wrapper.event === 'message' && wrapper.message) {
          const payload = JSON.parse(wrapper.message);
          if (payload && payload.id && payload.type) {
            onNewEvent(payload);
          }
        }
      } catch {
        // ignore parse error
      }
    };
  } catch {
    // fallback polling handled by caller
  }

  return () => {
    closed = true;
    if (es) {
      try {
        es.close();
      } catch {}
    }
  };
}
