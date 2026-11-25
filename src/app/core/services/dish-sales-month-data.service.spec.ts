import { TestBed } from '@angular/core/testing'
import { HttpErrorResponse } from '@angular/common/http'
import { DishSalesMonthDataService } from './dish-sales-month-data.service'
import { StorageService } from './async-storage.service'
import { LoggingService } from './logging.service'
import type { DishSalesMonth, DishSalesRow } from '../models/dish-sales-month.model'

describe('DishSalesMonthDataService (plan 726)', () => {
  let service: DishSalesMonthDataService
  let storage: jasmine.SpyObj<StorageService>

  const row = (id: string, sold: number | null): DishSalesRow => ({
    menuDishId: id,
    nameSnapshot: 'מנה ' + id,
    sold,
    returned: null,
    returnReasons: [],
    source: 'typed'
  })
  const month = (key: string, rows: DishSalesRow[] = [], extra: Partial<DishSalesMonth> = {}): DishSalesMonth =>
    ({ _id: 'm-' + key, month: key, rows, ...extra }) as DishSalesMonth
  const conflict = () =>
    new HttpErrorResponse({ status: 409, error: { error: 'MONTH_EXISTS', messageKey: 'dish_month_exists' } })

  beforeEach(() => {
    storage = jasmine.createSpyObj('StorageService', ['query', 'get', 'post', 'put', 'remove'])
    TestBed.configureTestingModule({
      providers: [
        DishSalesMonthDataService,
        { provide: StorageService, useValue: storage },
        {
          provide: LoggingService,
          useValue: jasmine.createSpyObj('LoggingService', ['error', 'warn', 'info', 'debug'])
        }
      ]
    })
    service = TestBed.inject(DishSalesMonthDataService)
  })

  it('does not load by itself; load() reads dishSalesMonths and monthOf finds a month', async () => {
    expect(storage.query).not.toHaveBeenCalled()
    storage.query.and.resolveTo([month('2026-11')])
    await service.load()
    expect(storage.query).toHaveBeenCalledOnceWith('dishSalesMonths')
    expect(service.monthOf('2026-11')?._id).toBe('m-2026-11')
    expect(service.monthOf('2026-10')).toBeUndefined()
  })

  it('a failed load sets loadFailed_', async () => {
    storage.query.and.rejectWith(new Error('down'))
    await service.load()
    expect(service.loadFailed_()).toBeTrue()
  })

  it('saveMonth POSTs when the month has no document', async () => {
    storage.post.and.callFake(async (_t: string, body: unknown) => ({ ...(body as object), _id: 'new' }) as never)
    await service.saveMonth('2026-11', [row('a', 3)])
    expect(storage.post).toHaveBeenCalledOnceWith('dishSalesMonths', { month: '2026-11', rows: [row('a', 3)] } as never)
    expect(storage.put).not.toHaveBeenCalled()
    expect(service.monthOf('2026-11')?.rows.length).toBe(1)
  })

  it('saveMonth PUTs the stored document with the new rows when it exists', async () => {
    storage.query.and.resolveTo([month('2026-11', [row('a', 1)])])
    await service.load()
    storage.put.and.callFake(async (_t: string, body: unknown) => body as never)
    await service.saveMonth('2026-11', [row('a', 5)], 'הערה')
    const sent = storage.put.calls.mostRecent().args[1] as unknown as DishSalesMonth
    expect(sent._id).toBe('m-2026-11')
    expect(sent.rows[0].sold).toBe(5)
    expect(sent.note).toBe('הערה')
    expect(storage.post).not.toHaveBeenCalled()
  })

  it('on 409 MONTH_EXISTS it reloads once and retries as a PUT', async () => {
    storage.post.and.rejectWith(conflict())
    storage.query.and.resolveTo([month('2026-11', [row('a', 1)])])
    storage.put.and.callFake(async (_t: string, body: unknown) => body as never)
    const saved = await service.saveMonth('2026-11', [row('a', 9)])
    expect(storage.query).toHaveBeenCalledTimes(1)
    expect(storage.put).toHaveBeenCalledTimes(1)
    expect(saved.rows[0].sold).toBe(9)
  })

  it('another failure is thrown to the caller', async () => {
    storage.post.and.rejectWith(new HttpErrorResponse({ status: 500 }))
    await expectAsync(service.saveMonth('2026-11', [])).toBeRejected()
  })
})
