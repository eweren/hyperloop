import { Line2 } from "../../engine/graphics/Line2";
import { Vector2 } from "../../engine/graphics/Vector2";
import { SceneNode } from "../../engine/scene/SceneNode";
import { Layer } from "../constants";
import { Hyperloop } from "../Hyperloop";


export class MarkLineNode extends SceneNode<Hyperloop> {
    private startTime = 0;
    private killTime = 0;

    public constructor(private start: Vector2, private end: Vector2) {
        super({
            width: 1,
            height: 1,
            layer: Layer.OVERLAY
        });
    }

    public update(dt: number, time: number): void {
        if (this.startTime === 0) {
            this.startTime = time;
            this.killTime = this.startTime + 5;
        } else if (time > this.killTime) {
            super.remove();
        }
    }

    public draw(context: CanvasRenderingContext2D): void {
        context.strokeStyle = "green";

        const line = new Line2(
            this.start,
            this.end
        );
        context.beginPath();
        line.draw(context);
        context.closePath();
        context.stroke();
    }
}
