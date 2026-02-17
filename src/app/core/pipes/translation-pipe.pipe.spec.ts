import { TestBed } from '@angular/core/testing';
import { TranslatePipe } from './translation-pipe.pipe';
import { TranslationService } from '@services/translation.service';

describe('TranslatePipe', () => {
  let pipe: TranslatePipe;
  let mockTranslationService: jasmine.SpyObj<TranslationService>;

  beforeEach(() => {
    mockTranslationService = jasmine.createSpyObj('TranslationService', ['translate']);
    mockTranslationService.translate.and.callFake((key: string | undefined) => {
      if (key === undefined || key === '') return '';
      const k = key.trim().toLowerCase();
      const dict: Record<string, string> = {
        kg: 'קילו',
        gram: 'גרם',
        ml: 'מ"ל',
        dairy: 'חלבי',
        meat: 'בשר',
        add: 'הוסף',
        new_unit: 'יחידה חדשה'
      };
      return dict[k] ?? key;
    });

    TestBed.configureTestingModule({
      providers: [
        TranslatePipe,
        { provide: TranslationService, useValue: mockTranslationService }
      ]
    });

    pipe = TestBed.inject(TranslatePipe);
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
      const customUnit = 'דלי פלסטיק';
      expect(pipe.transform(customUnit)).toBe(customUnit);
    });

    it('should return an empty string for undefined or empty values', () => {
      expect(pipe.transform(undefined)).toBe('');
      expect(pipe.transform('')).toBe('');
    });
  });
});
