/** Plan 667: the one function of the `qrcode` package the app uses (the package ships no types). */
declare module 'qrcode' {
  export function toDataURL(
    text: string,
    options?: { margin?: number; width?: number; errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H' }
  ): Promise<string>
}
