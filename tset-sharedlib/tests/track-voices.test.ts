import * as fs from 'fs';
import * as path from 'path';
import { DEFAULT_TRACK_VOICE, getTrackVoice, TRACK_VOICES } from '../src/track-voices';

/**
 * The voice samples the founder approved live in the learning tracks tracker (TRK-13). The writer
 * imitates them and the critic scores against them, so the code's copy must stay word for word.
 */
const TRACKER = path.resolve(__dirname, '../../docs/trackers/learning-tracks-tracker.md');

function samplesFromTracker(): Array<{ name: string; description: string; title: string; body: string }> {
  const md = fs.readFileSync(TRACKER, 'utf8');
  const start = md.indexOf('## Voice samples');
  expect(start).toBeGreaterThan(-1);
  const rest = md.slice(start);
  const end = rest.indexOf('\n## ', 4);
  const section = end > 0 ? rest.slice(0, end) : rest;
  return section
    .split(/\n### /)
    .slice(1)
    .map((block) => {
      const [heading, ...lines] = block.split('\n');
      const m = heading.match(/^(.+?) — "(.+)"$/);
      const text = lines.join('\n').trim();
      const title = text.match(/^\*\*(.+)\*\*/)?.[1] ?? '';
      const body = text.replace(/^\*\*.+\*\*\s*/, '').trim();
      return { name: m?.[1] ?? heading, description: m?.[2] ?? '', title, body };
    });
}

describe('track voices', () => {
  it('match the samples approved in the tracker, word for word', () => {
    const approved = samplesFromTracker();
    expect(approved.map((a) => a.name)).toEqual(TRACK_VOICES.map((v) => v.name));
    for (const voice of TRACK_VOICES) {
      const a = approved.find((x) => x.name === voice.name)!;
      expect(voice.description).toBe(a.description);
      expect(voice.sample.title).toBe(a.title);
      expect(voice.sample.body).toBe(a.body);
    }
  });

  it('defaults to Story first, for a missing or unknown voice too', () => {
    expect(DEFAULT_TRACK_VOICE).toBe('story');
    expect(getTrackVoice(undefined).key).toBe('story');
    expect(getTrackVoice('shouty').key).toBe('story');
    expect(getTrackVoice('curious').name).toBe('Friendly and curious');
  });
});
