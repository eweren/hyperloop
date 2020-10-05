import { asset } from "../../engine/assets/Assets";
import { Sound } from "../../engine/assets/Sound";
import { SoundNode, } from "../../engine/scene/SoundNode";
import { TiledSceneArgs } from "../../engine/scene/TiledMapNode";
import { Hyperloop } from "../Hyperloop";

const soundAssets = [
    "sounds/loops/loop_fan.mp3",
];
const soundMapping: {[index: string]: number} = {
    "loop": 0
};
function getAssetIndexForName(name: string): number {
    return soundMapping[name] || -1;
}

export class TiledSoundNode extends SoundNode<Hyperloop> {
    @asset(soundAssets)
    private static sounds: Sound[];

    public constructor(args?: TiledSceneArgs) {
        const range = args?.tiledObject?.getOptionalProperty("range", "int")?.getValue() ?? 1;
        const intensity = args?.tiledObject?.getOptionalProperty("intensity", "int")?.getValue() ?? 100;
        const soundName = args?.tiledObject?.getOptionalProperty("sound", "string")?.getValue() ?? "";

        const soundAssetIndex = getAssetIndexForName(soundName);
        let sound: Sound;
        if (soundAssetIndex !== -1) {
            sound = TiledSoundNode.sounds[soundAssetIndex];
        } else {
            throw new Error(`Sound ${soundName} could not be loaded`);
        }

        super({ ...args , range, intensity, sound});
    }
}
