const { withAndroidManifest, AndroidConfig } = require('expo/config-plugins');
module.exports = function withDownloadService(config) {
  config = AndroidConfig.Permissions.withPermissions(config, [
    'android.permission.FOREGROUND_SERVICE',
    'android.permission.FOREGROUND_SERVICE_DATA_SYNC',
    'android.permission.WAKE_LOCK',
    'android.permission.POST_NOTIFICATIONS',
  ]);
  return withAndroidManifest(config, (config) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
    app.service ??= [];
    const name = 'com.asterinet.react.bgactions.RNBackgroundActionsTask';
    const service = app.service.find((s) => s.$['android:name'] === name);
    const attributes = {
      'android:name': name,
      'android:foregroundServiceType': 'dataSync',
      'android:exported': 'false',
      'android:stopWithTask': 'false',
    };
    if (service) Object.assign(service.$, attributes);
    else app.service.push({ $: attributes });

    // Add notification icon configuration
    app.metaData ??= [];
    const notificationIconMeta = app.metaData.find((m) => m.$['android:name'] === 'com.google.firebase.messaging.default_notification_icon');
    if (!notificationIconMeta) {
      app.metaData.push({
        $: {
          'android:name': 'com.google.firebase.messaging.default_notification_icon',
          'android:resource': '@drawable/ic_notification',
        },
      });
    }

    return config;
  });
};
