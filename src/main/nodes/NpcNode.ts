import { Aseprite } from "../../engine/assets/Aseprite";
import { CharacterNode } from "./CharacterNode";
import { Direction } from "../../engine/geom/Direction";
import { EnemyNode } from "./EnemyNode";

import { SceneNodeArgs } from "../../engine/scene/SceneNode";
import { asset } from "../../engine/assets/Assets";
import { Rect } from "../../engine/geom/Rect";
import { UserEvent } from "../../engine/Game";
import { Vector2 } from "../../engine/graphics/Vector2";

export class NpcNode extends CharacterNode {
    @asset([
        "sprites/male.aseprite.json",
        "sprites/female.aseprite.json",
        "sprites/male2.aseprite.json",
        "sprites/male3.aseprite.json",
        "sprites/female2.aseprite.json",
        "sprites/female3.aseprite.json"
    ])
    private static sprites: Aseprite[];

    // Character settings
    private readonly acceleration = 600;
    private readonly deceleration = 800;
    private readonly jumpPower = 295;

    public constructor(spriteIndex: number, args?: SceneNodeArgs) {
        super({
            aseprite: NpcNode.sprites[spriteIndex] ? NpcNode.sprites[spriteIndex] : NpcNode.sprites[0],
            anchor: Direction.BOTTOM,
            childAnchor: Direction.CENTER,
            tag: "idle",
            id: "player",
            sourceBounds: new Rect(6, 10, 8, 26),
            ...args
        });
    }

    protected unstuck(): this {
        return this;
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

    protected updateCharacterState(): void {
        if (!this.getGame().isHost) {
            return;
        }
        const currentState = {
            direction: this.direction,
            hitpoints: this.hitpoints,
            isFalling: this.isFalling,
            isJumping: this.isJumping,
            isOnGround: this.isOnGround,
            position: this.getPosition(),
            velocity: this.velocity,
            enemyId: this.getId() ?? undefined
        };
        const updateObj: Partial<UserEvent> = {};
        for (const property in currentState) {
            if ((currentState as any)[property] !== (this.lastSubmittedState as any)[property]) {
                if ((currentState as any)[property] instanceof Vector2) {
                    const { x, y } = (currentState as any)[property];
                    if (!(this.lastSubmittedState as any)[property] || x !== (this.lastSubmittedState as any)[property].x || y !== (this.lastSubmittedState as any)[property].y) {
                        (updateObj as any)[property] = (currentState as any)[property];
                    }
                } else {
                    (updateObj as any)[property] = (currentState as any)[property];
                }
            }
        }
        if (Object.entries(updateObj).length > 0 && this.isInView()) {
            this.getGame().updatePosition(updateObj);
        }
        this.lastSubmittedState = {
            direction: this.direction,
            hitpoints: this.hitpoints,
            isFalling: this.isFalling,
            isOnGround: this.isOnGround,
            position: this.getPosition(),
            velocity: this.velocity,
            enemyId: this.getId() ?? undefined
        };
    }

}
