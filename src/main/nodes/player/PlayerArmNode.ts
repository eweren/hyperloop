import { Aseprite } from "../../../engine/assets/Aseprite";
import { asset } from "../../../engine/assets/Assets";
import { Direction } from "../../../engine/geom/Direction";
import { Polygon2 } from "../../../engine/graphics/Polygon2";
import { Vector2 } from "../../../engine/graphics/Vector2";
import { AsepriteNode } from "../../../engine/scene/AsepriteNode";
import { SceneNodeArgs } from "../../../engine/scene/SceneNode";
import { Hyperloop } from "../../Hyperloop";

export class PlayerArmNode extends AsepriteNode<Hyperloop> {
    @asset("sprites/spacesuitarm.aseprite.json")
    private static sprite: Aseprite;
    // public flashlight: FlashlightNode;

    public constructor(args?: SceneNodeArgs) {
        super({
            aseprite: PlayerArmNode.sprite,
            anchor: Direction.LEFT,
            childAnchor: Direction.TOP_RIGHT,
            tag: "idle",
            id: "playerarm",
            showBounds: true,
            x: -2,
            ...args
        });
    }

    protected updateBoundsPolygon(bounds: Polygon2): void {
        const boundsWidth = 12;
        const boundsHeight = 5;
        const offsetX = this.getWidth() / 2 - boundsWidth / 2;
        const offsetY = 8;
        bounds.clear();
        bounds.addVertex(new Vector2(offsetX, offsetY));
        bounds.addVertex(new Vector2(offsetX + boundsWidth, offsetY));
        bounds.addVertex(new Vector2(offsetX + boundsWidth, boundsHeight));
        bounds.addVertex(new Vector2(offsetX, boundsHeight));
    }
}
