import { Aseprite } from "../../engine/assets/Aseprite";
import { InteractiveNode } from "./InteractiveNode";
import { TiledSceneArgs } from "../../engine/scene/TiledMapNode";
import { asset } from "../../engine/assets/Assets";
import { SpawnNode } from "./SpawnNode";

export class TriggerNode extends InteractiveNode {
    @asset("sprites/rat.aseprite.json")
    private static sprite: Aseprite;

    private triggered = false;

    public constructor(args?: TiledSceneArgs) {
        super({
            aseprite: TriggerNode.sprite,
            ...args
        }, "");
    }

    public update(dt: number, time: number): void {
        super.update(dt, time);
        const target = this.getTarget();
        if (target && !this.triggered) {
            this.trigger();
        }
    }

    public trigger(): void {
        this.triggered = true;
        switch (this.getId()) {
            case "fallDownTrigger":
                this.spawnEnemies("firstEncounter");
                break;
            case "dropTrigger":
                this.spawnEnemies("dropEncounter");
                break;
            default:
                this.spawnEnemies(this.getId() ?? "");
        }
    }

    public interact(): void {}

    private spawnEnemies(trigger: string) {
        if (!trigger) {
            return;
        }
        const spawns = SpawnNode.getForTrigger(this, trigger, true);
        spawns.forEach(s => s.spawnEnemy());
    }

    public canInteract(): boolean {
        return true;
    }

    public draw(context: CanvasRenderingContext2D): void {}

}
