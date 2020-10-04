
import { Direction } from "../../../engine/geom/Direction";
import { SceneNode, SceneNodeArgs } from "../../../engine/scene/SceneNode";
import { Hyperloop } from "../../Hyperloop";

export class FlashlightNode extends SceneNode<Hyperloop> {
    private static image = FlashlightNode.generateImage(200, 100);

    public constructor(args?: SceneNodeArgs) {
        super({
            anchor: Direction.TOP,
            id: "flashlight",
            x: 0,
            y: -54,
            layer: 1,
            ...args
        });
        // Debug code to add flashlight to DOM to see raw data
        // FlashlightNode.image.style.position = "fixed";
        // FlashlightNode.image.style.zIndex = "999";
        // document.body.appendChild(FlashlightNode.image);
    }

    public draw(context: CanvasRenderingContext2D): void {
        context.drawImage(FlashlightNode.image, 0, 0);
    }

    private static generateImage(width: number, height: number): HTMLImageElement {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const ymid = height / 2;
        for (let y = 0; y < height; y++) {
            const dy = Math.abs(y - ymid);
            for (let x = 0; x < width; x++) {
                const fx = x / width;
                const p = 4 * (x + width * y);
                const span = ymid * fx;
                let c = 0;
                if (dy < span) {
                    const lightY = (0.5 - 0.5 * Math.cos(Math.PI * (1 - dy / span))) ** 0.5;
                    const lightX = (fx < 0.25 ? 0.5 - 0.5 * Math.cos(Math.PI * fx / 0.25) : ((1 - fx) / 0.75) ** 0.7);
                    c = 255 * lightX * lightY;
                }
                data[p] = data[p + 1] = data[p + 2] = c;
                data[p + 3] = 255;
            }
        }
        ctx.putImageData(imageData, 0, 0);
        const img = new Image();
        img.src = canvas.toDataURL();
        return img;
    }
}
