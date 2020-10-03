import { Aseprite } from "../../engine/assets/Aseprite";
import { asset } from "../../engine/assets/Assets";
import { Direction } from "../../engine/geom/Direction";
import { Line2 } from "../../engine/graphics/Line2";
import { Polygon2 } from "../../engine/graphics/Polygon2";
import { Vector2 } from "../../engine/graphics/Vector2";
import { ControllerIntent } from "../../engine/input/ControllerIntent";
import { SceneNodeArgs } from "../../engine/scene/SceneNode";
import { CharacterNode } from "./CharacterNode";

export class PlayerNode extends CharacterNode {
    @asset("sprites/female.aseprite.json")
    private static sprite: Aseprite;

    private mousePosition = new Vector2(0, 0);
    private aimingAngle = 0;

    // for debug purposes
    private drawDebugStuff = true;

    // Character settings
    private readonly shootingRange = 150;
    private readonly speed = 150;
    private readonly acceleration = 1200;
    private readonly deceleration = 1800;
    private readonly jumpPower = 380;

    public constructor(args?: SceneNodeArgs) {
        super({
            aseprite: PlayerNode.sprite,
            anchor: Direction.BOTTOM,
            tag: "idle",
            id: "player",
            ...args
        });
        window.addEventListener("pointermove", event => this.mouseMoved(event));
        console.log("Player: ", this);
    }

    public getShootingRange(): number {
        return this.shootingRange;
    }
    public getSpeed(): number {
        return this.speed;
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

    protected updateBoundsPolygon(bounds: Polygon2): void {
        const boundsWidth = 14;
        const boundsHeight = 46;
        const offsetX = this.getWidth() / 2 - boundsWidth / 2;
        const offsetY = 8;
        bounds.clear();
        bounds.addVertex(new Vector2(offsetX, offsetY));
        bounds.addVertex(new Vector2(offsetX + boundsWidth, offsetY));
        bounds.addVertex(new Vector2(offsetX + boundsWidth, boundsHeight));
        bounds.addVertex(new Vector2(offsetX, boundsHeight));
    }

    public update(dt: number, time: number) {
        super.update(dt, time);
        if (!this.isAlive()) {
            this.setDirection(0);
            return;
        }
        // Aiming
        this.aimingAngle = this.getAimingAngle();
        // Controls
        const input = this.getScene()!.game.input;
        // Run left/right
        const direction = (input.currentActiveIntents & ControllerIntent.PLAYER_MOVE_RIGHT ? 1 : 0)
            - (input.currentActiveIntents & ControllerIntent.PLAYER_MOVE_LEFT ? 1 : 0);
        this.setDirection(direction);
        // Jump
        if (input.currentActiveIntents & ControllerIntent.PLAYER_JUMP) {
            this.jump();
        }
        // Shoot
        if (input.currentActiveIntents & ControllerIntent.PLAYER_ACTION) {
            this.shoot(this.aimingAngle);
        }
    }

    public draw(context: CanvasRenderingContext2D): void {
        super.draw(context);

        if (this.drawDebugStuff) {
            this.drawAimingLine(context);
        }
    }

    /**
     * Handles a mouse move and recalculates the position of the mouse relative to the canvas with the canvas scale.
     */
    private mouseMoved(event: PointerEvent): void {
        const sceneCanvas = this.getScene()?.game.canvas;
        if (!sceneCanvas) {
            return;
        }
        const { x, y, width } = sceneCanvas.getBoundingClientRect();
        const canvasScale = sceneCanvas.width / width;
        this.mousePosition = new Vector2((event.x - x) * canvasScale, ((event.y - y) * canvasScale) + this.getHeight() / 2);
    }

    /**
     * Recalculates the angle between the x-axis and the mouse position relative from the center of the playerNode.
     * Therefore we also have to recalculate the mousePosition relative to the camera position.
     */
    private getAimingAngle(): number {
        const positionInScene = this.getScenePosition();
        const camera = this.getScene()?.camera;
        if (camera) {
            const cameraPosition = new Vector2(camera.getLeft(), camera.getTop());
            const mousePosition = this.mousePosition.clone().add(cameraPosition);
            const angleVector = mousePosition.sub(positionInScene);

            const angle = Math.atan2(angleVector.x, angleVector.y);
            return angle + Math.PI * 3 / 2;
        }
        return 0;
    }

    private drawAimingLine(context: CanvasRenderingContext2D): void {
        // Draw aiming line
        context.save();
        const playerBounds = this.getBounds();
        const playerCenter = new Vector2(playerBounds.centerX, playerBounds.centerY);
        const endOfLine = new Vector2(
            playerCenter.x + this.shootingRange * Math.cos(this.aimingAngle),
            playerCenter.y - this.shootingRange * Math.sin(this.aimingAngle)
        );
        const line = new Line2(
            playerCenter,
            endOfLine
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
