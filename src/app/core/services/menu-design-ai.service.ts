import { HttpClient } from '@angular/common/http'
import { Injectable, inject } from '@angular/core'
import { firstValueFrom } from 'rxjs'
import {
  MENU_DESIGN_IMAGE_MAX_BASE64,
  type MenuDesignAiResult,
  type MenuDesignReference,
  type MenuDesignVariantsResponse
} from '@schemas/ai-menu-design.schema'
import type { MenuDesignDraft } from '@schemas/entities/menu-design.schema'
import { downscaleImage } from '@utils/downscale-image.util'
import { environment } from '../../../environments/environment'
import { API } from './http-storage.adapter'

/** What the chef gives the designer: the picture is still a file here. */
export type MenuDesignAiReference =
  { kind: 'image'; file: File; note?: string } | { kind: 'url'; url: string } | { kind: 'text'; text: string }

/** The longest side and the JPEG quality of the picture sent to the AI; the second is for a picture still too big. */
const IMAGE_TRIES = [
  { maxEdge: 1600, quality: 0.8 },
  { maxEdge: 1200, quality: 0.6 }
] as const

/** The picture stays over the server's limit even after the smaller try. */
export class MenuDesignImageTooLargeError extends Error {}

/** Plan 766: the menu designer's two AI calls. The server asks the model; the browser holds no key. */
@Injectable({ providedIn: 'root' })
export class MenuDesignAiService {
  private readonly http_ = inject(HttpClient)
  private readonly base_ = environment.authApiUrl

  /** Three designs in the spirit of the reference. */
  async variants(reference: MenuDesignAiReference): Promise<MenuDesignAiResult[]> {
    const body = {
      reference: reference.kind === 'image' ? await this.imageReference_(reference.file, reference.note) : reference
    }
    const res = await firstValueFrom(
      this.http_.post<MenuDesignVariantsResponse>(`${this.base_}${API.ai('menu-design/variants')}`, body)
    )
    return res.variants
  }

  /** The design changed as the words ask; `fallback` means the AI gave nothing usable and `design` is the sent one. */
  refine(design: MenuDesignDraft, request: string): Promise<MenuDesignAiResult> {
    return firstValueFrom(
      this.http_.post<MenuDesignAiResult>(`${this.base_}${API.ai('menu-design/refine')}`, { design, request })
    )
  }

  /** The picture shrunk to fit the server's body limit, as raw base64 with its type. */
  private async imageReference_(file: File, note?: string): Promise<MenuDesignReference> {
    for (const { maxEdge, quality } of IMAGE_TRIES) {
      const image = await downscaleImage(file, maxEdge, quality)
      const imageBase64 = await this.base64Of_(image)
      if (imageBase64.length <= MENU_DESIGN_IMAGE_MAX_BASE64) {
        // The server refuses any other type; the cast only satisfies the request type.
        const mimeType = image.type as Extract<MenuDesignReference, { kind: 'image' }>['mimeType']
        return { kind: 'image', imageBase64, mimeType, ...(note && { note }) }
      }
    }
    throw new MenuDesignImageTooLargeError('menu design reference picture is too large')
  }

  private base64Of_(file: File): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      // Without the data-url prefix (e.g. "data:image/jpeg;base64,").
      reader.onload = () => resolve((reader.result as string).split(',')[1] ?? '')
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }
}
