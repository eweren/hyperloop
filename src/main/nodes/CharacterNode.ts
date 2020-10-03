import { Vector2 } from "../../engine/graphics/Vector2";
import { AsepriteNode, AsepriteNodeArgs } from "../../engine/scene/AsepriteNode";
import { clamp } from "../../engine/util/math";
import { Hyperloop } from "../Hyperloop";

// TODO define in some constants file
const GRAVITY = 1200;

export class CharacterNode extends AsepriteNode<Hyperloop> {

    // Character settings
    protected shootingRange = 150;
    protected speed = 150;
    private acceleration = 1200;
    private deceleration = 1800;
    private jumpPower = 380;

    // Dynamic player state
    protected direction = 0;
    protected velocity: Vector2;
    protected isOnGround = true;

    public constructor(args: AsepriteNodeArgs) {
        super(args);
        this.velocity = new Vector2(0, 0);
    }

    public update(dt: number): void {
        super.update(dt);

        // Acceleration
        let vx = 0;
        if (this.direction !== 0) {
            // Accelerate
            this.setTag("run");
            vx = clamp(this.velocity.x + this.direction * this.acceleration * dt, -this.speed, this.speed);
        } else {
            // Brake down
            this.setTag("idle");
            if (this.velocity.x > 0) {
                vx = clamp(this.velocity.x - this.deceleration * dt, 0, Infinity);
            } else {
                vx = clamp(this.velocity.x + this.deceleration * dt, -Infinity, 0);
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
            this.velocity = new Vector2(this.velocity.x, -this.jumpPower * factor);
        }
    }

    public shoot(angle: number): void {
        // const scenePosition = this.getScenePosition();
        // const origin = new Vector2(scenePosition.x, scenePosition.y - this.getHeight() * .5);
        // const diffX = Math.cos(angle);
        // const diffY = Math.sin(angle);
        // let isColliding = false;
        // for (let i = 0; i < this.shootingRange; i += PROJECTILE_STEP_SIZE) {
        //     isColliding = this.getCollisionAt(origin.x + i * diffX, origin.y + i * diffY);
        // }
        // const endOfLine = new Vector2(origin.x + diffX * this.shootingRange, origin.y + diffY * this.shootingRange);
        // const ctx = this.getScene()?.game.canvas.getContext("2d");
        // if (ctx) {
        //     this.aimLine = new Line2(origin, endOfLine);
        //     this.aimLine.draw(ctx);
        // }
        // console.log(diffX, diffY);
        // console.log(angle, isColliding);
    }

    private getCollisionAt(x = this.getX(), y = this.getY()): boolean {
        // Mocked collision detection
        return (x <= 150 && y > 230) || y > 270 || x < 0 || x > 480;
    }
}
