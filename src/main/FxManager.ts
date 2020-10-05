import { asset } from "../engine/assets/Assets";
import { Sound } from "../engine/assets/Sound";
import { clamp } from "../engine/util/math";
import { sleep } from "../engine/util/time";


export class FxManager {

    @asset("sounds/fx/zombieScream.mp3")
    private static scream: Sound;

    @asset("sounds/fx/drip.mp3")
    private static drip: Sound;

    @asset("sounds/fx/metalDoor.mp3")
    private static metalDoor: Sound;

    @asset("sounds/fx/womanHeavyBreathing.mp3")
    private static womanHeavyBreathing: Sound;

    private sounds: Array<Sound> = [];

    private playScreamInterval: NodeJS.Timeout | null = null;
    private static theInstance = new FxManager();

    private loaded = false;
    private loadInterval: number;
    private currentSoundToPlay = -1;

    public constructor() {
        this.loaded = false;
        this.loadInterval = +setInterval(this.checkLoaded.bind(this), 200);
    }

    private checkLoaded() {
        if (FxManager.scream) {
            this.loaded = true;
            this.sounds = [FxManager.scream, FxManager.drip, FxManager.metalDoor, FxManager.womanHeavyBreathing];
            clearInterval(this.loadInterval);
            this.loadInterval = 0;
        }
    }

    public static getInstance() {
        return FxManager.theInstance;
    }

    public playSounds(): void {
        if (this.loaded) {
            this.setupNewTimeout();
        }
    }

    private async setupNewTimeout(): Promise<void> {
        const timeToNextScream = clamp(Math.random() * 20000 + 10000, 15000, 350000);
        await sleep(timeToNextScream);
        this.currentSoundToPlay = Math.floor(Math.random() * this.sounds.length);
        this.sounds[this.currentSoundToPlay];
        this.sounds[this.currentSoundToPlay].setVolume(clamp(Math.random() + 0.3, 0.3, 1));
        this.sounds[this.currentSoundToPlay].play();
        await this.setupNewTimeout();
    }

    public stop(): void {
        if (this.playScreamInterval) {
            clearInterval(this.playScreamInterval);
        }

        if (this.currentSoundToPlay > -1) {
            this.sounds[this.currentSoundToPlay].stop();
        }
    }

}
