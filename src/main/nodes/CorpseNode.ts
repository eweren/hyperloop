import { Aseprite } from "../../engine/assets/Aseprite";
import { Direction } from "../../engine/geom/Direction";
import { InteractiveNode } from "./InteractiveNode";
import { asset } from "../../engine/assets/Assets";
import { SceneNodeArgs } from "../../engine/scene/SceneNode";

export class CorpseNode extends InteractiveNode {
    @asset("sprites/corpse.aseprite.json")
    private static readonly sprite: Aseprite;

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
                this.getGame().turnOffAllLights();
            }, 2000);
        }
    }

    public canInteract(): boolean {
        return !this.keyTaken;
    }

}
