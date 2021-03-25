import { asset } from "../../engine/assets/Assets";
import { BitmapFont } from "../../engine/assets/BitmapFont";
import { Sound } from "../../engine/assets/Sound";
import { ReadonlyVector2, Vector2, Vector2Like } from "../../engine/graphics/Vector2";
import { AsepriteNodeArgs } from "../../engine/scene/AsepriteNode";
import { OnlineSceneNode } from "../../engine/scene/OnlineSceneNode";
import { TextNode } from "../../engine/scene/TextNode";
import { cacheResult } from "../../engine/util/cache";
import { clamp } from "../../engine/util/math";
import { rnd } from "../../engine/util/random";
import { Layer, STANDARD_FONT } from "../constants";
import { Hyperloop } from "../Hyperloop";
import { CollisionNode } from "./CollisionNode";
import { DialogNode } from "./DialogNode";
import { InteractiveNode } from "./InteractiveNode";
import { MarkLineNode } from "./MarkLineNode";
import { ParticleNode, valueCurves } from "./ParticleNode";
import { PlayerArmNode } from "./player/PlayerArmNode";
import { PlayerLegsNode } from "./player/PlayerLegsNode";

// TODO define in some constants file
const GRAVITY = 800;
const PROJECTILE_STEP_SIZE = 2;

export abstract class CharacterNode extends OnlineSceneNode<Hyperloop> {
    @asset("sounds/fx/gunshot.ogg")
    private static readonly shootSound: Sound;
    private shootSound = CharacterNode.shootSound.shallowClone();

    @asset(STANDARD_FONT)
    private static readonly dialogFont: BitmapFont;

    protected playerLeg?: PlayerLegsNode;
    protected playerArm?: PlayerArmNode;
    protected playerName?: TextNode<Hyperloop>;
    private preventNewTag = false;
    private gameTime = 0;
    public dieCounter = 0;
    public killCounter = 0;

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
    protected removeOnDie = true;
    protected debug = true;
    private canInteractWith: InteractiveNode | null = null;
    protected battlemode = false;
    private battlemodeTimeout = 2000;
    private battlemodeTimeoutTimerId: number | null = null;
    private storedCollisionCoordinate: Vector2 | null = null;
    protected consecutiveXCollisions = 0;
    protected isPlayer = false;
    protected directionToPlayer = 0;
    protected distanceToPlayer = 0;
    protected soundVolume = 1;

    // Talking/Thinking
    private speakSince = 0;
    private speakUntil = 0;
    private speakLine = "";

    protected bloodEmitter: ParticleNode;
    protected sparkEmitter: ParticleNode;
    private particleOffset: Vector2 = new Vector2(0, 0);
    private particleAngle = 0;

    private dialogNode: DialogNode;
    private initDone = false;

    public constructor(keysOfPropertiesToSync: Array<string>, args: AsepriteNodeArgs) {
        super({keysOfPropertiesToSync: [...keysOfPropertiesToSync, "position", "direction", "velocity", "isOnGround", "isJumping", "isFalling", "hitpoints", "dieCounter", "killCounter", "tag"] ,...args});
        this.velocity = new Vector2(0, 0);
        // this.setShowBounds(true);

        this.bloodEmitter = new ParticleNode({
            offset: () => this.particleOffset,
            velocity: () => {
                const speed = rnd(20, 50);
                const angle = this.particleAngle + rnd(-1, 1) * rnd(0, Math.PI / 2) * rnd(0, 1) ** 2;
                return {
                    x: speed * Math.cos(angle),
                    y: speed * Math.sin(angle)
                };
            },
            color: () => `rgb(${rnd(100,240)}, ${rnd(0, 30)}, 0)`,
            size: rnd(1, 3),
            gravity: {x: 0, y: -100},
            lifetime: () => rnd(0.5, 1),
            alphaCurve: valueCurves.trapeze(0.05, 0.2)
        }).appendTo(this);
        this.sparkEmitter = new ParticleNode({
            offset: () => this.particleOffset,
            velocity: () => {
                const speed = rnd(40, 80);
                const angle = this.particleAngle + Math.PI + rnd(-1, 1) * rnd(0, Math.PI / 2) * rnd(0, 1) ** 2;
                return {
                    x: speed * Math.cos(angle),
                    y: speed * Math.sin(angle)
                };
            },
            color: () => {
                const g = rnd(130, 255), r = g + rnd(rnd(255 - g)), b = rnd(g);
                return `rgb(${r}, ${g}, ${b})`;
            },
            size: rnd(0.7, 1.8),
            gravity: {x: 0, y: -100},
            lifetime: () => rnd(0.5, 0.9),
            alphaCurve: valueCurves.trapeze(0.05, 0.2)
        }).appendTo(this);

        this.dialogNode = new DialogNode({
            font: CharacterNode.dialogFont,
            color: "white",
            outlineColor: "black",
            y: -30,
            layer: Layer.OVERLAY
        }).appendTo(this);
    }

