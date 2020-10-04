import { Aseprite } from "../../engine/assets/Aseprite";
import { asset } from "../../engine/assets/Assets";
import { Direction } from "../../engine/geom/Direction";
import { AsepriteNode } from "../../engine/scene/AsepriteNode";
import { SceneNodeArgs } from "../../engine/scene/SceneNode";
import { Hyperloop } from "../Hyperloop";

export class TrainNode extends AsepriteNode<Hyperloop> {
    @asset("sprites/hyperloopInt.aseprite.json")
    private static sprite: Aseprite;
    @asset("sprites/hyperloopExt.aseprite.json")
    private static foregroundSprite: Aseprite;

    public foreground: AsepriteNode<Hyperloop>;

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
        (window as any).train = this;
    }

}
