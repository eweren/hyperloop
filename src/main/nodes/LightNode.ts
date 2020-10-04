import { Color } from "../../engine/color/Color";
import { RGBColor } from "../../engine/color/RGBColor";
import { Direction } from "../../engine/geom/Direction";
import { Polygon2 } from "../../engine/graphics/Polygon2";
import { SceneNode, SceneNodeAspect } from "../../engine/scene/SceneNode";
import { TiledSceneArgs } from "../../engine/scene/TiledMapNode";
import { radians } from "../../engine/util/math";
import { Hyperloop } from "../Hyperloop";

export class LightNode extends SceneNode<Hyperloop> {
    private color: Color;
    private readonly polygon: Polygon2 | null;
    private readonly ellipse: boolean;
    private readonly intensity: number;
    private readonly spin: number;
    private gradient: Color[] = [];

    public constructor(args?: TiledSceneArgs) {
        super({ anchor: Direction.TOP_LEFT, showBounds: true, ...args });
        this.color = args?.tiledObject?.getOptionalProperty("color", "color")?.getValue() ?? new RGBColor(1, 1, 1);
        this.polygon = args?.tiledObject?.getPolygon() ?? null;
        this.ellipse = args?.tiledObject?.isEllipse() ?? false;
        this.intensity = args?.tiledObject?.getOptionalProperty("intensity", "int")?.getValue() ?? 100;
        this.spin = args?.tiledObject?.getOptionalProperty("spin", "float")?.getValue() ?? 0;
        this.updateGradient();
    }

    private updateGradient(): void {
        this.gradient = [];
        const color = this.color.toRGB();
        const steps = 16;
        const overshoot = 0.5;
        for (let step = 0; step < steps; step++) {
            const p = (1 + overshoot) * (1 - step / steps) ** 8;
            const col = intensifyColor(color, p);
            this.gradient.push(col);
        }
        this.gradient.push(new RGBColor(0, 0, 0));

        function intensifyColor(color: RGBColor, f: number): Color {
            let r = f * color.getRed(), g = f * color.getGreen(), b = f * color.getBlue();
            if (r > 1) {
                g += (r - 1) / 2;
                b += (r - 1) / 2;
                r = 1;
            }
            if (g > 1) {
                r += (g - 1) / 2;
                b += (b - 1) / 2;
                g = 1;
            }
            if (b > 1) {
                r += (b - 1) / 2;
                g += (b - 1) / 2;
                b = 1;
            }
            return new RGBColor(r, g, b);
        }
    }

    public setColor(color: Color): this {
        if (this.color !== color) {
            this.color = color;
            this.updateGradient();
            this.invalidate(SceneNodeAspect.RENDERING);
        }
        return this;
    }

    public updateBoundsPolygon(bounds: Polygon2) {
        if (this.polygon != null) {
            for (const vertex of this.polygon.vertices) {
                bounds.addVertex(vertex);
            }
        } else {
            super.updateBoundsPolygon(bounds);
        }
    }

    public update(dt: number) {
        if (this.spin !== 0) {
            this.transform(m => {
                const v = this.polygon?.vertices[0];
                if (v) {
                    m.translate(v.x, v.y);
                }
                m.rotate(radians(this.spin) * dt);
                if (v) {
                    m.translate(-v.x, -v.y);
                }
            });
        }
    }

    public draw(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        ctx.beginPath();
        const intensity = this.intensity;
        const width = this.getWidth();
        const height = this.getHeight();
        if (this.polygon != null) {
            this.polygon.draw(ctx);
            const v = this.polygon.vertices[0];
            const gradient = ctx.createRadialGradient(v.x, v.y, 0, v.x, v.y, this.intensity);
            for (let i = 0, count = this.gradient.length - 1; i <= count; i++) {
                gradient.addColorStop(i / count, this.gradient[i].toString());
            }
            ctx.fillStyle = gradient;
        } else if (this.ellipse) {
            const halfWidth = width / 2;
            const halfHeight = height / 2;
            ctx.ellipse(halfWidth, halfHeight, halfWidth, halfHeight, 0, 0, Math.PI * 2, true);
            const gradient = ctx.createRadialGradient(halfWidth, halfHeight, 0, halfWidth, halfHeight, this.intensity / 2);
            for (let i = 0, count = this.gradient.length - 1; i <= count; i++) {
                gradient.addColorStop(i / count, this.gradient[i].toString());
            }
            ctx.fillStyle = gradient;
        } else if (width === 0 && height === 0) {
            const halfIntensity = intensity / 2;
            ctx.ellipse(0, 0, halfIntensity, halfIntensity, 0, 0, Math.PI * 2, true);
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.intensity / 2);
            for (let i = 0, count = this.gradient.length - 1; i <= count; i++) {
                gradient.addColorStop(i / count, this.gradient[i].toString());
            }
            ctx.fillStyle = gradient;
        } else {
            ctx.rect(0, 0, width, height);
            ctx.fillStyle = this.color.toString();
        }
        ctx.fill();
        ctx.restore();
    }
}
