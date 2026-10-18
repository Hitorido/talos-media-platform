export function BrowserPlayback({ url }: { url: string }) {
  return (
    <iframe
      key={url}
      src={url}
      title="External video player"
      allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
      allowFullScreen
      sandbox="allow-scripts allow-same-origin allow-presentation"
      referrerPolicy="strict-origin-when-cross-origin"
      style={{
        width: '100%',
        aspectRatio: '16 / 9',
        minHeight: 220,
        border: 0,
        borderRadius: 12,
        background: '#000',
      }}
    />
  );
}
