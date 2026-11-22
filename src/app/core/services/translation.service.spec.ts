import { TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { TranslationService } from './translation.service'
import { StorageService } from './async-storage.service'

describe('TranslationService', () => {
  let globalOverrides: Record<string, string>
  let personalItems: Record<string, string>

  function create(cache: Record<string, string> | null): { service: TranslationService; http: HttpTestingController } {
    localStorage.removeItem('DICTIONARY_CACHE')
    if (cache) localStorage.setItem('DICTIONARY_CACHE', JSON.stringify(cache))
    TestBed.configureTestingModule({
      providers: [
        TranslationService,
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: StorageService,
          useValue: {
            getGlobalDictionaryOverrides: () => Promise.resolve(globalOverrides),
            query: () => Promise.resolve([{ items: personalItems }])
          }
        }
      ]
    })
    const http = TestBed.inject(HttpTestingController)
    const service = TestBed.inject(TranslationService)
    return { service, http }
  }

  async function load(http: HttpTestingController, general: Record<string, string> | null): Promise<void> {
    const req = http.expectOne('assets/data/dictionary.json')
    if (general) req.flush({ general })
    else req.error(new ProgressEvent('error'))
    await new Promise((r) => setTimeout(r, 20))
  }

  beforeEach(() => {
    globalOverrides = {}
    personalItems = {}
  })

  afterEach(() => localStorage.removeItem('DICTIONARY_CACHE'))

  it('should be created', () => {
    const { service } = create(null)
    expect(service).toBeTruthy()
  })

  it('a changed dictionary.json text wins over the cached old one', async () => {
    const { service, http } = create({ k: 'old' })
    await load(http, { k: 'new' })
    expect(service.translate('k')).toBe('new')
  })

  it('a key only in the cache still translates', async () => {
    const { service, http } = create({ only_cached: 'cached' })
    await load(http, { k: 'new' })
    expect(service.translate('only_cached')).toBe('cached')
  })

  it('global and personal overrides win over dictionary.json', async () => {
    globalOverrides = { g: 'global', p: 'global-p' }
    personalItems = { p: 'personal' }
    const { service, http } = create({ g: 'old' })
    await load(http, { g: 'base', p: 'base' })
    expect(service.translate('g')).toBe('global')
    expect(service.translate('p')).toBe('personal')
  })
})
