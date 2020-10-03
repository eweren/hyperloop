import { Vector2 } from "../../engine/graphics/Vector2";
import { AsepriteNode, AsepriteNodeArgs } from "../../engine/scene/AsepriteNode";
import { cacheResult } from "../../engine/util/cache";
import { clamp } from "../../engine/util/math";
import { Hyperloop } from "../Hyperloop";
import { CollisionNode } from "./CollisionNode";

// TODO define in some constants file
const GRAVITY = 1200;

export abstract class CharacterNode extends AsepriteNode<Hyperloop> {

    public abstract getSpeed(): number;
    public abstract getAcceleration(): number;
    public abstract getDeceleration(): number;
    public abstract getJumpPower(): number;

    // Dynamic player state
    protected direction = 0;
    protected velocity: Vector2;
    protected isOnGround = true;

    public constructor(args: AsepriteNodeArgs) {
        super(args);
        this.velocity = new Vector2(0, 0);
        this.setShowBounds(true);
    }

    public update(dt: number, time: number): void {
        super.update(dt, time);

        // Acceleration
        let vx = 0;
        if (this.direction !== 0) {
            // Accelerate
            this.setTag("run");
            vx = clamp(this.velocity.x + this.direction * this.getAcceleration() * dt, -this.getSpeed(), this.getSpeed());
        } else {
            // Brake down
            this.setTag("idle");
            if (this.velocity.x > 0) {
                vx = clamp(this.velocity.x - this.getDeceleration() * dt, 0, Infinity);
            } else {
                vx = clamp(this.velocity.x + this.getDeceleration() * dt, -Infinity, 0);
            }
        }

        // Gravity
        const vy = this.velocity.y + GRAVITY * dt;
        this.velocity = new Vector2(vx, vy);

        // Movement
        this.isOnGround = false;
        if (this.velocity.x !== 0 || this.velocity.y !== 0) {
            let newX = this.getX() + this.velocity.x * dt,
                newY = this.getY() + this.velocity.y * dt;
            // X collision
            if (this.getCollisionAt(newX, this.getY())) {
                newX = this.getX();
                this.velocity = new Vector2(0, this.velocity.y);
            }
            // Y collision
            if (this.getCollisionAt(newX, newY)) {
                this.isOnGround = (this.velocity.y > 0);
                newY = this.getY();
                this.velocity = new Vector2(this.velocity.x, 0);
            }
            // Apply
            if (newX !== this.getX() || newY !== this.getY()) {
                this.setX(newX);
                this.setY(newY);
            }
        }
    }

    public setDirection(direction = 0): void {
        this.direction = direction;
        if (this.direction !== 0) {
            this.setMirrorX(this.direction < 0);
        }
    }

    public jump(factor = 1): void {
        if (this.isOnGround) {
            this.velocity = new Vector2(this.velocity.x, -this.getJumpPower() * factor);
        }
    }

    public hurt(): void {
        // TODO reduce hit points or kill or something
        this.jump(0.3);
    }

    private getCollisionAt(x = this.getX(), y = this.getY()): boolean {
        // Enemy collision
        // TODO
        // Level collision
        const colliders = this.getColliders();
        const bounds = this.getBounds();
        const w = bounds.width, h = bounds.height;
        const px = x - w / 2, py = y - h;
        return y > 270 || colliders.some(c => c.collidesWithRectangle(px, py, w, h));
    }

    @cacheResult
    private getColliders(): CollisionNode[] {
        const colliders = this.getScene()?.rootNode.getDescendantsByType(CollisionNode) ?? [];
        colliders.forEach(c => c.setShowBounds(true));
        return colliders;
    }
}
