import fs from 'fs';
import path from 'path';

const TMP_FILE = path.join('/tmp', 'sans_connect_events_v1.json');

function loadEvents() {
  if (globalThis.__SANS_EVENTS__) {
    return globalThis.__SANS_EVENTS__;
  }
  try {
    if (fs.existsSync(TMP_FILE)) {
      const raw = fs.readFileSync(TMP_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        globalThis.__SANS_EVENTS__ = parsed;
        return parsed;
      }
    }
  } catch (e) {
    // ignore read error
  }
  globalThis.__SANS_EVENTS__ = [];
  return globalThis.__SANS_EVENTS__;
}

function saveEvents(events) {
  globalThis.__SANS_EVENTS__ = events;
  try {
    fs.writeFileSync(TMP_FILE, JSON.stringify(events), 'utf8');
  } catch (e) {
    // ignore write error on read-only fs
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const events = loadEvents();

  if (req.method === 'GET') {
    return res.status(200).json({ events });
  }

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (body && body.type) {
        const event = {
          ...body,
          id: body.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          timestamp: body.timestamp || Date.now()
        };
        events.push(event);
        saveEvents(events);
        return res.status(200).json({ ok: true, event, events });
      }
      return res.status(400).json({ error: 'Invalid event payload' });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
