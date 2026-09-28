/** Keep unimplemented/unavailable adapters out of discovery without breaking saved routes. */
export function isActiveSource(status: string): boolean {
  return status === 'working' || status === 'available' || status === 'limited';
}
