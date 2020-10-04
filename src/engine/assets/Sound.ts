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
    private readonly gainNode: GainNode;
    private source: AudioBufferSourceNode | null = null;
    private loop: boolean = false;

    private constructor(private readonly buffer: AudioBuffer) {
        this.gainNode = getAudioContext().createGain();
        this.gainNode.connect(getGlobalGainNode());
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

    public isPlaying(): boolean {
        return this.source != null;
    }

    public play(fadeIn = 0): void {
        if (!this.isPlaying()) {
            const source = getAudioContext().createBufferSource();
            source.buffer = this.buffer;
            source.loop = this.loop;
            source.connect(this.gainNode);

            source.addEventListener("ended", () => {
                if (this.source === source) {
                    this.source = null;
                }
            });

            this.source = source;
            if (fadeIn > 0) {
                this.gainNode.gain.setValueAtTime(0, this.source.context.currentTime);
                this.gainNode.gain.linearRampToValueAtTime(1, this.source.context.currentTime + fadeIn);
            }
            source.start();
        }
    }

    public async stop(fadeOut = 0): Promise<void> {
        if (this.source) {
            if (fadeOut > 0) {
                const stopTime = this.source.context.currentTime + fadeOut;
                this.gainNode.gain.linearRampToValueAtTime(0, stopTime);
                // this.gainNode.gain.cancelAndHoldAtTime(this.source.context.currentTime + 1);
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

    public setVolume(volume: number): void {
        const gain = this.gainNode.gain;
        gain.value = clamp(volume, gain.minValue, gain.maxValue);
    }

    public getVolume(): number {
        return this.gainNode.gain.value;
    }
}
