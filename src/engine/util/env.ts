
/** Cached result of [[isLittleEndian]] function */
let littleEndian: boolean | null = null;

/**
 * Checks if runtime is little endian.
 *
 * @return True if little endian, false if not.
 */
export function isLittleEndian(): boolean {
    return littleEndian ?? (littleEndian = new Uint16Array(new Uint8Array([ 0x12, 0x34 ]).buffer)[0] === 0x3412);
}

export function isElectron(): boolean {
    return !!navigator.userAgent.match(/\belectron\b/i);
}

/**
 * Figures out if development mode is enabled or not.
 */
export function isDev(): boolean {

    return false;
    return window.location.hostname.includes("localhost");
}

/**
 * Figures out if development mode is enabled and if to skip intro.
 */
export function skipIntro(): boolean {
    if (isDev() && !!window.location.search) {
        return !!window.location.search.substr(1).split("&").find(key => {
            if (key.toLowerCase().startsWith("skipintro")) {
                return key.length === 9 || key.endsWith("=true");
            }
            return false;
        });
    }
    return false;
}

/**
 * Figures out if development mode is enabled and if to mute the music.
 */
export function mutedMusic(): boolean {
    if (isDev() && !!window.location.search) {
        return !!window.location.search.substr(1).split("&").find(key => {
            if (key.toLowerCase().startsWith("nomusic")) {
                return key.length === 7 || key.endsWith("=true");
            }
            return false;
        });
    }
    return false;
}

/**
 * Figures out if development mode is enabled and if to mute the random fx sounds.
 */
export function mutedRandomFx(): boolean {
    if (isDev() && !!window.location.search) {
        return !!window.location.search.substr(1).split("&").find(key => {
            if (key.toLowerCase().startsWith("norandomfx")) {
                return key.length === 10 || key.endsWith("=true");
            }
            return false;
        });
    }
    return false;
}

/**
 * Figures out if development mode is enabled and if to mute the random fx sounds.
 */
export function isDebugMap(): boolean {
    return true;
    if (isDev() && !!window.location.search) {
        return !!window.location.search.substr(1).split("&").find(key => {
            if (key.toLowerCase().startsWith("debugmap")) {
                return key.length === 8 || key.endsWith("=true");
            }
            return false;
        });
    }
    return false;
}

/**
 * Figures out if development mode is enabled and if to skip intro.
 */
export function getRoom(): string {
    return window.location.search.substr(1).split("&").find(key => {
        return key.toLowerCase().startsWith("room=");
    })?.substr("room=".length) ?? "";
}
