import { Aseprite } from "../../engine/assets/Aseprite";
import { Direction } from "../../engine/geom/Direction";
import { InteractiveNode } from "./InteractiveNode";
import { asset } from "../../engine/assets/Assets";
import { SceneNodeArgs } from "../../engine/scene/SceneNode";
import { rndItem } from "../../engine/util/random";

const reactions: [ string, number ][] = [
    [ "That's why she's taking so long...", 3 ],
    [ "Thank God. That guy was annoying", 3 ],
    [ "Ugh", 2 ]
];

export class DeadSpaceSuitNode extends InteractiveNode {
    @asset("sprites/deadspacesuit.aseprite.json")
    private static readonly sprite: Aseprite;

    public constructor(args: SceneNodeArgs) {
        super({
            aseprite: DeadSpaceSuitNode.sprite,
            anchor: Direction.BOTTOM,
            tag: "off",
            ...args
        });
    }

    public interact(): void {
        const player = this.getTarget();
        player?.say(...rndItem(reactions));
    }
}
