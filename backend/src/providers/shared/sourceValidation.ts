import { ProviderGatewayError } from '../types.ts';
export function checkedId(id: string, pattern: RegExp): string {
  if (!pattern.test(id))
    throw new ProviderGatewayError('Invalid source identifier.', 400, 'INVALID_SOURCE_ID');
  return id;
}
export type SourceText = (origin: string, path: string, method?: 'GET' | 'POST') => Promise<string>;
