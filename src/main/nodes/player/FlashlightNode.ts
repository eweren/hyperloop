
import { Color } from "../../../engine/color/Color";
import { RGBColor } from "../../../engine/color/RGBColor";
import { Direction } from "../../../engine/geom/Direction";
import { SceneNode, SceneNodeArgs, SceneNodeAspect } from "../../../engine/scene/SceneNode";
import { createCanvas, getRenderingContext } from "../../../engine/util/graphics";
import { clamp } from "../../../engine/util/math";
import { sleep } from "../../../engine/util/time";
import { Layer } from "../../constants";
import { Hyperloop } from "../../Hyperloop";
import { intensifyColor } from "../LightNode";
import { PlayerNode } from "../PlayerNode";

export class FlashlightNode extends SceneNode<Hyperloop> {
    private static image = FlashlightNode.generateImage(200, 100);
    private readonly maxDistance = 200;
    private readonly flickerRounds = 50;
    private distance = 200;
    private flickerFactor = 1;
    private standardLight = 1;
    // private lightEllipsis: LightNode;
    private gradient: CanvasGradient | null = null;

    public constructor(private randomRotate?: boolean, args?: SceneNodeArgs) {
        super({
            anchor: Direction.CENTER,
            id: "flashlight",
            layer: Layer.LIGHT,
            ...args
        });
        this.getGradient();
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

    public update(dt: number, time: number): void {
        super.update(dt, time);
        this.getGradient();
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
        const newHeight = clamp((this.maxDistance / this.distance) * this.maxDistance / 2, 0, 200);
        const newWidth = clamp(this.distance, 0, 200);
        context.globalAlpha = this.flickerFactor * clamp(this.distance / this.maxDistance, 0, 1) ** 2;
        context.drawImage(FlashlightNode.image, 0, -newHeight / 2 - 4, newWidth, newHeight);
        context.globalAlpha = this.flickerFactor * (1 - clamp(this.distance / this.maxDistance, 0, 1)) ** 2;
        context.beginPath();
        context.fillStyle = this.gradient ?? "#FFF";
        context.ellipse(0, 0, 200, 200, 0, 0, Math.PI * 2, true);
        context.fill();
        context.scale((1 - (clamp(this.distance, 0, 200) / this.maxDistance)), newHeight / 2);
        context.globalAlpha = 1;
        context.restore();
    }

    private getGradient(): void {
        const colors: Color[] = [];
        const color = new RGBColor(1, 1, 1);
        const steps = 16;
        const overshoot = 0.5;
        for (let step = 0; step < steps; step++) {
            const p = (1 + overshoot) * (1 - step / steps) ** 8;
            const col = intensifyColor(color, p);
            colors.push(col);
        }
        colors.push(new RGBColor(0, 0, 0));

        const canvas = createCanvas(8, 8);
        const ctx = getRenderingContext(canvas, "2d");
        const intensity = 200;
        this.gradient = ctx.createRadialGradient(this.distance, 0, 0, this.distance, 0, intensity);
        for (let i = 0, count = colors.length - 1; i <= count; i++) {
            this.gradient.addColorStop(i / count, colors[i].toString());
        }
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
