import { Aseprite } from "../../engine/assets/Aseprite";
import { Direction } from "../../engine/geom/Direction";
import { InteractiveNode } from "./InteractiveNode";
import { asset } from "../../engine/assets/Assets";
import { SceneNodeArgs } from "../../engine/scene/SceneNode";
import { Sound } from "../../engine/assets/Sound";
import { MusicManager } from "../MusicManager";

export class CorpseNode extends InteractiveNode {
    @asset("sprites/corpse.aseprite.json")
    private static readonly sprite: Aseprite;

    @asset("sounds/fx/heavyLightSwitch.ogg")
    private static readonly lightSound: Sound;

    private keyTaken = false;

    public constructor(args: SceneNodeArgs) {
        super({
            aseprite: CorpseNode.sprite,
            anchor: Direction.BOTTOM,
            tag: "off",
            ...args
        }, "PRESS E TO SEARCH CORPSE");
    }

    public interact(): void {
        if (this.canInteract()) {
            // TODO play some neat key take sound
            this.keyTaken = true;
            this.getGame().keyTaken = true;
            console.log("Key taken");
            setTimeout(() => {
                CorpseNode.lightSound.play();
                this.getGame().turnOffAllLights();
                MusicManager.getInstance().loopTrack(2);
            }, 2000);
        }
    }

    public canInteract(): boolean {
        return !this.keyTaken;
    }

}
