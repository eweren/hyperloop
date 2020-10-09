import { Direction } from "../../../engine/geom/Direction";
import { SceneNode, SceneNodeArgs } from "../../../engine/scene/SceneNode";
import { Hyperloop } from "../../Hyperloop";

export class HealthNode extends SceneNode<Hyperloop> {

    public constructor(private maxValue = 100, args?: SceneNodeArgs) {
        super({ anchor: Direction.TOP_LEFT, ...args });
    }

    public draw(ctx: CanvasRenderingContext2D): void {
        const parent = this.getParent();
        if (!parent) {
            return;
        }
        const hitpoints = this.getGame().getPlayer().getHitpoints();
        ctx.save();
        ctx.beginPath();
        const grdHorizontal = ctx.createLinearGradient(0, 0, parent.getWidth(), 0);
        grdHorizontal.addColorStop(0, `rgba(150, 0, 0, ${(this.maxValue - hitpoints) / this.maxValue})`);
        grdHorizontal.addColorStop(0.3, "transparent");
        grdHorizontal.addColorStop(0.6, "transparent");
        grdHorizontal.addColorStop(1, `rgba(150, 0, 0, ${(this.maxValue - hitpoints) / this.maxValue})`);

        // Fill with gradient
        ctx.fillStyle = grdHorizontal;
        ctx.fillRect(0, 0, parent.getWidth(), parent.getHeight());
        const grdVertical = ctx.createLinearGradient(0, 0, 0, parent.getHeight());
        grdVertical.addColorStop(0, `rgba(150, 0, 0, ${(this.maxValue - hitpoints) / this.maxValue})`);
        grdVertical.addColorStop(0.3, "transparent");
        grdVertical.addColorStop(0.6, "transparent");
        grdVertical.addColorStop(1, `rgba(150, 0, 0, ${(this.maxValue - hitpoints) / this.maxValue})`);

        // Fill with gradient
        ctx.fillStyle = grdVertical;
        ctx.fillRect(0, 0, parent.getWidth(), parent.getHeight());

        ctx.restore();
    }
}
