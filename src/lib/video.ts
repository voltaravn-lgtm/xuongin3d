export interface ProductVideoEmbed {
  originalUrl: string;
  embedUrl?: string;
  directUrl?: string;
  provider: "youtube" | "instagram" | "facebook" | "direct" | "external";
  label: string;
}

function getYouTubeId(url: URL) {
  const hostname = url.hostname.replace(/^www\./, "").toLowerCase();

  if (hostname === "youtu.be") {
    return url.pathname.split("/").filter(Boolean)[0] || "";
  }

  if (hostname === "youtube.com" || hostname === "m.youtube.com" || hostname === "youtube-nocookie.com") {
    if (url.pathname.startsWith("/shorts/") || url.pathname.startsWith("/embed/")) {
      return url.pathname.split("/").filter(Boolean)[1] || "";
    }
    return url.searchParams.get("v") || "";
  }

  return "";
}

function getInstagramEmbedUrl(url: URL) {
  const hostname = url.hostname.replace(/^www\./, "").toLowerCase();
  if (hostname !== "instagram.com") return "";

  const parts = url.pathname.split("/").filter(Boolean);
  const type = parts[0]?.toLowerCase();
  const shortcode = parts[1];
  if (!shortcode || !["p", "reel", "tv"].includes(type)) return "";

  return `https://www.instagram.com/${type}/${encodeURIComponent(shortcode)}/embed/captioned/`;
}

function getFacebookEmbedUrl(url: URL) {
  const hostname = url.hostname.replace(/^www\./, "").toLowerCase();
  const supportedHost = hostname === "facebook.com" || hostname === "m.facebook.com" || hostname === "web.facebook.com" || hostname === "fb.watch";
  if (!supportedHost) return "";

  const isVideoUrl = hostname === "fb.watch"
    || /\/(reel|videos)\//i.test(url.pathname)
    || url.pathname === "/watch"
    || url.pathname === "/watch/";
  if (!isVideoUrl) return "";

  return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url.toString())}&show_text=false&width=560`;
}

export function getProductVideoEmbed(rawUrl: string, index = 0): ProductVideoEmbed | null {
  const originalUrl = String(rawUrl || "").trim();
  if (!originalUrl) return null;

  try {
    const url = new URL(originalUrl);
    const youtubeId = getYouTubeId(url);

    if (youtubeId) {
      return {
        originalUrl,
        embedUrl: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeId)}`,
        provider: "youtube",
        label: `Video ${index + 1}`,
      };
    }

    const instagramEmbedUrl = getInstagramEmbedUrl(url);
    if (instagramEmbedUrl) {
      return {
        originalUrl,
        embedUrl: instagramEmbedUrl,
        provider: "instagram",
        label: `Instagram ${index + 1}`,
      };
    }

    const facebookEmbedUrl = getFacebookEmbedUrl(url);
    if (facebookEmbedUrl) {
      return {
        originalUrl,
        embedUrl: facebookEmbedUrl,
        provider: "facebook",
        label: `Facebook ${index + 1}`,
      };
    }

    if (/\.(mp4|webm|ogg)(?:$|\?)/i.test(url.pathname + url.search)) {
      return {
        originalUrl,
        directUrl: originalUrl,
        provider: "direct",
        label: `Video ${index + 1}`,
      };
    }

    return {
      originalUrl,
      provider: "external",
      label: `Video ${index + 1}`,
    };
  } catch {
    return null;
  }
}

export function cleanVideoUrls(videoUrls: string[] | undefined) {
  return Array.from(new Set((videoUrls || []).map((url) => String(url || "").trim()).filter(Boolean)));
}
