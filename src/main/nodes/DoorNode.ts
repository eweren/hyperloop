import { Aseprite } from "../../engine/assets/Aseprite";
import { asset } from "../../engine/assets/Assets";
import { SceneNode } from "../../engine/scene/SceneNode";
import { TiledSceneArgs } from "../../engine/scene/TiledMapNode";
import { DoorHandler } from "../DoorHandler";
import { InteractiveNode } from "./InteractiveNode";

export class DoorNode extends InteractiveNode {
    @asset("sprites/rat.aseprite.json")
    private static sprite: Aseprite;
    private isLocked = false;
    private gameTime = 0;
    private targetId = "";
    private name = "";

    public constructor(args?: TiledSceneArgs) {
        super({
            aseprite: DoorNode.sprite,
            ...args
        }, "PRESS E TO ENTER");
        this.targetId = args?.tiledObject?.getOptionalProperty("target", "string")?.getValue() ?? "";
        this.name = args?.tiledObject?.getName() ?? "";
    }

    public interact(): void {
        if (this.canInteract()) {
            const player = this.getPlayer();
            if (player) {
                const target = this.getTargetNode();
                if (target) {
                    DoorHandler.getInstance().transportToDoor(player, target, this.gameTime);
                }
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

    private getTargetNode(): SceneNode | null {
        const target = this.getScene()?.rootNode.getDescendantsByType(DoorNode)
                .filter(door => door.name === this.targetId)[0] ?? null;
        return target;
    }

}
