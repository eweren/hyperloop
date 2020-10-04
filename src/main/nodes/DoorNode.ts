import { Aseprite } from "../../engine/assets/Aseprite";
import { asset } from "../../engine/assets/Assets";
import { SceneNode, SceneNodeArgs } from "../../engine/scene/SceneNode";
import { DoorHandler } from "../DoorHandler";
import { InteractiveNode } from "./InteractiveNode";
import { TrainNode } from "./TrainNode";

export class DoorNode extends InteractiveNode {
    @asset("sprites/rat.aseprite.json")
    private static sprite: Aseprite;
    private isLocked = false;
    private gameTime = 0;

    public constructor(args?: SceneNodeArgs) {
        super({
            aseprite: DoorNode.sprite,
            ...args
        }, "PRESS E TO ENTER");
    }

    public interact(): void {
        if (this.canInteract()) {
            const player = this.getPlayer();
            if (player) {
                DoorHandler.getInstance().transportToDoor(player, this.getTargetNode(), this.gameTime);
            }
        }
    }

    public update(dt: number, time: number): void {
        super.update(dt, time);
        this.gameTime = time;
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

    private getTargetNode(): SceneNode {
        // TODO get target from editor attributes, id, whatever
        const target = (this.getScene()?.rootNode.getDescendantsByType(TrainNode) ?? [])[0];
        return target;
    }

}
