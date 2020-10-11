import { asset } from "../../../engine/assets/Assets";
import { Direction } from "../../../engine/geom/Direction";
import { ImageNode } from "../../../engine/scene/ImageNode";
import { SceneNode, SceneNodeArgs } from "../../../engine/scene/SceneNode";
import { Hyperloop } from "../../Hyperloop";

export class HealthNode extends SceneNode<Hyperloop> {

    @asset("images/health-overlay.png")
    private static image: HTMLImageElement;

    private imageNode: ImageNode = new ImageNode({ image: HealthNode.image, anchor: Direction.TOP_LEFT});

    public constructor(private maxValue = 100, args?: SceneNodeArgs) {
        super({ anchor: Direction.TOP_LEFT, ...args });
        this.imageNode.appendTo(this);
    }

    public update(dt: number, time: number): void {
        if (this.imageNode.isInScene()) {
            this.imageNode.setOpacity((this.maxValue - this.getGame().getPlayer().getHitpoints()) / this.maxValue);
        }
        super.update(dt, time);
    }

}
