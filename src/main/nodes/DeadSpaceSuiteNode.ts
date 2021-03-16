import { Aseprite } from "../../engine/assets/Aseprite";
import { Direction } from "../../engine/geom/Direction";
import { asset } from "../../engine/assets/Assets";
import { SceneNodeArgs } from "../../engine/scene/SceneNode";
import { AsepriteNode } from "../../engine/scene/AsepriteNode";
import { Hyperloop } from "../Hyperloop";

export class DeadSpaceSuitNode extends AsepriteNode<Hyperloop> {
    @asset("sprites/deadspacesuit.aseprite.json")
    private static readonly sprite: Aseprite;

    public constructor(args: SceneNodeArgs, filter?: string) {
        super({
            aseprite: DeadSpaceSuitNode.sprite,
            anchor: Direction.BOTTOM,
            tag: "idle",
            filter,
            ...args
        });
    }
}
