import { Vector2 } from "../../engine/graphics/Vector2";
import { AsepriteNode } from "../../engine/scene/AsepriteNode";
import { clamp } from "../../engine/util/math";
import { Hyperloop } from "../Hyperloop";

export class CharacterNode extends AsepriteNode<Hyperloop> {

    // Character settings
    protected speed = 150;
    private acceleration = 1200;
    private deceleration = 1800;

    // Dynamic player state
    protected direction = 0;
    protected velocity: Vector2;
    protected isOnGround = true;

    public constructor(args: any) {
        super(args);
        this.velocity = new Vector2(0, 0);
    }

    public update(dt: number): void {
        super.update(dt);

        // Acceleration
        if (this.direction !== 0) {
            // Accelerate
            this.setTag("run");
            const vx = clamp(this.velocity.x + this.direction * this.acceleration * dt, -this.speed, this.speed);
            this.velocity = new Vector2(vx, this.velocity.y);
        } else {
            // Brake down
            this.setTag("idle");
            let vx = this.velocity.x;
            if (this.velocity.x > 0) {
                vx = clamp(this.velocity.x - this.deceleration * dt, 0, Infinity);
            } else {
                vx = clamp(this.velocity.x + this.deceleration * dt, -Infinity, 0);
            }
            this.velocity = new Vector2(vx, this.velocity.y);
        }

        // Movement
        if (this.velocity.x !== 0) {
            this.setX(this.getX() + this.velocity.x * dt);
        }
    }

    public setDirection(direction = 0): void {
        this.direction = direction;
        if (this.direction !== 0) {
            this.setMirrorX(this.direction < 0);
        }
    }
}
