import { Aseprite } from "../../engine/assets/Aseprite";
import { asset } from "../../engine/assets/Assets";
import { Direction } from "../../engine/geom/Direction";
import { AsepriteNode } from "../../engine/scene/AsepriteNode";

export class PlayerNode extends AsepriteNode {
    @asset("sprites/female.aseprite.json")
    private static sprite: Aseprite;

    public constructor() {
        super({
            aseprite: PlayerNode.sprite,
            anchor: Direction.BOTTOM,
            tag: "run"
        });
    }
}
