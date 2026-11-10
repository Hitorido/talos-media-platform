import { useRef, useState } from 'react';
import { Modal, View, ActivityIndicator, Text } from 'react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';

type CloudflareSolverProps = {
  url: string;
  visible: boolean;
  onComplete: (cookie: string | null) => void;
  onCancel: () => void;
};

export function CloudflareSolver({ url, visible, onComplete, onCancel }: CloudflareSolverProps) {
  const [loading, setLoading] = useState(true);
  const webViewRef = useRef<WebView>(null);

  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    // Check if we've successfully passed Cloudflare
    // Cloudflare redirect happens, then we get the actual page
    if (navState.url && !navState.url.includes('challenge-platform') && !navState.loading) {
      setLoading(false);
      // Wait a moment for cookies to be set, then extract
      setTimeout(() => {
        webViewRef.current?.requestFocus();
        webViewRef.current?.injectJavaScript(`
          (function() {
            const cookies = document.cookie;
            window.ReactNativeWebView.postMessage(cookies);
          })();
        `);
      }, 1000);
    }
  };

  const handleMessage = (event: any) => {
    const cookies = event.nativeEvent.data;
    // Extract cf_clearance cookie
    const cfClearanceMatch = cookies.match(/cf_clearance=([^;]+)/);
    const cfClearance = cfClearanceMatch ? cfClearanceMatch[1] : null;
    onComplete(cfClearance);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <View className="flex-1 bg-black">
        {loading && (
          <View className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
            <ActivityIndicator size="large" color="#8b5cf6" />
            <Text className="text-white mt-4">Solving Cloudflare challenge...</Text>
          </View>
        )}
        <WebView
          ref={webViewRef}
          source={{ uri: url }}
          onNavigationStateChange={handleNavigationStateChange}
          onMessage={handleMessage}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState={false}
          // Use Kotatsu-style headers
          originWhitelist={['*']}
          mixedContentMode="compatibility"
          thirdPartyCookiesEnabled
          incognito={false}
          sharedCookiesEnabled
        />
      </View>
    </Modal>
  );
}
