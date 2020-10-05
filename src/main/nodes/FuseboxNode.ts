import { Aseprite } from "../../engine/assets/Aseprite";
import { Direction } from "../../engine/geom/Direction";
import { InteractiveNode } from "./InteractiveNode";
import { SceneNodeArgs } from "../../engine/scene/SceneNode";
import { Sound } from "../../engine/assets/Sound";
import { asset } from "../../engine/assets/Assets";

export class FuseboxNode extends InteractiveNode {
    @asset("sprites/fuse.aseprite.json")
    private static readonly sprite: Aseprite;

    @asset("sounds/fx/electricLever.ogg")
    private static readonly leverSound: Sound;

    @asset("sounds/fx/metalDoorOpen.ogg")
    private static readonly doorSound: Sound;

    private isOpen = false;
    private isOn = false;

    public constructor(args: SceneNodeArgs) {
        super({
            aseprite: FuseboxNode.sprite,
            anchor: Direction.BOTTOM,
            tag: "closed",
            ...args
        }, "PRESS E TO USE KEY");
    }

    public interact(): void {
        if (this.canInteract()) {
            if (!this.isOpen) {
                this.isOpen = true;
                this.setTag("open-off");
                this.caption = "PRESS E TO TURN ON";
                FuseboxNode.doorSound.play();
            } else {
                this.isOn = true;
                this.setTag("open-on");
                this.getGame().fuseboxOn = true;
                FuseboxNode.doorSound.stop();
                FuseboxNode.leverSound.play();
            }
        }
    }

    public canInteract(): boolean {
        return this.isOpen && !this.isOn || !this.isOpen && this.getGame().keyTaken;
    }

}