    public update(dt: number, time: number): void {
        if (this.isInScene() && !this.initDone) {
            this.initDone = true;
        }
        super.update(dt, time);

        this.gameTime = time;
        this.updateTime = time;
        this.preventNewTag = this.getTag() === "die" && this.getTimesPlayed("die") === 0
            || this.getTag() === "hurt" && this.getTimesPlayed("hurt") === 0
            || this.getTag() === "attack" && this.getTimesPlayed("attack") === 0;

        // Death animation
        if (!this.isAlive()) {
            if (this.getTimesPlayed("die") > 0 && this.removeOnDie) {
                this.remove();
            } else if (this.getTimesPlayed("die") === 1 || this.getTag() === "dead") {
                this.setTag("dead");
            } else {
                this.setTag("die");
            }
            return;
        }
        // Acceleration
        let vx = 0;
        const tractionFactor = this.isOnGround ? 1 : 0.4;
        if (this.direction !== 0) {
            // Accelerate
            this.setTag("walk");
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
        const oldvy = this.velocity.y;
        const newvy = this.velocity.y + GRAVITY * dt;
        this.velocity = new Vector2(vx, newvy);
        let vy = (oldvy + newvy) / 2;

        // Movement
        this.isOnGround = false;
        const x = this.getX(), y = this.getY();
        if (vx !== 0 || vy !== 0) {
            let newX = x + vx * dt,
                newY = y + vy * dt;
            // X collision
            if (this.getPlayerCollisionAt(newX, y)) {
                newX = x;
                vx = 0;
                this.velocity = new Vector2(0, vy);
                this.consecutiveXCollisions += dt;
            } else {
                this.consecutiveXCollisions = 0;
            }
            // Y collision
            if (this.getPlayerCollisionAt(newX, newY)) {
                this.isOnGround = (vy > 0);
                if (this.isOnGround) {
                    this.isJumping = false;
                    this.isFalling = false;
                } else if (!this.isJumping) {
                    this.isFalling = true;
                }
                newY = y;
                vy = 0;
                this.velocity = new Vector2(vx, 0);
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

        if (this.speakLine && this.gameTime > this.speakSince && this.gameTime < this.speakUntil) {
            const progress = (this.gameTime - this.speakSince);
            const line = this.speakLine.substr(0, Math.ceil(28 * progress));
            this.dialogNode.setText(line);
        } else if (this.speakLine && this.gameTime > this.speakUntil) {
            const progress = (this.gameTime - this.speakUntil);
            const line = this.speakLine.substr(Math.ceil(58 * progress), this.speakLine.length);
            this.dialogNode.setText(line);
            if (line === "") {
                this.speakLine = "";
                this.speakUntil = 0;
                this.speakSince = 0;
            }
        } else {
            this.dialogNode.setText("");
        }

        if (this.getPlayerCollisionAt(this.x, this.y)) {
            this.unstuck();
        }
        this.updateDirectionToPlayer();
        this.syncCharacterState();
    }

    protected unstuck(): this {
        for (let i = 1; i < 100; i++) {
            if (!this.getPlayerCollisionAt(this.x, this.y - i)) {
                return this.moveTo(this.x, this.y - i);
            } else if (!this.getPlayerCollisionAt(this.x, this.y + i)) {
                return this.moveTo(this.x, this.y + i);
            } else if (!this.getPlayerCollisionAt(this.x - i, this.y)) {
                return this.moveTo(this.x - i, this.y);
            } else if (!this.getPlayerCollisionAt(this.x + i, this.y)) {
                return this.moveTo(this.x + i, this.y);
            }
        }
        return this;
    }

    /**
     * Checks if a character is within anybodies view.
     */
    protected isInAnybodiesView(): boolean {
        const scene = this.getScene();
        if (scene) {
            return [this.getGame().getPlayer(), ...this.getGame().getPlayers()].some(node => {
                const minX = node.getX() - 0.5 * scene.camera.getWidth();
                const minY = node.getY() - 0.5 * scene.camera.getHeight();
                const maxX = node.getX() + 0.5 * scene.camera.getWidth();
                const maxY = node.getY() + 0.5 * scene.camera.getHeight();
                const x = this.getX();
                const y = this.getY();
                return x >= minX && x <= maxX && y >= minY && y <= maxY;
            });
        }
        return false;
    }

    public setDirection(direction = 0): void {
        if (direction !== this.direction) {
            this.emitEvent("setDirection", direction);
        }
        this.direction = direction;
        if (this.direction !== 0) {
            this.setMirrorX(this.direction < 0);
        }
    }

    public jump(factor = 1): void {
        if (this.isOnGround && this.isAlive()) {
            this.emitEvent("jump", factor);
            this.velocity = new Vector2(this.velocity.x, -this.getJumpPower() * factor);
            this.isJumping = true;
        }
    }

    public shoot(angle: number, power: number, origin: Vector2Like = new Vector2(this.getScenePosition().x, this.getScenePosition().y - this.getHeight() * .5)): void {
        this.emitEvent("shoot");
        this.startBattlemode();
        this.shootSound.stop();
        if (this.distanceToPlayer > 0) {
            this.shootSound.setVolume(this.soundVolume, this.directionToPlayer);
            this.shootSound.play();
        } else if (this.isPlayer) {
            this.shootSound.setDirection(0);
            this.shootSound.setVolume(1);
            this.shootSound.play();
        }
        const diffX = Math.cos(angle) * this.getShootingRange();
        const diffY = Math.sin(angle) * this.getShootingRange();
        const isColliding = this.getLineCollision(origin.x, origin.y, diffX, diffY, PROJECTILE_STEP_SIZE);
        if (isColliding && this.storedCollisionCoordinate) {
            const coord = this.storedCollisionCoordinate;

            const markLineNode = new MarkLineNode(new Vector2(origin.x, origin.y), coord, this.filter ?? undefined);
            this.getParent()?.appendChild(markLineNode);
            if (isColliding instanceof CharacterNode) {
                const bounds = isColliding.getSceneBounds();
                const headshot = (coord.y < bounds.minY + 0.25 * (bounds.height));
                const damage = headshot ? (2.4 * power) : power;
                isColliding.hurt(damage, this.getIdentifier(), this.getScenePosition());
                // Blood particles at hurt character
                isColliding.emitBlood({x: coord.x, y: coord.y, angle, count: headshot ? 30 : 10});
            } else {
                this.emitSparks({x: coord.x, y: coord.y, angle});
            }
            this.storedCollisionCoordinate = null;
        } else {
            const markLineNode = new MarkLineNode(new Vector2(origin.x, origin.y), new Vector2(origin.x + diffX, origin.y + diffY), this.filter ?? undefined);
            this.getParent()?.appendChild(markLineNode);
        }
    }

    public emitBlood(args: {x: number, y: number, angle: number, count?: number}): void {
        this.emitEvent("emitBlood", args);
        const pos = this.getScenePosition();
        this.particleOffset = new Vector2(args.x - pos.x, args.y - pos.y + 20);
        this.particleAngle = -args.angle;
        this.bloodEmitter.emit(args.count ?? 1);
    }

    public emitSparks(args: {x: number, y: number, angle: number}): void {
        this.emitEvent("emitSparks", args);
        const pos = this.getScenePosition();
        this.particleOffset = new Vector2(args.x - pos.x, args.y - pos.y + 20);
        this.particleAngle = -args.angle;
        this.sparkEmitter.emit(rnd(4, 10));
    }

    protected getLineCollision(x1: number, y1: number, dx: number, dy: number, stepSize = 5): CharacterNode | CollisionNode | null {
        let isColliding: CharacterNode | CollisionNode | null = null;
        const nextCheckPoint = new Vector2(x1, y1);
        const length = Math.sqrt(dx * dx + dy * dy);
        const steps = Math.ceil(length / stepSize);
        const stepX = dx / steps, stepY = dy / steps;
        const enemies = this.getPersonalEnemies();
        const colliders = this.getColliders();
        for (let i = 0; i <= steps; i++) {
            isColliding = this.getPointCollision(nextCheckPoint.x, nextCheckPoint.y, enemies, colliders);
            nextCheckPoint.add({ x: stepX, y: stepY });
            if (isColliding) {
                this.storedCollisionCoordinate = nextCheckPoint;
                return isColliding;
            }
        }
        return null;
    }

    /**
     * Deal damage to the character.
     *
     * @param damage - Damage dealt, number > 0
     * @return True if hurt character dies, false otherwise.
     */
    public hurt(damage: number, attackerId: string | number | null, origin?: ReadonlyVector2, preventDeath = false): boolean {
        this.emitEvent("hurt", {damage, attackerId, origin});
        if (!this.isAlive()) {
            return false;
        }
        if (origin && !preventDeath) {
            // Pushback
            const direction = origin.x > this.getX() ? -1 : 1;
            const pushForce = damage * 2;
            this.velocity = new Vector2(pushForce * direction, this.velocity.y - pushForce * 0.1);
        }
        // Damage
        this.hitpoints -= damage;
        if (this.hitpoints <= 0) {
            this.die(attackerId ?? undefined);
            return true;
        } else {
            this.setTag("hurt");
            this.startBattlemode();
        }
        return false;
    }

    public setHitpoints(hp: number): void {
        this.emitEvent("setHitpoints", hp);
        this.hitpoints = hp;
    }

    public reset(): void {
        this.emitEvent("reset");
        this.velocity = new Vector2(0, 0);
        this.setTag("idle");
    }

    public say({line = "", duration = 0, delay = 0}): void {
        this.emitEvent("say", {line, duration, delay});
        this.speakSince = this.gameTime + delay;
        this.speakUntil = this.speakSince + duration;
        this.speakLine = line;
    }

    public setTag(tag: string | null): this {
        if (!this.preventNewTag) {
            if (this.getTag() !== tag) {
                this.emitEvent("setTag", tag);
            }
            super.setTag(tag);
            this.playerLeg?.setTag(tag);
            this.playerArm?.setTag(tag);
        }
        return this;
    }

    public die(attackerId?: string | number): void {
        this.emitEvent("die");
        this.endBattlemode();
        this.setTag("die");
        this.hitpoints = 0;
        this.dieCounter++;
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

    private getPointCollision(x: number, y: number, enemies = this.getPersonalEnemies(),
            colliders = this.getColliders()): CollisionNode | CharacterNode | null {
        // Enemies
        for (const c of enemies) {
            if (c.containsPoint(x, y)) {
                return c;
            }
        }
        // Level
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

    public getClosestPersonalEnemy(): CharacterNode | null {
        const enemies = this.getPersonalEnemies();
        const selfPos = this.getScenePosition();
        let bestDis = Infinity, closest: CharacterNode | null = null;
        for (const e of enemies) {
            const dis2 = e.getScenePosition().getSquareDistance(selfPos);
            if (dis2 < bestDis) {
                bestDis = dis2;
                closest = e;
            }
        }
        return closest;
    }

    public getHeadPosition(): Vector2 {
        const p = this.getScenePosition();
        const h = this.height;
        return new Vector2(p.x, p.y - h * 0.8);
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

    private updateDirectionToPlayer(): void {
        const distanceOnX = this.getX() - this.getGame().getPlayer().getX();
        this.directionToPlayer = Math.abs(distanceOnX) > 5 ? (clamp(distanceOnX, -300, 300) / 300) : 0;
        const absDistance = this.getGame().getPlayer().getPosition().getDistance(this.getPosition());
        this.distanceToPlayer = absDistance > 300 ? 0 : absDistance === 0 ? 0 : 1 / (clamp(absDistance, 5, 300) / 5);
        this.soundVolume = absDistance > 40 ? Math.sin(this.distanceToPlayer * 10) : 1;
    }
}
