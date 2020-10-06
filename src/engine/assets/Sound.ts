import { clamp } from "../util/math";
import { ControllerManager } from "../input/ControllerManager";

// Get cross-browser AudioContext (Safari still uses webkitAudioContext…)
const AudioContext = window.AudioContext ?? (window as any).webkitAudioContext as AudioContext;

let audioContext: AudioContext | null = null;
let globalGainNode: GainNode | null = null;

export function getAudioContext(): AudioContext {
    const controllerManager = ControllerManager.getInstance();

    if (audioContext == null) {
        audioContext = new AudioContext();

        // When audio context is suspended then try to wake it up on next key or pointer press
        if (audioContext.state === "suspended") {
            const resume = () => {
                audioContext?.resume();
            };

            controllerManager.onButtonDown.connect(resume);
            document.addEventListener("pointerdown", resume);

            audioContext.addEventListener("statechange", () => {
                if (audioContext?.state === "running") {
                    controllerManager.onButtonDown.disconnect(resume);
                    document.removeEventListener("pointerdown", resume);
                }
            });
        }
    }

    return audioContext;
}

export function getGlobalGainNode(): GainNode {
    if (globalGainNode == null) {
        const audioContext = getAudioContext();
        globalGainNode = audioContext.createGain();
        globalGainNode.connect(audioContext.destination);
    }

    return globalGainNode;
}

export class Sound {
    private source: AudioBufferSourceNode | null = null;
    private loop: boolean = false;
    private readonly panNode: StereoPannerNode;
    private readonly gainNode: GainNode;

    private constructor(private readonly buffer: AudioBuffer) {
        this.gainNode = getAudioContext().createGain();
        this.panNode = getAudioContext().createStereoPanner();
        this.gainNode.connect(getGlobalGainNode());
        this.panNode.connect(this.gainNode);
    }

    public static async load(url: string): Promise<Sound> {
        const arrayBuffer = await (await fetch(url)).arrayBuffer();

        return new Promise((resolve, reject) => {
            getAudioContext().decodeAudioData(arrayBuffer,
                buffer => resolve(new Sound(buffer)),
                error => reject(error)
            );
        });
    }

    public static shallowClone(sound: Sound): Sound {
        const cloned = Object.create(sound.constructor.prototype);
        Object.keys(sound).forEach(key => {
            cloned[key] = (<any>sound)[key];
        });
        return cloned;
    }

    public shallowClone(): Sound {
        return Sound.shallowClone(this);
    }

    public isPlaying(): boolean {
        return this.source != null;
    }

    /**
     * Plays the sound with the given parameters.
     *
     * @param fadeIn    - Duration of the fadeIn in seconds.
     * @param delay     - The delay after which to play the sound in seconds.
     * @param duration  - The duration how long the sound should be played in seconds.
     * @param direction - The direction (left/right channel) and its dimension to play the sound.
     *                    Values between -1 (left) and 1 (right) are possible.
     */
    public play(fadeIn = 0, delay = 0, duration?: number, direction?: number): void {
        if (!this.isPlaying()) {
            const source = getAudioContext().createBufferSource();
            source.buffer = this.buffer;
            source.loop = this.loop;
            source.connect(this.panNode);
            this.panNode.connect(getAudioContext().destination);

            source.addEventListener("ended", () => {
                if (this.source === source) {
                    this.source = null;
                }
            });

            this.source = source;
            this.gainNode.gain.setValueAtTime(0, this.source.context.currentTime);
            this.gainNode.gain.linearRampToValueAtTime(1, this.source.context.currentTime + fadeIn);
            if (direction) {
                this.panNode.pan.setValueAtTime(direction, this.source.context.currentTime);
            }
            source.start(this.source.context.currentTime, delay, duration);
        }
    }

    public async stop(fadeOut = 0): Promise<void> {
        if (this.source) {
            if (fadeOut > 0) {
                const stopTime = this.source.context.currentTime + fadeOut;
                this.panNode.pan.linearRampToValueAtTime(0, stopTime);
                this.source.stop(stopTime);
            } else {
                try {
                    this.source.stop();
                } catch (e) {
                    // Ignored. Happens on Safari sometimes. Can't stop a sound which may not be really playing?
                }
            }

            this.source = null;
        }
    }

    public setLoop(loop: boolean): void {
        this.loop = loop;

        if (this.source) {
            this.source.loop = loop;
        }
    }

    /**
     * 
     * @param volume 
     * @param direction 
     */
    public setVolume(volume: number, direction?: number): void {
        if (direction !== undefined) {
            this.panNode.pan.setValueAtTime(direction, getAudioContext().currentTime);
        }
        const gain = this.gainNode.gain;
        gain.value = clamp(volume, gain.minValue, gain.maxValue);
    }

    public getVolume(): number {
        return this.panNode.pan.value;
    }
}
