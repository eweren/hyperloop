import { Aseprite } from "../../engine/assets/Aseprite";
import { asset } from "../../engine/assets/Assets";
import { Direction } from "../../engine/geom/Direction";
import { AsepriteNode } from "../../engine/scene/AsepriteNode";
import { SceneNodeArgs } from "../../engine/scene/SceneNode";

export class TrainNode extends AsepriteNode {
    @asset("sprites/hyperloopInt.aseprite.json")
    private static sprite: Aseprite;
    @asset("sprites/hyperloopExt.aseprite.json")
    private static foregroundSprite: Aseprite;

    public foreground: AsepriteNode;

    public constructor(args?: SceneNodeArgs) {
        super({
            aseprite: TrainNode.sprite,
            anchor: Direction.BOTTOM,
            ...args
        });
        this.foreground = new AsepriteNode({
            aseprite: TrainNode.foregroundSprite,
            anchor: Direction.CENTER
        });
        this.appendChild(this.foreground);
    }

}
