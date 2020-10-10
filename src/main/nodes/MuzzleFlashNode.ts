import { Color } from "../../engine/color/Color";
import { RGBColor } from "../../engine/color/RGBColor";
import { Direction } from "../../engine/geom/Direction";
import { Polygon2 } from "../../engine/graphics/Polygon2";
import { Vector2 } from "../../engine/graphics/Vector2";
import { SceneNode } from "../../engine/scene/SceneNode";
import { TiledSceneArgs } from "../../engine/scene/TiledMapNode";
import { createCanvas, getRenderingContext } from "../../engine/util/graphics";
import { now } from "../../engine/util/time";
import { Hyperloop } from "../Hyperloop";
import { intensifyColor } from "./LightNode";

export class MuzzleFlashNode extends SceneNode<Hyperloop> {
    private color: Color;
    private readonly intensity: number;
    private manipulatedIntensity: number;
    private gradient: CanvasGradient | null = null;
    private fireTimeStamp: number | null = null;

    public constructor(private duration: number, args?: TiledSceneArgs) {
        super({ anchor: Direction.TOP_LEFT, showBounds: true, ...args });
        this.color = args?.tiledObject?.getOptionalProperty("color", "color")?.getValue() ?? new RGBColor(1, 0.2, 0);
        this.intensity = args?.tiledObject?.getOptionalProperty("intensity", "int")?.getValue() ?? 100;
        this.manipulatedIntensity = this.intensity;
        this.updateGradient();
        this.hide();
    }

    private updateGradient(): void {
        const colors: Color[] = [];
        const color = this.color.toRGB();
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
        const origin = new Vector2(0, 0);
        // const intensity = this.manipulatedIntensity / 2;
        this.gradient = ctx.createRadialGradient(origin.x, origin.y, 0, origin.x, origin.y, this.manipulatedIntensity);
        for (let i = 0, count = colors.length - 1; i <= count; i++) {
            this.gradient.addColorStop(i / count, colors[i].toString());
        }
    }

    public update(dt: number) {
        if (this.fireTimeStamp) {
            const fireProgress = (now() - this.fireTimeStamp) / (this.duration * 1000);
            if (fireProgress > 0.9) {
                this.fireTimeStamp = null;
                this.hide();
                return;
            }
            this.manipulatedIntensity = this.intensity * (1 - fireProgress);
            this.updateGradient();
        }
    }

    public fire() {
        this.show();
        this.fireTimeStamp = now();
    }

    public draw(ctx: CanvasRenderingContext2D): void {
        if (this.fireTimeStamp) {
            ctx.save();
            ctx.beginPath();
            const intensity = this.manipulatedIntensity;
            ctx.fillStyle = this.gradient ?? this.color.toString();
            const halfIntensity = intensity / 2;
            ctx.ellipse(0, 0, halfIntensity, halfIntensity, 0, 0, Math.PI * 2, true);
            ctx.fill();
            ctx.restore();
        }
    }
}
