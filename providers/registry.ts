import type { MediaProvider } from '@/providers/types';
import type { ProviderCapability, ProviderMediaType } from '@/types/provider';

class ProviderRegistry {
  private providers = new Map<string, MediaProvider>();

  register(provider: MediaProvider): void {
    this.providers.set(provider.definition.id, provider);
  }

  unregister(providerId: string): void {
    this.providers.delete(providerId);
  }

  get(providerId: string): MediaProvider | undefined {
    return this.providers.get(providerId);
  }

  list(): MediaProvider[] {
    return Array.from(this.providers.values());
  }

  listByMediaType(mediaType: ProviderMediaType): MediaProvider[] {
    return this.list().filter((provider) => provider.definition.mediaTypes.includes(mediaType));
  }

  listByCapability(capability: ProviderCapability, mediaType?: ProviderMediaType): MediaProvider[] {
    return this.list().filter((provider) => {
      if (!provider.definition.capabilities.includes(capability)) {
        return false;
      }
      if (mediaType && !provider.definition.mediaTypes.includes(mediaType)) {
        return false;
      }
      return true;
    });
  }
}

export const providerRegistry = new ProviderRegistry();
