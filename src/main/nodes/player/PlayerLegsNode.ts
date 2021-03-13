import { Aseprite } from "../../../engine/assets/Aseprite";
import { asset } from "../../../engine/assets/Assets";
import { Direction } from "../../../engine/geom/Direction";
import { Rect } from "../../../engine/geom/Rect";
import { AsepriteNode, AsepriteNodeArgs } from "../../../engine/scene/AsepriteNode";
import { Hyperloop } from "../../Hyperloop";

export class PlayerLegsNode extends AsepriteNode<Hyperloop> {
    @asset("sprites/spacesuitlegs.aseprite.json")
    private static sprite: Aseprite;

    public constructor(filter?: string, args?: AsepriteNodeArgs) {
        super({
            aseprite: PlayerLegsNode.sprite,
            anchor: Direction.CENTER,
            tag: "idle",
            id: "playerlegs",
            sourceBounds: new Rect(10, 0, 0, 0),
            filter,
            ...args
        });
    }
}
