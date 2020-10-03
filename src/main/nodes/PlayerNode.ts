import { Aseprite } from "../../engine/assets/Aseprite";
import { asset } from "../../engine/assets/Assets";
import { Direction } from "../../engine/geom/Direction";
import { ControllerIntent } from "../../engine/input/ControllerIntent";
import { CharacterNode } from "./CharacterNode";

export class PlayerNode extends CharacterNode {
    @asset("sprites/female.aseprite.json")
    private static sprite: Aseprite;

    public constructor() {
        super({
            aseprite: PlayerNode.sprite,
            anchor: Direction.BOTTOM,
            tag: "idle"
        });
    }

    public update(dt: number) {
        super.update(dt);
        // Controls
        const input = this.getScene()!.game.input;
        const direction = (input.currentActiveIntents & ControllerIntent.PLAYER_MOVE_RIGHT ? 1 : 0)
                - (input.currentActiveIntents & ControllerIntent.PLAYER_MOVE_LEFT ? 1 : 0);
        this.setDirection(direction);
        if (input.currentActiveIntents & ControllerIntent.PLAYER_ACTION) {
            console.log("BUUUUM!");
        }
    }
}
