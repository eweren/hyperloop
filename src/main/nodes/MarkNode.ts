import { SceneNode, SceneNodeArgs } from "../../engine/scene/SceneNode";
import { Layer } from "../constants";
import { Hyperloop } from "../Hyperloop";


export class MarkNode extends SceneNode<Hyperloop> {
    private startTime = 0;
    private killTime = 0;

    public constructor(args: SceneNodeArgs) {
        super({
            width: 1,
            height: 1,
            layer: Layer.OVERLAY,
            ... args
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
        context.beginPath();
        context.moveTo(0, 3);
        context.arc(0, 0, 3, 0, 6.28);
        context.closePath();
        context.stroke();
    }
}
