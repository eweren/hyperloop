export function isElectron(): boolean {
    return !!navigator.userAgent.match(/\belectron\b/i);
}

/**
 * Figures out if development mode is enabled or not.
 */
export function isDev(): boolean {
    // Legacy behavior.
    if (window.location.port === "8000") {
        return true;
    }

    if (!!window.location.search) {
        return !!window.location.search.substr(1).split("&").find(key => {
            if (key.toLowerCase().startsWith("dev")) {
                return key.length === 3 || key.endsWith("=true");
            }
            return false;
        });
    }

    return false;
}
