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
            tag: "idle",
            id: "player"
        });
    }

    public update(dt: number, time: number) {
        super.update(dt, time);
        // Controls
        const input = this.getScene()!.game.input;
        // Run left/right
        const direction = (input.currentActiveIntents & ControllerIntent.PLAYER_MOVE_RIGHT ? 1 : 0)
                - (input.currentActiveIntents & ControllerIntent.PLAYER_MOVE_LEFT ? 1 : 0);
        this.setDirection(direction);
        // Jump
        if (input.currentActiveIntents & ControllerIntent.PLAYER_JUMP) {
            this.jump();
        }
        // Shoot
        if (input.currentActiveIntents & ControllerIntent.PLAYER_ACTION) {
            console.log("BUUUUM!");
        }
    }
}
