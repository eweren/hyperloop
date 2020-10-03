import { Aseprite } from "../../engine/assets/Aseprite";
import { asset } from "../../engine/assets/Assets";
import { Direction } from "../../engine/geom/Direction";
import { AsepriteNode } from "../../engine/scene/AsepriteNode";

export class TrainNode extends AsepriteNode {
    // TODO use proper train sprite instead of that person
    @asset("sprites/male.aseprite.json")
    private static sprite: Aseprite;

    public constructor() {
        super({
            aseprite: TrainNode.sprite,
            anchor: Direction.BOTTOM
        });
    }

}
