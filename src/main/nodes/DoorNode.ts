import { Aseprite } from "../../engine/assets/Aseprite";
import { DoorHandler } from "../DoorHandler";
import { InteractiveNode } from "./InteractiveNode";
import { SceneNode } from "../../engine/scene/SceneNode";
import { Sound } from "../../engine/assets/Sound";
import { TiledSceneArgs } from "../../engine/scene/TiledMapNode";
import { asset } from "../../engine/assets/Assets";

export class DoorNode extends InteractiveNode {
    @asset("sounds/fx/metalDoor.mp3")
    private static readonly doorSound: Sound;

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
        this.hideSprite = true;
    }

    public interact(): void {
        if (this.canInteract()) {
            const player = this.getPlayer();
            if (player) {
                const target = this.getTargetNode();
                if (target) {
                    DoorHandler.getInstance().transportToDoor(player, target, this.gameTime);
                    DoorNode.doorSound.stop();
                    DoorNode.doorSound.play();
                }
            }
        }
    }

    public update(dt: number, time: number): void {
        super.update(dt, time);
        this.gameTime = time;
    }

    public canInteract(): boolean {
        return DoorHandler.getInstance().isReady(this.gameTime) && !this.isLocked;
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
