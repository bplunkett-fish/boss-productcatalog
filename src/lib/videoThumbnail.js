// Derives a poster/thumbnail image for a video URL when one isn't explicitly
// provided. YouTube thumbnails are constructable directly from the video id;
// Vimeo requires a lightweight public API call (handled by the React
// component below, which supports async resolution).

export function getYoutubeId(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return u.pathname.slice(1).split("/")[0];
    if (host === "youtube.com" || host === "m.youtube.com") {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "v") return parts[1];
    }
  } catch {
    return null;
  }
  return null;
}

export function getVimeoId(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "").replace(/^player\./, "");
    if (host !== "vimeo.com") return null;
    const parts = u.pathname.split("/").filter(Boolean);
    return parts[0] && /^\d+$/.test(parts[0]) ? parts[0] : null;
  } catch {
    return null;
  }
}

// Returns a directly-usable thumbnail URL for services that expose one without
// an API call (currently YouTube). Vimeo is resolved asynchronously by the
// VideoThumbnail component.
export function getStaticThumbnail(url) {
  if (!url) return null;
  const yt = getYoutubeId(url);
  if (yt) return `https://img.youtube.com/vi/${yt}/hqdefault.jpg`;
  return null;
}