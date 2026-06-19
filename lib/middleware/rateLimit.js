const windows = new Map();

export function rateLimit(key, maxReq = 10, windowMs = 60000) {
  const now = Date.now();
  const entry = windows.get(key) || { count: 0, start: now };

  if (now - entry.start >= windowMs) {
    entry.count = 1;
    entry.start = now;
  } else {
    entry.count += 1;
  }

  windows.set(key, entry);
  return entry.count <= maxReq;
}
