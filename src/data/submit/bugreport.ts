// const streamableRegex = /^https:\/\/streamable\.com\/[a-zA-Z0-9]+$/;
const youtubeRegex = /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+(&.*)?$/;
const medalRegex = /^https:\/\/medal\.tv\/games\/[a-zA-Z0-9_-]+\/clips\/[a-zA-Z0-9]+(\?.*)?$/;

// options //
export const imageAllowedTypes = ["image/png", "image/webp", "image/jpeg", "image/jpg"];
export const imageUrlRegex = /\.(jpg|webp|png)$/;
export const maxImageFileSize = 1.5;

// helpers //
export function getVideoPlatform(url: string): "streamable" | "youtube" | "medal" | null {
    // if (streamableRegex.test(url)) return "streamable";
    if (youtubeRegex.test(url)) return "youtube";
    if (medalRegex.test(url)) return "medal";

    return null;
}

export function isValidVideoPlatform(url: string): boolean {
    return getVideoPlatform(url) !== null;
}