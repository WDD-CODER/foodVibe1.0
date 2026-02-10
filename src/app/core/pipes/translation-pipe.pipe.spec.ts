import { TranslatePipe } from './translation-pipe.pipe';

describe('TranslatePipe', () => {
  let pipe: TranslatePipe;

  beforeEach(() => {
    pipe = new TranslatePipe();
  });

  it('create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  describe('Dictionary Mapping', () => {
    it('should translate standard units correctly', () => {
      expect(pipe.transform('kg')).toBe('קילו');
      expect(pipe.transform('gram')).toBe('גרם');
      expect(pipe.transform('ml')).toBe('מ"ל');
    });

    it('should translate categories correctly', () => {
      expect(pipe.transform('dairy')).toBe('חלבי');
      expect(pipe.transform('meat')).toBe('בשר');
    });

    it('should translate UI strings correctly', () => {
      expect(pipe.transform('ADD')).toBe('הוסף');
      expect(pipe.transform('NEW_UNIT')).toBe('יחידה חדשה');
    });
  });

  describe('Fallback and Safety Logic', () => {
    it('should return the original value if key is not in dictionary', () => {
      // Test for custom units registered by the user
      const customUnit = 'דלי פלסטיק';
      expect(pipe.transform(customUnit)).toBe(customUnit);
    });

    it('should return an empty string for null or undefined values', () => {
      expect(pipe.transform(null)).toBe('');
      expect(pipe.transform(undefined)).toBe('');
      expect(pipe.transform('')).toBe('');
    });
  });
});