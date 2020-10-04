import { Sound } from "../../engine/assets/Sound";
import { ReadonlyVector2, Vector2 } from "../../engine/graphics/Vector2";
import { AsepriteNode, AsepriteNodeArgs } from "../../engine/scene/AsepriteNode";
import { SoundNode } from "../../engine/scene/SoundNode";
import { cacheResult } from "../../engine/util/cache";
import { clamp } from "../../engine/util/math";
import { Hyperloop } from "../Hyperloop";
import { CollisionNode } from "./CollisionNode";
import { InteractiveNode } from "./InteractiveNode";
import { PlayerNode } from "./PlayerNode";

// TODO define in some constants file
const GRAVITY = 1200;
const PROJECTILE_STEP_SIZE = 5;

export abstract class CharacterNode extends AsepriteNode<Hyperloop> {

    // Character settings
    public abstract getShootingRange(): number;
    public abstract getSpeed(): number;
    public abstract getAcceleration(): number;
    public abstract getDeceleration(): number;
    public abstract getJumpPower(): number;

    // Dynamic player state
    protected updateTime = 0;
    protected direction = 0;
    protected velocity: Vector2;
    protected isOnGround = true;
    protected isJumping = false;
    protected isFalling = true;
    protected hitpoints = 100;
    protected shootNode: SoundNode | null = null;
    private canInteractWith: InteractiveNode | null = null;
    protected battlemode = false;
    private battlemodeTimeout = 2000;
    private battlemodeTimeoutTimerId: number | null = null;

    public constructor(args: AsepriteNodeArgs) {
        super(args);
        this.velocity = new Vector2(0, 0);
        // this.setShowBounds(true);
        this.setUpFx();
    }

    private async setUpFx(): Promise<void> {
        this.shootNode = new SoundNode({ sound: await Sound.load("assets/sounds/fx/shot.mp3"), range: this.getShootingRange() });
    }

    public update(dt: number, time: number): void {
        super.update(dt, time);
        this.updateTime = time;

        // Acceleration
        let vx = 0;
        const tractionFactor = this.isOnGround ? 1 : 0.4;
        if (this.direction !== 0) {
            // Accelerate
            this.setTag("run");
            vx = clamp(this.velocity.x + this.direction * tractionFactor * this.getAcceleration() * dt,
                    -this.getSpeed(), this.getSpeed());
        } else {
            // Brake down
            this.setTag("idle");
            if (this.velocity.x > 0) {
                vx = clamp(this.velocity.x - tractionFactor * this.getDeceleration() * dt, 0, Infinity);
            } else {
                vx = clamp(this.velocity.x + tractionFactor * this.getDeceleration() * dt, -Infinity, 0);
            }
        }
        // Death animation
        if (!this.isAlive()) {
            // TODO death animation
            this.setTag("dance-fluke-1");
            if (this.getTransformation().getRotation() === 0) {
                this.transform(c => {
                    c.translateY(-10);
                    c.rotate(90 / 180 * Math.PI);
                });
            }
        }

        // Gravity
        const vy = this.velocity.y + GRAVITY * dt;
        this.velocity = new Vector2(vx, vy);

        // Movement
        this.isOnGround = false;
        const x = this.getX(), y = this.getY();
        if (this.velocity.x !== 0 || this.velocity.y !== 0) {
            let newX = x + this.velocity.x * dt,
                newY = y + this.velocity.y * dt;
            // X collision
            if (this.getPlayerCollisionAt(newX, y)) {
                newX = x;
                this.velocity = new Vector2(0, this.velocity.y);
            }
            // Y collision
            if (this.getPlayerCollisionAt(newX, newY)) {
                this.isOnGround = (this.velocity.y > 0);
                if (this.isOnGround) {
                    this.isJumping = false;
                    this.isFalling = false;
                } else if (!this.isJumping) {
                    this.isFalling = true;
                }
                newY = y;
                this.velocity = new Vector2(this.velocity.x, 0);
            }
            // Apply
            if (newX !== x || newY !== y) {
                this.setX(newX);
                this.setY(newY);
            }
        }
        if (this.isJumping) {
            this.setTag("jump");
        }
        if (this.isFalling) {
            this.setTag("fall");
        }
    }

    public setDirection(direction = 0): void {
        this.direction = direction;
        if (this.direction !== 0) {
            this.setMirrorX(this.direction < 0);
        }
    }

    public jump(factor = 1): void {
        if (this.isOnGround && this.isAlive()) {
            this.velocity = new Vector2(this.velocity.x, -this.getJumpPower() * factor);
            this.isJumping = true;
        }
    }

