import { INITIAL_MEMBERS, SYNC_TOPIC_ID } from '../data/sansData';

const LOCAL_STORAGE_KEY = 'sans_connect_events_v3';

export function getLocalEvents() {
  try {
    // Clean up older legacy mock keys
    localStorage.removeItem('sans_connect_events_v1');
    localStorage.removeItem('sans_connect_events_v2');

    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalEvents(events) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(events));
  } catch {
    // ignore storage quota errors
  }
}

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
        clubs: Array.isArray(ev.member.clubs) && ev.member.clubs.length > 0
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
  const results = [];

  // 1. Fetch from Vercel Serverless API (/api/state)
  try {
    const res = await fetch('/api/state', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.events)) {
        results.push(data.events);
      }
    }
  } catch {
    // ignore when offline or static preview
  }

  // 2. Fetch from cloud event log (ntfy.sh JSON poll)
  try {
    const res = await fetch(`https://ntfy.sh/${SYNC_TOPIC_ID}/json?poll=1&since=all`, {
      cache: 'no-store'
    });
    if (res.ok) {
      const text = await res.text();
      const lines = text.split('\n').filter(Boolean);
      const cloudEvents = [];
      for (const line of lines) {
        try {
          const wrapper = JSON.parse(line);
          if (wrapper.event === 'message' && wrapper.message) {
            const payload = JSON.parse(wrapper.message);
            if (payload && payload.id && payload.type) {
              cloudEvents.push(payload);
            }
          }
        } catch {
          // ignore malformed line
        }
      }
      results.push(cloudEvents);
    }
  } catch {
    // ignore network error
  }

  return mergeEventLists(getLocalEvents(), ...results);
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

  // 2. Post to Vercel Serverless API & Cloud pub-sub in parallel
  await Promise.allSettled([
    fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event)
    }),
    fetch(`https://ntfy.sh/${SYNC_TOPIC_ID}`, {
      method: 'POST',
      body: JSON.stringify(event)
    })
  ]);

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
      try { es.close(); } catch {}
    }
  };
}
