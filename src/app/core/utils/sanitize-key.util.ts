export function sanitizeKey(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, '_')
}
