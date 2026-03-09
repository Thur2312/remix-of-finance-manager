export function secondsFromNow(seconds: number): Date {
  return new Date(Date.now() + seconds * 1000);
}

export function unixToDate(unix: number): Date {
  return new Date(unix * 1000);
}

export function dateToUnix(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

export function daysAgoUnix(days: number): number {
  return dateToUnix(new Date(Date.now() - days * 24 * 60 * 60 * 1000));
}

export function nowUnix(): number {
  return dateToUnix(new Date());
}

export function isTokenNearExpiry(expiresAt: Date, bufferSeconds = 300): boolean {
  return expiresAt.getTime() - bufferSeconds * 1000 <= Date.now();
}

export function parseFloatSafe(value: string | number): number {
  if (typeof value === 'number') return value;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}

export function generateState(): string {
  return Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);
}
