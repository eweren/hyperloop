import { Hyperloop } from "../../main/Hyperloop";
import { Sound } from "../assets/Sound";
import { Game } from "../Game";
import { Scene } from "./Scene";
import { SceneNode, SceneNodeArgs, SceneNodeAspect } from "./SceneNode";

/**
 * Constructor arguments for [[Sound]].
 */
export interface SoundNodeArgs extends SceneNodeArgs {
    /** The sound to play. */
    sound: Sound;

    /** The sound range. */
    range: number;

    /** The sound intensity between 0.0 and 1.0. Defaults to 1.0. */
    intensity?: number;
}

/**
 * Scene node for playing an ambient sound depending on the distance to the screen center.
 *
 * @param T - Optional owner game class.
 */
export class SoundNode<T extends Game = Game> extends SceneNode<T> {
    /** The displayed aseprite. */
    private sound: Sound;

    /** The sound range. */
    private range: number;

    /** The sound intensity. */
    private intensity: number;

    /**
     * Creates a new scene node displaying the given Aseprite.
     */
    public constructor({ sound, range, intensity = 1.0, ...args }: SoundNodeArgs) {
        super({ ...args });
        this.sound = sound;
        this.range = range;
        this.intensity = intensity;
    }

    /**
     * Returns the played sound.
     *
     * @return The played sound.
     */
    public getSound(): Sound {
        return this.sound;
    }

    /**
     * Sets the sound.
     *
     * @param aseprite - The Aseprite to draw.
     */
    public setSound(sound: Sound): this {
        if (sound !== this.sound) {
            this.sound = sound;
            this.invalidate(SceneNodeAspect.RENDERING);
        }
        return this;
    }

    /**
     * Returns the sound range.
     *
     * @return The sound range.
     */
    public getRange(): number {
        return this.range;
    }

    /**
     * Sets the sound range.
     *
     * @param range - The sound range to set.
     */
    public setRange(range: number): this {
        if (range !== this.range) {
            this.range = range;
            this.invalidate(SceneNodeAspect.RENDERING);
        }
        return this;
    }

    /**
     * Returns the sound intensity (0.0 - 1.0).
     *
     * @return The sound intensity (0.0 - 1.0).
     */
    public getIntensity(): number {
        return this.intensity;
    }

    /**
     * Sets the sound range.
     *
     * @param intensity - The sound range to set.
     */
    public setIntensity(intensity: number): this {
        if (intensity !== this.intensity) {
            this.intensity = intensity;
            this.invalidate(SceneNodeAspect.RENDERING);
        }
        return this;
    }

    /** @inheritDoc */
    public update(dt: number, time: number) {
        super.update(dt, time);
        let distance = 0;
        const scene = this.getScene() as Scene<Hyperloop>;
        if (scene) {
            distance = this.getScenePosition().getDistance(scene.game.getPlayer().getScenePosition());
        }
        const volume = Math.max(0, this.range - distance) / this.range * this.intensity;
        if (volume > 0) {
            this.sound.setVolume(volume);
            if (!this.sound.isPlaying()) {
                this.sound.play();
            }
        } else {
            this.sound.stop();
        }
    }
}
