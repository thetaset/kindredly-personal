import { isYTURL, isYTChannelURL, isYTVideoURL, extractYTVideoID, extractYTChannelID, extractYTChannelInfo } from '../src/text.utils';

describe('YouTube URL Utilities', () => {
  describe('isYTURL', () => {
    test('should identify valid YouTube URLs', () => {
      const validURLs = [
        'https://youtube.com/watch?v=dQw4w9WgXcQ',
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtu.be/dQw4w9WgXcQ',
        'https://youtube.com/channel/UC-lHJZR3Gqxm24_Vd_AJ5Yw',
        'http://youtube.com/user/pewdiepie',
      ];

      validURLs.forEach(url => {
        expect(isYTURL(url)).toBe(true);
      });
    });

    test('should reject non-YouTube URLs', () => {
      const invalidURLs = [
        'https://example.com',
        'https://vimeo.com/123456',
        'not-a-url',
        'http://youtub.com/fake',
      ];

      invalidURLs.forEach(url => {
        expect(isYTURL(url)).toBe(false);
      });
    });
  });

  describe('isYTChannelURL', () => {
    test('should identify valid YouTube channel URLs', () => {
      const validChannelURLs = [
        'https://youtube.com/channel/UC-lHJZR3Gqxm24_Vd_AJ5Yw',
        'https://www.youtube.com/c/vsauce',
        'https://youtube.com/user/pewdiepie',
        'https://www.youtube.com/@mkbhd',
        // Vanity URLs (no prefix)
        'https://www.youtube.com/google',
        'https://youtube.com/MrBeast',
        'https://youtube.com/TEDx',
      ];

      validChannelURLs.forEach(url => {
        expect(isYTChannelURL(url)).toBe(true);
      });
    });

    test('should reject non-channel YouTube URLs', () => {
      const invalidChannelURLs = [
        'https://youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtu.be/dQw4w9WgXcQ',
        'https://youtube.com/playlist?list=123',
        'https://example.com/channel/123',
        // Known YouTube pages that are not channels
        'https://youtube.com/shorts/abc123',
        'https://youtube.com/feed/subscriptions',
        'https://youtube.com/premium',
        'https://youtube.com/gaming',
      ];

      invalidChannelURLs.forEach(url => {
        expect(isYTChannelURL(url)).toBe(false);
      });
    });
  });

  describe('isYTVideoURL', () => {
    test('should identify valid YouTube video URLs', () => {
      const validVideoURLs = [
        'https://youtube.com/watch?v=dQw4w9WgXcQ',
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtu.be/dQw4w9WgXcQ',
        'https://youtube.com/embed/dQw4w9WgXcQ',
        'https://www.youtube.com/v/dQw4w9WgXcQ',
      ];

      validVideoURLs.forEach(url => {
        expect(isYTVideoURL(url)).toBe(true);
      });
    });

    test('should reject non-video YouTube URLs', () => {
      const invalidVideoURLs = [
        'https://youtube.com/channel/UC-lHJZR3Gqxm24_Vd_AJ5Yw',
        'https://youtube.com/playlist?list=123',
        'https://youtube.com/user/pewdiepie',
        'https://example.com/watch?v=123456',
      ];

      invalidVideoURLs.forEach(url => {
        expect(isYTVideoURL(url)).toBe(false);
      });
    });
  });

  describe('extractYTVideoID', () => {
    test('should extract video ID from various YouTube URL formats', () => {
      const testCases = [
        {
          url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
          expected: 'dQw4w9WgXcQ'
        },
        {
          url: 'https://www.youtube.com/watch?v=Cp5oajtBbtg',
          expected: 'Cp5oajtBbtg'
        },

        {
          url: 'https://youtu.be/dQw4w9WgXcQ',
          expected: 'dQw4w9WgXcQ'
        },
        {
          url: 'https://youtube.com/embed/dQw4w9WgXcQ',
          expected: 'dQw4w9WgXcQ'
        },
        {
          url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=123',
          expected: 'dQw4w9WgXcQ'
        }
      ];

      testCases.forEach(({ url, expected }) => {
        expect(extractYTVideoID(url)).toBe(expected);
      });
    });

    test('should return null for invalid YouTube video URLs', () => {
      const invalidURLs = [
        'https://youtube.com/channel/UC-lHJZR3Gqxm24_Vd_AJ5Yw',
        'https://example.com/watch?v=123456',
        'not-a-url',
        'https://youtube.com/playlist?list=123',
      ];

      invalidURLs.forEach(url => {
        expect(extractYTVideoID(url)).toBeNull();
      });
    });
  });

  describe('extractYTChannelID', () => {
    test('should extract channel ID from various YouTube channel URL formats', () => {
      const testCases = [
        {
          url: 'https://youtube.com/channel/UC-lHJZR3Gqxm24_Vd_AJ5Yw',
          expected: 'UC-lHJZR3Gqxm24_Vd_AJ5Yw'
        },
        {
          url: 'https://www.youtube.com/c/vsauce',
          expected: 'vsauce'
        },
        {
          url: 'https://youtube.com/user/pewdiepie',
          expected: 'pewdiepie'
        },
        {
          url: 'https://www.youtube.com/@mkbhd',
          expected: 'mkbhd'
        },
        // Vanity URLs (no prefix)
        {
          url: 'https://www.youtube.com/google',
          expected: 'google'
        },
        {
          url: 'https://youtube.com/MrBeast',
          expected: 'MrBeast'
        },
      ];

      testCases.forEach(({ url, expected }) => {
        expect(extractYTChannelID(url)).toBe(expected);
      });
    });

    test('should return null for invalid YouTube channel URLs', () => {
      const invalidURLs = [
        'https://youtube.com/watch?v=dQw4w9WgXcQ',
        'https://example.com/channel/123',
        'not-a-url',
        'https://youtube.com/playlist?list=123',
        'https://youtube.com/shorts/abc123',
        'https://youtube.com/feed/subscriptions',
      ];

      invalidURLs.forEach(url => {
        expect(extractYTChannelID(url)).toBeNull();
      });
    });
  });

  describe('extractYTChannelInfo', () => {
    test('should return correct type for different channel URL formats', () => {
      expect(extractYTChannelInfo('https://youtube.com/channel/UC-lHJZR3Gqxm24_Vd_AJ5Yw'))
        .toEqual({ id: 'UC-lHJZR3Gqxm24_Vd_AJ5Yw', type: 'channelId' });

      expect(extractYTChannelInfo('https://www.youtube.com/@mkbhd'))
        .toEqual({ id: 'mkbhd', type: 'handle' });

      expect(extractYTChannelInfo('https://www.youtube.com/c/vsauce'))
        .toEqual({ id: 'vsauce', type: 'customName' });

      expect(extractYTChannelInfo('https://youtube.com/user/pewdiepie'))
        .toEqual({ id: 'pewdiepie', type: 'customName' });

      // Vanity URLs
      expect(extractYTChannelInfo('https://www.youtube.com/google'))
        .toEqual({ id: 'google', type: 'vanity' });

      expect(extractYTChannelInfo('https://youtube.com/MrBeast'))
        .toEqual({ id: 'MrBeast', type: 'vanity' });
    });

    test('should return null for non-channel URLs', () => {
      expect(extractYTChannelInfo('https://youtube.com/watch?v=dQw4w9WgXcQ')).toBeNull();
      expect(extractYTChannelInfo('https://youtube.com/shorts/abc123')).toBeNull();
      expect(extractYTChannelInfo('https://youtube.com/feed/subscriptions')).toBeNull();
      expect(extractYTChannelInfo('https://youtube.com/playlist?list=123')).toBeNull();
    });
  });
});
