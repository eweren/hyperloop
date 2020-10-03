export function rnd(minOrMax = 1, max?: number): number {
    if (max != null) {
        return minOrMax + Math.random() * (max - minOrMax);
    } else {
        return Math.random() * minOrMax;
    }
}

export function rndInt(minOrMax: number, max?: number): number {
    if (max != null) {
        return Math.floor(minOrMax + Math.random() * (max - minOrMax));
    } else {
        return Math.floor(Math.random() * minOrMax);
    }
}

export function rndItem(array: any[] | string) {
    const index = Math.floor(Math.random() * array.length);

    return array[index];
}

export function timedRnd(dt: number, averageDelay: number): number {
    let count = 0;
    let chance = dt - Math.random() * averageDelay;

    while (chance > 0) {
        count++;
        chance -= Math.random() * averageDelay;
    }

    return count;
}

export function clamp(v: number, min: number, max: number): number {
    return v < min ? min : v > max ? max : v;
}

export function orientPow(v: number, exp: number): number {
    if (v < 0) {
        return -((-v) ** exp);
    } else {
        return v ** exp;
    }
}

const timeDelta = Date.now() - performance.now();

export function now(): number {
    return performance.now() + timeDelta;
}

export function shiftValue(v: number, trg: number, inc: number): number {
    if (v === trg) {
        return trg;
    }

    if (v < trg) {
        v += inc;
        if (v >= trg) {
            return trg;
        }
    } else {
        v -= inc;
        if (v <= trg) {
            return trg;
        }
    }

    return v;
}

export async function sleep(ms = 0): Promise<void> {
    await new Promise((resolve) => {
        setTimeout(() => resolve(), ms);
    });
}

/**
 * Inplace array shuffling.
 * @param array The array.
 * @return The same array. But shuffled.
 */
export function shuffle<T>(array: T[]): T[] {
    for (let i = 1; i < array.length; i++) {
        const j = Math.floor(Math.random() * (i + 1));

        if (i !== j) {
            const tmp = array[i];
            array[i] = array[j];
            array[j] = tmp;
        }
    }

    return array;
}

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

/** Factor to convert radians to degrees. */
const RAD_TO_DEG = 180 / Math.PI;

/**
 * Converts degrees to radians.
 *
 * @param degrees - The value in degrees to convert to radians.
 * @return The given value converted to radians.
 */
export function radians(degrees: number): number {
    return degrees / RAD_TO_DEG;
}

/**
 * Converts radians to degrees.
 *
 * @param radians - The value in radians to convert to degrees.
 * @return The given value converted to degrees.
 */
export function degrees(radians: number): number {
    return radians * RAD_TO_DEG;
}

/**
 * Normalizes an angle in radians so it is between 0 (inclusive) and 2*PI (exclusive).
 *
 * @param degrees - The angle to normalize.
 * @return The normalized angle.
 */
export function normalizeRadians(angle: number): number {
    const pi2 = Math.PI * 2;
    return ((angle % pi2) + pi2) % pi2;
}

/**
 * Normalizes an angle in degrees so it is between 0 (inclusive) and 360 (exclusive).
 *
 * @param degrees - The angle to normalize.
 * @return The normalized angle.
 */
export function normalizeDegrees(degrees: number): number {
    return ((degrees % 360) + 360) % 360;
}
