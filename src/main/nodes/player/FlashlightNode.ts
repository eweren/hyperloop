
import { Direction } from "../../../engine/geom/Direction";
import { SceneNode, SceneNodeArgs, SceneNodeAspect } from "../../../engine/scene/SceneNode";
import { clamp } from "../../../engine/util/math";
import { sleep } from "../../../engine/util/time";
import { Layer } from "../../constants";
import { Hyperloop } from "../../Hyperloop";
import { PlayerNode } from "../PlayerNode";

export class FlashlightNode extends SceneNode<Hyperloop> {
    private static image = FlashlightNode.generateImage(200, 100);
    private readonly maxDistance = 200;
    private readonly flickerRounds = 50;
    private distance = 200;
    private flickerFactor = 1;
    private standardLight = 1;

    public constructor(private randomRotate?: boolean, args?: SceneNodeArgs) {
        super({
            anchor: Direction.CENTER,
            id: "flashlight",
            layer: Layer.LIGHT,
            ...args
        });
        (window as any)["flashlight"] = this;
    }

    public setDistance(newDistance: number): void {
        this.distance = newDistance;
        this.invalidate(SceneNodeAspect.RENDERING);
    }

    public getDistance(): number {
        return this.distance;
    }
    public manipulateLight(factor: number): void {
        this.standardLight *= factor;
    }

    public async flicker(): Promise<void> {
        for (let flickerRounds = 0; flickerRounds < this.flickerRounds; flickerRounds++) {
            this.flickerFactor = Math.random();
            await sleep();
        }
        this.flickerFactor = this.standardLight;
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
        const newHeight = clamp((this.maxDistance / this.distance) * this.maxDistance / 2, 100, 200);
        const newWidth = clamp(this.distance, 100, 200);
        context.globalAlpha = this.flickerFactor;
        context.drawImage(FlashlightNode.image, 0, -newHeight / 2 - 4, newWidth, newHeight);
        context.globalAlpha = 1;
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
                    const lightY = (0.5 - 0.5 * Math.cos(Math.PI * (1 - dy / span))) ** 0.7;
                    const lightX = (fx < 0.25 ? 0.5 - 0.5 * Math.cos(Math.PI * fx / 0.25) : ((1 - fx) / 0.75) ** 0.9);
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
