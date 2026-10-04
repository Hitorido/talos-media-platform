import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Image, View } from 'react-native';

type SourceLogoProps = {
  name: string;
  website?: string;
};

function getFaviconUrl(website?: string): string | undefined {
  if (!website) return undefined;
  try {
    const domain = new URL(website).hostname;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
  } catch {
    return undefined;
  }
}

export function SourceLogo({ name, website }: SourceLogoProps) {
  const faviconUrl = getFaviconUrl(website);
  const [failed, setFailed] = useState(false);

  return (
    <View className="h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-800">
      {faviconUrl && !failed ? (
        <Image
          source={{ uri: faviconUrl }}
          onError={() => setFailed(true)}
          className="h-7 w-7"
          resizeMode="contain"
        />
      ) : (
        <Ionicons
          name="globe-outline"
          size={20}
          color="#9ca3af"
          accessibilityLabel={`${name} logo unavailable`}
        />
      )}
    </View>
  );
}
