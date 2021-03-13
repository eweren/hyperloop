
import { SceneNode, SceneNodeArgs } from "../../engine/scene/SceneNode";
import { Hyperloop } from "../Hyperloop";
import { MonsterNode } from "./MonsterNode";

export class SpawnNode extends SceneNode<Hyperloop> {

    private trigger: string;
    private hitpoints: number;

    public constructor(args?: SceneNodeArgs) {
        super({
            ...args
        });
        this.id = `${args?.tiledObject?.toJSON().id ?? null}`;
        this.trigger = args?.tiledObject?.getOptionalProperty("trigger", "string")?.getValue() ?? "";
        this.hitpoints = args?.tiledObject?.getOptionalProperty("hitpoints", "int")?.getValue() ?? 0;
    }

    public getTrigger() {
        return this.trigger;
    }

    public spawnEnemy() {
        const enemy = new MonsterNode({
            x: this.x,
            y: this.y,
            id: this.id
        });
        if (this.hitpoints > 0) {
            enemy.setHitpoints(this.hitpoints);
        }
        this.getParent()?.appendChild(enemy);
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
