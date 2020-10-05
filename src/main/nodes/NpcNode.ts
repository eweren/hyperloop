import { Aseprite } from "../../engine/assets/Aseprite";
import { CharacterNode } from "./CharacterNode";
import { Direction } from "../../engine/geom/Direction";
import { EnemyNode } from "./EnemyNode";

import { SceneNodeArgs } from "../../engine/scene/SceneNode";
import { asset } from "../../engine/assets/Assets";
import { Rect } from "../../engine/geom/Rect";

export class NpcNode extends CharacterNode {
    @asset("sprites/male.aseprite.json")
    private static maleSprite: Aseprite;
    @asset("sprites/female.aseprite.json")
    private static femaleSprite: Aseprite;

    // Character settings
    private readonly acceleration = 600;
    private readonly deceleration = 800;
    private readonly jumpPower = 295;

    public constructor(female: boolean, args?: SceneNodeArgs) {
        super({
            aseprite: female ? NpcNode.femaleSprite : NpcNode.maleSprite,
            anchor: Direction.BOTTOM,
            childAnchor: Direction.CENTER,
            tag: "idle",
            id: "player",
            sourceBounds: new Rect(6, 6, 8, 26),
            ...args
        });
    }

    public getShootingRange(): number {
        return 1;
    }
    public getSpeed(): number {
        return 1;
    }
    public getAcceleration(): number {
        return this.acceleration;
    }
    public getDeceleration(): number {
        return this.deceleration;
    }
    public getJumpPower(): number {
        return this.jumpPower;
    }

    public update(dt: number, time: number) {
        super.update(dt, time);
    }


    public die(): void {
        super.die();
    }


    public getPersonalEnemies(): EnemyNode[] {
        return [];
    }

}
