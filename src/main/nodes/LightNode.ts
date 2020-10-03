import { Color } from "../../engine/color/Color";
import { RGBAColor } from "../../engine/color/RGBAColor";
import { RGBColor } from "../../engine/color/RGBColor";
import { Direction } from "../../engine/geom/Direction";
import { Polygon2 } from "../../engine/graphics/Polygon2";
import { SceneNode, SceneNodeArgs, SceneNodeAspect } from "../../engine/scene/SceneNode";
import { TiledSceneArgs } from "../../engine/scene/TiledMapNode";

export class LightNode extends SceneNode {
    private color: Color;
    private readonly polygon: Polygon2 | null;
    private readonly ellipse: boolean;
    private readonly intensity: number;
    private gradient: Color[] = [];

    public constructor(args?: TiledSceneArgs) {
        super({ anchor: Direction.TOP_LEFT, showBounds: true, ...args });
        this.color = args?.tiledObject?.getOptionalProperty("color", "color")?.getValue() ?? new RGBColor(1, 1, 1);
        this.polygon = args?.tiledObject?.getPolygon() ?? null;
        this.ellipse = args?.tiledObject?.isEllipse() ?? false;
        this.intensity = args?.tiledObject?.getOptionalProperty("intensity", "int")?.getValue() ?? 100;
        this.updateGradient();
    }

    private updateGradient(): void {
        const color = this.color;
        this.gradient = [
            color,
            color,
            color.darken(0.75),
            color.darken(0.89),
            color.darken(0.94),
            color.darken(0.96),
            color.darken(0.97),
            color.darken(0.98),
            color.darken(0.99),
            new RGBColor(0, 0, 0)
        ];
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

    public draw(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        ctx.beginPath();
        const intensity = this.intensity;
        const width = this.getWidth();
        const height = this.getHeight();
        if (this.polygon != null) {
            this.polygon.draw(ctx);
            const normal = this.polygon.getVertexNormal(0);
            const gradient = ctx.createLinearGradient(0, 0, normal.x * intensity, normal.y * intensity);
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
