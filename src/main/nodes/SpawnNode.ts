
import { SceneNode, SceneNodeArgs } from "../../engine/scene/SceneNode";
import { Hyperloop } from "../Hyperloop";
import { MonsterNode } from "./MonsterNode";

export class SpawnNode extends SceneNode<Hyperloop> {

    private trigger: string;

    public constructor(args?: SceneNodeArgs) {
        super({
            ...args
        });
        this.trigger = args?.tiledObject?.getOptionalProperty("trigger", "string")?.getValue() ?? "";
    }

    public getTrigger() {
        return this.trigger;
    }

    public spawnEnemy() {
        const enemy = new MonsterNode({
            x: this.x,
            y: this.y
        });
        this.getParent()?.appendChild(enemy);
        console.log("Spawned ", enemy);
    }

    public static getForTrigger(sourceNode: SceneNode, trigger: string, exact = true): SpawnNode[] {
        const allSpawns = sourceNode.getScene()?.rootNode.getDescendantsByType(SpawnNode) ?? [];
        if (exact) {
            return allSpawns.filter(spawn => spawn.getTrigger() === trigger);
        } else {
            return allSpawns.filter(spawn => spawn.getTrigger().includes(trigger));
        }
    }

}
