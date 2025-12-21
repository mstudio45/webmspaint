export function getFileExtension(filename: string): string | null {
    const match = filename.match(/\.([^.]+)$/);
    return match ? match[1].toLowerCase() : null;
}

export function generateId(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const array = new Uint8Array(10);
    crypto.getRandomValues(array);

    return Array.from(array, x => chars[x % chars.length]).join("");
}