import { Aseprite } from "../../engine/assets/Aseprite";
import { asset } from "../../engine/assets/Assets";
import { Direction } from "../../engine/geom/Direction";
import { InteractiveNode } from "./InteractiveNode";

export class SwitchNode extends InteractiveNode {
    @asset("sprites/rat.aseprite.json")
    private static sprite: Aseprite;
    private turnedOn: boolean = false;

    public constructor() {
        super({
            aseprite: SwitchNode.sprite,
            anchor: Direction.CENTER,
        });
    }

    public interact(): void {
        this.turnedOn = !this.turnedOn;
    }

    public getTurnedOn(): boolean {
        return this.turnedOn;
    }

    public draw(context: CanvasRenderingContext2D): void {
        // Back
        context.fillStyle = "#666";
        context.fillRect(-4, -4, 8, 8);
        context.fillStyle = this.turnedOn ? "#ff0000" : "#603030";
        context.fillRect(-3, -3, 6, 6);
    }

}