    public shoot(angle: number, power: number): void {
        this.startBattlemode();
        const scenePosition = this.getScenePosition();
        this.shootNode?.setX(scenePosition.x);
        this.shootNode?.setY(scenePosition.y);
        this.shootNode?.getSound().stop();
        this.shootNode?.getSound().play();
        const origin = new Vector2(scenePosition.x, scenePosition.y - this.getHeight() * .5);
        const diffX = Math.cos(angle);
        const diffY = -Math.sin(angle);
        let isColliding: CharacterNode | CollisionNode | null = null;
        for (let i = 0; i < this.getShootingRange(); i += PROJECTILE_STEP_SIZE) {
            isColliding = this.getPointCollision(origin.x + i * diffX, origin.y + i * diffY);
            if (isColliding) {
                // Hurt the thing
                if (isColliding instanceof CharacterNode) {
                    isColliding.hurt(power, this.getScenePosition());
                }
                break;
            }
        }
    }

    /**
     * Deal damage to the character.
     *
     * @param damage - Damage dealt, number > 0
     * @return True if hurt character dies, false otherwise.
     */
    public hurt(damage: number, origin: ReadonlyVector2): boolean {
        // TODO reduce hit points or kill or something
        // Pushback
        const direction = origin.x > this.getX() ? -1 : 1;
        const pushForce = damage * 5;
        this.velocity = new Vector2(pushForce * direction, this.velocity.y - pushForce * 0.1);
        // Damage
        this.hitpoints -= damage;
        if (this.hitpoints <= 0) {
            this.die();
            return true;
        } else {
            this.startBattlemode();
        }
        return false;
    }

    public die(): void {
        this.hitpoints = 0;
        this.setOpacity(0.5);
    }

    public isAlive(): boolean {
        return this.hitpoints > 0;
    }

    public isInBattlemode(): boolean {
        return this.battlemode;
    }

    protected startBattlemode(): void {
        this.battlemode = true;
        // refresh timer
        this.clearBattlemodeTimer();
        this.battlemodeTimeoutTimerId = <any>setTimeout(() => {
                this.endBattlemode();
            }, this.battlemodeTimeout);
    }

    protected endBattlemode(): void {
        if (!this.battlemode) {
            return;
        }
        this.clearBattlemodeTimer();
        this.battlemode = false;
    }

    private clearBattlemodeTimer(): void {
        if (this.battlemodeTimeoutTimerId) {
            clearInterval(this.battlemodeTimeoutTimerId);
            this.battlemodeTimeoutTimerId = null;
        }
    }

    private getPlayerCollisionAt(x = this.getX(), y = this.getY()): boolean {
        // Level collision
        const colliders = this.getColliders();
        const bounds = this.getBounds();
        const w = bounds.width, h = bounds.height;
        const px = x - w / 2, py = y - h;
        return colliders.some(c => c.collidesWithRectangle(px, py, w, h));
    }

    private getPointCollision(x: number, y: number): CollisionNode | CharacterNode | null {
        // Enemies
        const enemies = this.getPersonalEnemies();
        for (const c of enemies) {
            if (c.containsPoint(x, y)) {
                return c;
            }
        }
        // Level
        const colliders = this.getColliders();
        for (const c of colliders) {
            if (c.containsPoint(x, y)) {
                return c;
            }
        }
        return null;
    }

    @cacheResult
    private getColliders(): CollisionNode[] {
        const colliders = this.getScene()?.rootNode.getDescendantsByType(CollisionNode) ?? [];
        return colliders;
    }

    public abstract getPersonalEnemies(): CharacterNode[];

    public getPlayers(): PlayerNode[] {
        const players = this.getScene()?.rootNode.getDescendantsByType(PlayerNode) ?? [];
        return players;
    }

    public containsPoint(x: number, y: number): boolean {
        const bounds = this.getSceneBounds();
        const minX = bounds.minX, minY = bounds.minY, maxX = bounds.maxX, maxY = bounds.maxY;
        return x >= minX && x <= maxX && y >= minY && y <= maxY;
    }

    public registerInteractiveNode(node: InteractiveNode): void {
        this.canInteractWith = node;
    }

    public unregisterInteractiveNode(node: InteractiveNode): void {
        if (this.canInteractWith === node) {
            this.canInteractWith = null;
        }
    }

    public getNodeToInteractWith(): InteractiveNode | null {
        return this.canInteractWith;
    }
}
