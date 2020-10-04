import { asset } from "../../engine/assets/Assets";
import { Sound } from "../../engine/assets/Sound";
import { Line2 } from "../../engine/graphics/Line2";
import { ReadonlyVector2, Vector2, Vector2Like } from "../../engine/graphics/Vector2";
import { AsepriteNode, AsepriteNodeArgs } from "../../engine/scene/AsepriteNode";
import { cacheResult } from "../../engine/util/cache";
import { clamp } from "../../engine/util/math";
import { Hyperloop } from "../Hyperloop";
import { CollisionNode } from "./CollisionNode";
import { InteractiveNode } from "./InteractiveNode";
import { PlayerArmNode } from "./player/PlayerArmNode";
import { PlayerLegsNode } from "./player/PlayerLegsNode";
import { PlayerNode } from "./PlayerNode";

// TODO define in some constants file
const GRAVITY = 1200;
const PROJECTILE_STEP_SIZE = 5;

export abstract class CharacterNode extends AsepriteNode<Hyperloop> {
    @asset("sounds/fx/gunshot.ogg")
    private static readonly shootSound: Sound;

    protected playerLeg?: PlayerLegsNode;
    protected playerArm?: PlayerArmNode;

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
    protected debug = false;
    private canInteractWith: InteractiveNode | null = null;
    protected battlemode = false;
    private battlemodeTimeout = 2000;
    private battlemodeTimeoutTimerId: number | null = null;
    private bulletStartPoint: Vector2 | null = null;
    private bulletEndPoint: Vector2 | null = null;

    public constructor(args: AsepriteNodeArgs) {
        super(args);
        this.velocity = new Vector2(0, 0);
        // this.setShowBounds(true);
    }

    public update(dt: number, time: number): void {
        super.update(dt, time);
        this.updateTime = time;

        // Death animation
        if (!this.isAlive()) {
            this.setTag("die");
            if (this.getTimesPlayed("die") > 0) {
                this.remove();
            }
            return;
        }
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

    public shoot(angle: number, power: number, origin: Vector2Like = new Vector2(this.getScenePosition().x, this.getScenePosition().y - this.getHeight() * .5)): void {
        this.startBattlemode();
        CharacterNode.shootSound.stop();
        CharacterNode.shootSound.play();
        const diffX = Math.cos(angle) * this.getShootingRange();
        const diffY = Math.sin(angle) * this.getShootingRange();
        const isColliding = this.getLineCollision(origin.x, origin.y, diffX, diffY, PROJECTILE_STEP_SIZE);
        if (isColliding) {
            if (isColliding instanceof CharacterNode) {
                isColliding.hurt(power, this.getScenePosition());
            }
        }
    }

    protected getLineCollision(x1: number, y1: number, dx: number, dy: number, stepSize = 5): CharacterNode | CollisionNode | null {
        let isColliding: CharacterNode | CollisionNode | null = null;
        const nextCheckPoint = new Vector2(x1, y1);
        const length = Math.sqrt(dx * dx + dy * dy);
        const steps = Math.ceil(length / stepSize);
        const stepX = dx / steps, stepY = dy / steps;
        for (let i = 0; i < steps; i++) {
            isColliding = this.getPointCollision(nextCheckPoint.x, nextCheckPoint.y);
            nextCheckPoint.add({ x: stepX, y: stepY });
            if (this.debug) {
                this.bulletStartPoint = this.bulletStartPoint!.add({ x: stepX, y: stepY });
                this.bulletEndPoint = this.bulletEndPoint!.add({ x: stepX, y: stepY });
            }
            if (isColliding) {
                return isColliding;
            }
        }
        return null;
    }

    public draw(context: CanvasRenderingContext2D): void {
        super.draw(context);
        if (this.debug) {
            this.drawShootingLine(context);
        }
    }

    private drawShootingLine(context: CanvasRenderingContext2D): void {
        // Draw shot line
        if (this.bulletStartPoint && this.bulletEndPoint) {
            context.save();
            const line = new Line2(
                this.bulletStartPoint,
                this.bulletEndPoint
            );
            context.save();
            context.beginPath();
            line.draw(context);
            context.strokeStyle = "#ffffff";
            context.stroke();
            context.closePath();
            context.restore();
            context.restore();
        }
    }

    /**
     * Deal damage to the character.
     *
     * @param damage - Damage dealt, number > 0
     * @return True if hurt character dies, false otherwise.
     */
    public hurt(damage: number, origin: ReadonlyVector2): boolean {
        if (!this.isAlive()) {
            return false;
        }
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
            this.setTag("hurt");
            this.playerLeg?.setTag("hurt");
            this.startBattlemode();
        }
        return false;
    }

    public setTag(tag: string | null): this {
        super.setTag(tag);
        this.playerLeg?.setTag(tag);
        this.playerArm?.setTag(tag);
        return this;
    }

    public die(): void {
        this.setTag("die");
        this.playerLeg?.setTag("die");
        this.hitpoints = 0;
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
        const bounds = this.getSceneBounds();
        const w = bounds.width, h = bounds.height;
        const px = bounds.minX + x - this.getX(), py = bounds.minY + y - this.getY();
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
        const {minX, minY, maxX, maxY} = this.getSceneBounds();
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
