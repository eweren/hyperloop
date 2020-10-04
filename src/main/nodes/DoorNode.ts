import { Aseprite } from "../../engine/assets/Aseprite";
import { asset } from "../../engine/assets/Assets";
import { SceneNodeArgs } from "../../engine/scene/SceneNode";
import { InteractiveNode } from "./InteractiveNode";

export class DoorNode extends InteractiveNode {
    @asset("sprites/rat.aseprite.json")
    private static sprite: Aseprite;
    private isLocked = false;

    public constructor(args?: SceneNodeArgs) {
        super({
            aseprite: DoorNode.sprite,
            ...args
        }, "PRESS E TO ENTER");
    }

    public interact(): void {
        if (this.canInteract()) {
            // Teleport
        }
    }

    public canInteract(): boolean {
        return !this.isLocked;
    }

    public setLocked(locked: boolean): this {
        this.isLocked = locked;
        return this;
    }

    public getLocked(): boolean {
        return this.isLocked;
    }

}
