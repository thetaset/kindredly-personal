/**
 * The shapes here are a contract with the server's auto-expire sweep, not free-form fields. A
 * second caller that got them slightly wrong would file rows that never expire — which fails
 * silently, in a parent's inbox, weeks later.
 */
import {
  buildAccessRequestDraft,
  checkpointRequestKey,
  nextLocalMidnightMs,
  timeRequestKey,
} from '../src/restrictions/accessRequestDraft';

// 2026-08-21 14:30 local, whatever local is where this runs.
const NOW = new Date(2026, 7, 21, 14, 30, 0, 0).getTime();

describe('url and item requests', () => {
  it('carries the address and mirrors it into details', () => {
    const out = buildAccessRequestDraft({ type: 'url', key: '  https://example.com/x  ', nowMs: NOW });
    expect(out).toEqual({ ok: true, draft: { key: 'https://example.com/x', type: 'url', details: { url: 'https://example.com/x' } } });
  });

  it('refuses an empty address rather than filing a request for nothing', () => {
    expect(buildAccessRequestDraft({ type: 'url', key: '   ', nowMs: NOW })).toEqual({ ok: false, error: 'Please enter a URL' });
    expect(buildAccessRequestDraft({ type: 'item', key: '', nowMs: NOW })).toEqual({ ok: false, error: 'Please enter a URL' });
  });

  it('does not mirror the key into details for an item', () => {
    const out = buildAccessRequestDraft({ type: 'item', key: 'itm_123', nowMs: NOW });
    expect(out.ok && out.draft.details).toEqual({});
  });

  it('keeps the caller details it was handed', () => {
    // The Companion sends srcType/srcId so the parent's inbox can say which app this was about.
    const out = buildAccessRequestDraft({
      type: 'url',
      key: 'macos:com.valvesoftware.steam',
      details: { srcType: 'app', srcId: 'macos:com.valvesoftware.steam' },
      nowMs: NOW,
    });
    expect(out.ok && out.draft.details.srcId).toBe('macos:com.valvesoftware.steam');
  });

  it('does not mutate the details object it was given', () => {
    const details = { srcType: 'app' };
    buildAccessRequestDraft({ type: 'url', key: 'https://x.test', details, nowMs: NOW });
    expect(details).toEqual({ srcType: 'app' });
  });
});

describe('time requests', () => {
  it('keys by the hour, in the childs own clock', () => {
    // One ask per hour. The child's hour, not UTC's.
    expect(timeRequestKey(NOW)).toBe('TIMEREQ_2026-8-21 14:00');
    const out = buildAccessRequestDraft({ type: 'time', nowMs: NOW });
    expect(out.ok && out.draft.key).toBe('TIMEREQ_2026-8-21 14:00');
  });

  it('ignores any key the caller passed', () => {
    const out = buildAccessRequestDraft({ type: 'time', key: 'https://ignored.test', nowMs: NOW });
    expect(out.ok && out.draft.key).toBe('TIMEREQ_2026-8-21 14:00');
  });

  it('expires at the midnight the child experiences', () => {
    const out = buildAccessRequestDraft({ type: 'time', nowMs: NOW });
    expect(out.ok && out.draft.details.expiresAtTs).toBe(new Date(2026, 7, 22, 0, 0, 0, 0).getTime());
    expect(out.ok && out.draft.details.requestedAtTs).toBe(NOW);
  });

  it('rolls the midnight across a month end', () => {
    const lastOfMonth = new Date(2026, 7, 31, 23, 45, 0, 0).getTime();
    expect(nextLocalMidnightMs(lastOfMonth)).toBe(new Date(2026, 8, 1, 0, 0, 0, 0).getTime());
  });
});

describe('checkpoint requests', () => {
  it('keys by the day, so re-asking updates nothing instead of piling up rows', () => {
    expect(checkpointRequestKey(NOW)).toBe('CHECKPOINT_2026-8-21');
    const a = buildAccessRequestDraft({ type: 'checkpoint', nowMs: NOW });
    const b = buildAccessRequestDraft({ type: 'checkpoint', nowMs: NOW + 3 * 3_600_000 });
    expect(a.ok && b.ok && a.draft.key).toBe(b.ok ? b.draft.key : '');
  });

  it('expires when the gate itself resets, not at midnight', () => {
    // A 6am check-in asked about at 14:30 must die at 6am tomorrow, which is when the gate returns.
    const out = buildAccessRequestDraft({ type: 'checkpoint', resetHourLocal: 6, nowMs: NOW });
    expect(out.ok && out.draft.details.expiresAtTs).toBe(new Date(2026, 7, 22, 6, 0, 0, 0).getTime());
  });
});

describe('unknown types', () => {
  it('passes the callers key straight through', () => {
    // action / publishedItem / appCapability build their own keys upstream.
    const out = buildAccessRequestDraft({ type: 'appCapability', key: 'ACTION:location', nowMs: NOW });
    expect(out.ok && out.draft).toEqual({ key: 'ACTION:location', type: 'appCapability', details: {} });
  });
});
