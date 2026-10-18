import { useState } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Text } from '@/components/ui';

export function BrowserPlayback({ url }: { url: string }) {
  const [error, setError] = useState('');
  return (
    <View style={{ gap: 8 }}>
      <View style={{ width: '100%', aspectRatio: 16 / 9, minHeight: 220, backgroundColor: '#000' }}>
        <WebView
          source={{ uri: url }}
          style={{ flex: 1, backgroundColor: '#000' }}
          allowsFullscreenVideo
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction
          javaScriptCanOpenWindowsAutomatically={false}
          onOpenWindow={() => {}}
          originWhitelist={['*']}
          mixedContentMode="never"
          allowFileAccess={false}
          incognito
          onShouldStartLoadWithRequest={(request) => {
            if (request.isTopFrame === false) return request.url.startsWith('https://');
            try {
              return new URL(request.url).origin === new URL(url).origin;
            } catch {
              return false;
            }
          }}
          onError={() =>
            setError('The browser player could not load. Retry or choose Native player.')
          }
        />
      </View>
      {error ? <Text>{error}</Text> : null}
    </View>
  );
}
