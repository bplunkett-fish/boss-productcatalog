import React, { useState, useEffect } from "react";
import { Video } from "lucide-react";
import { getStaticThumbnail, getVimeoId } from "@/lib/videoThumbnail";

// Resolves a thumbnail for a video URL. Uses an explicit thumbnail when
// provided, otherwise derives one from YouTube or Vimeo.
export default function VideoThumbnail({ url, thumbnail, alt }) {
  const [resolved, setResolved] = useState(() => thumbnail || getStaticThumbnail(url));

  useEffect(() => {
    let cancelled = false;
    if (thumbnail) {
      setResolved(thumbnail);
      return;
    }
    const staticThumb = getStaticThumbnail(url);
    if (staticThumb) {
      setResolved(staticThumb);
      return;
    }
    // Vimeo: fetch the thumbnail from the public simple API.
    const vimeoId = getVimeoId(url);
    if (vimeoId) {
      setResolved(null);
      fetch(`https://vimeo.com/api/v2/video/${vimeoId}.json`)
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((data) => {
          if (!cancelled && Array.isArray(data) && data[0]?.thumbnail_large) {
            setResolved(data[0].thumbnail_large);
          }
        })
        .catch(() => { if (!cancelled) setResolved(null); });
      return;
    }
    setResolved(null);
    return () => { cancelled = true; };
  }, [url, thumbnail]);

  if (resolved) {
    return (
      <img
        src={resolved}
        alt={alt || ""}
        className="w-full h-full object-cover"
        onError={(e) => {
          // If the derived thumbnail fails to load, hide it so the icon
          // fallback shows instead of a broken image.
          e.currentTarget.style.display = "none";
        }}
      />
    );
  }
  return (
    <div className="w-full h-full flex items-center justify-center">
      <Video className="w-10 h-10 text-muted-foreground/50" />
    </div>
  );
}