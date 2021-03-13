import { Aseprite } from "../../../engine/assets/Aseprite";
import { asset } from "../../../engine/assets/Assets";
import { Direction } from "../../../engine/geom/Direction";
import { Rect } from "../../../engine/geom/Rect";
import { AsepriteNode } from "../../../engine/scene/AsepriteNode";
import { SceneNodeArgs } from "../../../engine/scene/SceneNode";
import { Hyperloop } from "../../Hyperloop";

export class PlayerArmNode extends AsepriteNode<Hyperloop> {
    @asset("sprites/spacesuitarm.aseprite.json")
    private static sprite: Aseprite;
    // public flashlight: FlashlightNode;

    public constructor(filter?: string, args?: SceneNodeArgs) {
        super({
            aseprite: PlayerArmNode.sprite,
            anchor: Direction.LEFT,
            childAnchor: Direction.TOP_RIGHT,
            tag: "idle",
            id: "playerarm",
            y: -2,
            sourceBounds: new Rect(0, 5, 12, 3),
            filter,
            ...args
        });
    }
}
