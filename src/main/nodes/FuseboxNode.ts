import { Aseprite } from "../../engine/assets/Aseprite";
import { Direction } from "../../engine/geom/Direction";
import { InteractiveNode } from "./InteractiveNode";
import { SceneNodeArgs } from "../../engine/scene/SceneNode";
import { Sound } from "../../engine/assets/Sound";
import { asset } from "../../engine/assets/Assets";
import { SpawnNode } from "./SpawnNode";
import { ControllerFamily } from "../../engine/input/ControllerFamily";

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

    public update(dt: number, time: number): void {
        this.caption = `PRESS ${this.getGame().input.currentControllerFamily === ControllerFamily.GAMEPAD ? "Y" : "E"}`+ (this.isOpen ? " TO TURN ON" :" TO USE KEY");
        super.update(dt, time);
    }

    public interact(): void {
        if (this.canInteract()) {
            if (!this.isOpen) {
                this.isOpen = true;
                this.setTag("open-off");
                FuseboxNode.doorSound.play();
                this.getTarget()?.say({line: "Let's turn it on", duration: 2});
                // Spawn enemy in back
                SpawnNode.getForTrigger(this, "fusebox").forEach(spawn => spawn.spawnEnemy());
            } else {
                this.isOn = true;
                this.setTag("open-on");
                const game = this.getGame();
                game.turnOnFuseBox();
                this.getTarget()?.say({line: "Time to find that switch", duration: 5, delay: 8});
                FuseboxNode.doorSound.stop();
                FuseboxNode.leverSound.play();
            }
        }
    }

    public canInteract(): boolean {
        return this.isOpen && !this.isOn || !this.isOpen && this.getGame().keyTaken;
    }

}
