import { Aseprite } from "../../engine/assets/Aseprite";
import { asset } from "../../engine/assets/Assets";
import { Direction } from "../../engine/geom/Direction";
import { Line2 } from "../../engine/graphics/Line2";
import { Vector2 } from "../../engine/graphics/Vector2";
import { ControllerIntent } from "../../engine/input/ControllerIntent";
import { CharacterNode } from "./CharacterNode";

export class PlayerNode extends CharacterNode {
    @asset("sprites/female.aseprite.json")
    private static sprite: Aseprite;

    private mousePosition = new Vector2(0, 0);
    private aimingAngle = 0;

    // for debug purposes
    private drawDebugStuff = true;

    public constructor() {
        super({
            aseprite: PlayerNode.sprite,
            anchor: Direction.BOTTOM,
            tag: "idle"
        });
        window.addEventListener("pointermove", event => this.mouseMoved(event));
    }

    public update(dt: number) {
        super.update(dt);
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

    private mouseMoved(event: PointerEvent): void {
        const sceneCanvas = this.getScene()?.game.canvas;
        if (!sceneCanvas) {
            return;
        }
        const { x, y, width } = sceneCanvas.getBoundingClientRect();
        const canvasScale = sceneCanvas.width / width;
        this.mousePosition = new Vector2((event.x - x) * canvasScale, (event.y - y) * canvasScale);
    }

    private getAimingAngle(): number {
        const positionInScene = new Vector2(this.getX() + this.getWidth() / 2, this.getY() - this.getHeight() / 2);
        const angleVector = this.mousePosition.clone().sub(positionInScene);
        const angle = Math.atan2(angleVector.x, angleVector.y);
        return angle + Math.PI * 3 / 2;
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

    }
}
