import { Aseprite } from "../../engine/assets/Aseprite";
import { CharacterNode } from "./CharacterNode";
import { Direction } from "../../engine/geom/Direction";
import { EnemyNode } from "./EnemyNode";

import { Polygon2 } from "../../engine/graphics/Polygon2";
import { SceneNodeArgs } from "../../engine/scene/SceneNode";
import { Vector2 } from "../../engine/graphics/Vector2";
import { asset } from "../../engine/assets/Assets";

export class NpcNode extends CharacterNode {
    @asset("sprites/spacesuitbody.aseprite.json")
    private static sprite: Aseprite;

    /** The aimingAngle in radians */
    private ammo = 6;

    // Character settings
    private readonly shootingRange = 250;
    private readonly speed = 60;
    private readonly acceleration = 600;
    private readonly deceleration = 800;
    private readonly jumpPower = 295;
    private readonly magazineSize = 6;

    public constructor(args?: SceneNodeArgs) {
        super({
            aseprite: NpcNode.sprite,
            anchor: Direction.BOTTOM,
            childAnchor: Direction.CENTER,
            tag: "idle",
            id: "player",
            ...args
        });
    }

    public getShootingRange(): number {
        return this.shootingRange;
    }
    public getSpeed(): number {
        // TODO remove before publishing
        return this.speed * (this.getScene()?.keyboard.isPressed("Shift") ? 4 : 1);
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
    public getAmmo(): number {
        return this.ammo;
    }
    public getMagazineSize(): number {
        return this.magazineSize;
    }

    public updateBoundsPolygon(bounds: Polygon2): void {
        const boundsWidth = 8;
        const boundsHeight = 26;
        const offsetX = this.getWidth() / 2 - boundsWidth / 2;
        const offsetY = 6;
        bounds.clear();
        bounds.addVertex(new Vector2(offsetX, offsetY));
        bounds.addVertex(new Vector2(offsetX + boundsWidth, offsetY));
        bounds.addVertex(new Vector2(offsetX + boundsWidth, boundsHeight + offsetY));
        bounds.addVertex(new Vector2(offsetX, boundsHeight + offsetY));
    }

    public update(dt: number, time: number) {
        super.update(dt, time);
    }


    public die(): void {
        super.die();
    }


    public getPersonalEnemies(): EnemyNode[] {
        return [];
        // const monsters = this.getScene()?.rootNode.getDescendantsByType(MonsterNode) ?? [];
        // const rats = this.getScene()?.rootNode.getDescendantsByType(RatNode) ?? [];
        // const enemies = [...monsters, ...rats];
        // return enemies.filter(e => e.isAlive());
    }

}
