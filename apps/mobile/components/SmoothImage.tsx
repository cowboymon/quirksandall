// Image that keeps showing its previous picture until the next one has
// actually downloaded, then swaps instantly — instead of RN Image's default
// of going blank the moment the URI changes. Used where a photo is replaced
// in place (e.g. the poster snapshot after editing the pet's photo): the
// cache-busted URL means a full re-download, and a couple of seconds of
// blank reads as "the new photo didn't save".
import { useEffect, useState } from "react";
import { Image, type ImageProps } from "react-native";

export function SmoothImage({ uri, ...props }: Omit<ImageProps, "source"> & { uri: string }) {
  const [shownUri, setShownUri] = useState(uri);
  useEffect(() => {
    if (uri === shownUri) return;
    let cancelled = false;
    // Warm the cache first; swap only once the bytes are local. On a prefetch
    // failure swap anyway — a broken image beats silently pinning a stale one.
    Image.prefetch(uri)
      .catch(() => {})
      .then(() => { if (!cancelled) setShownUri(uri); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uri]);
  return <Image source={{ uri: shownUri }} {...props} />;
}
