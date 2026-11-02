import { buildTrackPrompt, parsePastedTrack, TRACK_PASTE_FORMAT_SPEC } from '../src/track-authoring';
import { TRACK_VOICES } from '../src/track-voices';
import { validateTrackItem } from '../src/track-item';

const words = (n: number) => Array.from({ length: n }, (_, i) => `word${i}`).join(' ');

describe('buildTrackPrompt', () => {
  it("carries the voice's whole sample, the criteria, the Avoid list and the format", () => {
    for (const voice of TRACK_VOICES) {
      const prompt = buildTrackPrompt({ subject: 'Bees', kind: 'theme', length: 5, voice: voice.key });
      expect(prompt).toContain(voice.sample.body);
      expect(prompt).toContain(`Voice: ${voice.name}.`);
    }
    const prompt = buildTrackPrompt({ subject: 'Bees', kind: 'course', length: 5, audience: 'teens', voice: 'story' });
    expect(prompt).toContain('Track: 5 items on Bees, for teens.');
    expect(prompt).toContain('each after the first opens with a one-sentence recap');
    expect(prompt).toContain('Is every factual claim traceable to the fetched source?');
    expect(prompt).toContain('manufactured urgency');
    expect(prompt.endsWith(TRACK_PASTE_FORMAT_SPEC)).toBe(true);
    expect(prompt).not.toContain('visual');
  });

  it('puts pasted text in the prompt, and names a link or an attached PDF', () => {
    expect(buildTrackPrompt({ kind: 'course', length: 3, voice: 'story', sourceText: '# Intro\nRivers.' })).toContain('"""\n# Intro\nRivers.\n"""');
    expect(buildTrackPrompt({ kind: 'course', length: 3, voice: 'story', sourceUrl: 'https://example.org/a' })).toContain('Write from this page, in its own order: https://example.org/a');
    expect(buildTrackPrompt({ kind: 'course', length: 3, voice: 'story', sourceFilename: 'paper.pdf' })).toContain('the attached document (paper.pdf)');
  });
});

describe('parsePastedTrack', () => {
  const answer = {
    title: 'Bees',
    description: 'How a hive works.',
    sections: [{ title: 'The hive', startsAtItem: 1 }, { title: 'Outside', startsAtItem: 3 }],
    items: [
      { title: 'Queens', kind: 'page', body: words(300), recap: 'None yet.', sources: [{ title: 'Honey bee', url: 'https://en.wikipedia.org/wiki/Honey_bee', license: 'CC BY-SA 4.0' }] },
      {
        title: 'Workers',
        kind: 'page',
        recap: 'Last time: the queen.',
        body: words(300),
        check: { type: 'multiple_choice', prompt: 'Who lays eggs?', choices: ['Queen', 'Worker'], correctIndex: 0, explanation: 'Only the queen.' },
        sources: [{ title: 'Honey bee', url: 'https://en.wikipedia.org/wiki/Honey_bee' }],
      },
      { title: 'A diagram', kind: 'visual', body: words(200), sources: [] },
      { title: 'Empty', kind: 'page', body: '', sources: [] },
      { title: 'Guess', kind: 'exercise', body: words(60), answer: 'About 50,000.', sources: [] },
    ],
  };

  it('round-trips the format the prompt asks for, marking every item pasted', () => {
    const fenced = 'Here you go!\n```json\n' + JSON.stringify(answer, null, 2) + '\n```\nEnjoy.';
    const result = parsePastedTrack(fenced, { kind: 'course' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const t = result.track;
    expect(t.title).toBe('Bees');
    expect(t.items.map((i) => [i.title, i.item.kind])).toEqual([
      ['Queens', 'page'],
      ['Workers', 'page'],
      ['A diagram', 'page'],
      ['Guess', 'exercise'],
    ]);
    expect(t.items.every((i) => i.item.pasted === true)).toBe(true);
    // The first item never has a recap; the check becomes a lesson question.
    expect(t.items[0].item.recap).toBeUndefined();
    expect(t.items[1].item.recap).toBe('Last time: the queen.');
    expect(t.items[1].item.check).toMatchObject({ type: 'multiple_choice', correctChoiceKeys: ['c1'] });
    expect(t.items[3].item.answer).toBe('About 50,000.');
    expect(validateTrackItem(t.items[0].item).ok).toBe(true);
    expect(t.sections).toEqual([
      { title: 'The hive', startsAtItem: 1 },
      { title: 'Outside', startsAtItem: 3 },
    ]);
    expect(t.warnings).toEqual([
      'Item 3 ("A diagram") was a visual; it is a page here, since a pasted feed has no images.',
      'Item 4 ("Empty") has no body, so it was left out.',
    ]);
  });

  it('reads JSON with prose after it, and gives no recap to the first item kept', () => {
    const items = [
      { title: 'Empty', kind: 'page', body: '' },
      { title: 'Queens', kind: 'page', body: 'A queen.', recap: 'Last time: nothing.' },
      { title: 'Drones', kind: 'page', body: 'A drone.', recap: 'Last time: the queen.' },
    ];
    const result = parsePastedTrack(`${JSON.stringify({ title: 'Bees', items })}\n\nHope this helps!`, { kind: 'course' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.track.items.map((i) => i.item.recap)).toEqual([undefined, 'Last time: the queen.']);
  });

  it('drops recaps from a theme', () => {
    const result = parsePastedTrack(JSON.stringify(answer), { kind: 'theme' });
    expect(result.ok && result.track.items.every((i) => !i.item.recap)).toBe(true);
  });

  it('says which line invalid JSON breaks on, counting from what was pasted', () => {
    const broken = 'Sure:\n```json\n{\n  "title": "Bees",\n  "items": [\n    { "title": "Queens" "body": "x" }\n  ]\n}\n```';
    const result = parsePastedTrack(broken);
    expect(result).toEqual({ ok: false, error: "That isn't valid JSON: the problem is on line 6." });
    expect(parsePastedTrack('')).toEqual({ ok: false, error: 'Paste the JSON your AI app wrote.' });
    expect(parsePastedTrack('{"title":"x"}')).toEqual({ ok: false, error: 'The JSON has no "items".' });
  });
});
