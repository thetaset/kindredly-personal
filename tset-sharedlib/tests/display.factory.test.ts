import { createDisplayItem } from '../src/display.factory';
import { ItemTypeEnum } from '../src/shared.types';

describe('display.factory decryption handling', () => {
  test('does not mark decryption failed when decrypted flag is missing', () => {
    const result = createDisplayItem({
      details: {
        _id: 'col-1',
        type: ItemTypeEnum.collection,
        name: 'My Collection',
        description: 'Readable description',
        encrypted: true,
        encInfo: {
          keys: [{ id: 'k1' }],
        },
      } as any,
    } as any);

    expect(result.decryptionFailed).toBe(false);
    expect(result.name).toBe('My Collection');
    expect(result.description).toBe('Readable description');
  });

  test('marks decryption failed when explicitly decrypted false', () => {
    const result = createDisplayItem({
      details: {
        _id: 'col-2',
        type: ItemTypeEnum.collection,
        name: 'Encrypted Name Blob',
        description: 'Encrypted Description Blob',
        encrypted: true,
        decrypted: false,
        encInfo: {
          keys: [{ id: 'k1' }],
        },
      } as any,
    } as any);

    expect(result.decryptionFailed).toBe(true);
    expect(result.name).toBe('[Decryption failed] - check encryption settings');
    expect(result.description).toBe('[Decryption failed] - check encryption settings');
  });
  
});
