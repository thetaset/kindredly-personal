import {
  KINDREDLY_APP_CAPABILITIES_SCHEMA_ID,
  getKindredlyAppCapabilities,
  isAppCapabilityId,
} from '../src/types/item.types';

// The reader must be tolerant: a malformed declaration disables capabilities (null), never
// breaks launch, and never lets an unknown id through to the grant layer.

const withSchema = (value: any) => ({
  info: { schemas: { [KINDREDLY_APP_CAPABILITIES_SCHEMA_ID]: value } },
});

describe('getKindredlyAppCapabilities', () => {
  it('reads a valid declaration', () => {
    const result = getKindredlyAppCapabilities(withSchema({ capabilities: ['location'] }));
    expect(result).toEqual({ capabilities: ['location'], reasons: undefined });
  });

  it('keeps reasons only for declared capabilities and drops non-strings', () => {
    const result = getKindredlyAppCapabilities(
      withSchema({
        capabilities: ['location', 'capture.photo'],
        reasons: {
          location: '  Show walks on a map ',
          'capture.photo': 42,
          'not.declared': 'ignored',
        },
      }),
    );
    expect(result?.capabilities).toEqual(['location', 'capture.photo']);
    expect(result?.reasons).toEqual({ location: 'Show walks on a map' });
  });

  it('filters unknown capability ids instead of failing', () => {
    const result = getKindredlyAppCapabilities(
      withSchema({ capabilities: ['bluetooth', 'location', 'contacts'] }),
    );
    expect(result?.capabilities).toEqual(['location']);
  });

  it('dedupes repeated ids', () => {
    const result = getKindredlyAppCapabilities(
      withSchema({ capabilities: ['location', 'location'] }),
    );
    expect(result?.capabilities).toEqual(['location']);
  });

  it('returns null when nothing valid remains', () => {
    expect(getKindredlyAppCapabilities(withSchema({ capabilities: ['bluetooth'] }))).toBeNull();
    expect(getKindredlyAppCapabilities(withSchema({ capabilities: [] }))).toBeNull();
  });

  it('returns null for malformed shapes', () => {
    expect(getKindredlyAppCapabilities(withSchema({ capabilities: 'location' }))).toBeNull();
    expect(getKindredlyAppCapabilities(withSchema('location'))).toBeNull();
    expect(getKindredlyAppCapabilities(withSchema(['location']))).toBeNull();
    expect(getKindredlyAppCapabilities(withSchema(null))).toBeNull();
    expect(getKindredlyAppCapabilities({ info: { schemas: {} } })).toBeNull();
    expect(getKindredlyAppCapabilities(null)).toBeNull();
  });

  it('reads from details.info like the other schema readers', () => {
    const result = getKindredlyAppCapabilities({
      details: { info: { schemas: { [KINDREDLY_APP_CAPABILITIES_SCHEMA_ID]: { capabilities: ['capture.photo'] } } } },
    });
    expect(result?.capabilities).toEqual(['capture.photo']);
  });
});

describe('isAppCapabilityId', () => {
  it('accepts known ids and rejects everything else', () => {
    expect(isAppCapabilityId('location')).toBe(true);
    expect(isAppCapabilityId('capture.photo')).toBe(true);
    expect(isAppCapabilityId('bluetooth')).toBe(false);
    expect(isAppCapabilityId('')).toBe(false);
    expect(isAppCapabilityId(null)).toBe(false);
  });
});
