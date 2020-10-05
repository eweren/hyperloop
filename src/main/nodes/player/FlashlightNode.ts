
import { Direction } from "../../../engine/geom/Direction";
import { SceneNode, SceneNodeArgs } from "../../../engine/scene/SceneNode";
import { Layer } from "../../constants";
import { Hyperloop } from "../../Hyperloop";
import { PlayerNode } from "../PlayerNode";

export class FlashlightNode extends SceneNode<Hyperloop> {
    private static image = FlashlightNode.generateImage(200, 100);

    public constructor(private randomRotate?: boolean, args?: SceneNodeArgs) {
        super({
            anchor: Direction.CENTER,
            id: "flashlight",
            layer: Layer.LIGHT,
            ...args
        });
    }

    public draw(context: CanvasRenderingContext2D): void {
        context.save();
        const player = this.getPlayer();
        if (player && player.isMirrorX()) {
            context.scale(-1, 1);
        }
        if (this.randomRotate) {
            const t = Date.now() * 0.002;
            const randomAngle = Math.PI * 0.04 * (Math.sin(t * 0.5) + 0.5 * Math.sin(t * 0.84) + 0.3 * Math.sin(t * 0.941));
            context.rotate(randomAngle);
        }
        context.drawImage(FlashlightNode.image, 0, -54);
        context.restore();
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

    public getPlayer(): PlayerNode | null {
        let node = this.getParent();
        while (node && !(node instanceof PlayerNode)) {
            node = node.getParent();
        }
        return node ?? null;
    }
}
