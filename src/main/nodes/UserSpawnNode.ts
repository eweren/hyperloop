
import { SceneNode, SceneNodeArgs } from "../../engine/scene/SceneNode";
import { Hyperloop } from "../Hyperloop";

export class UserSpawnNode extends SceneNode<Hyperloop> {

    public constructor(args?: SceneNodeArgs) {
        super({
            ...args
        });
        this.identifier = args?.tiledObject?.toJSON().id ?? null;
    }
}
