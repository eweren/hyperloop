import { Aseprite } from "../../engine/assets/Aseprite";
import { asset } from "../../engine/assets/Assets";
import { Direction } from "../../engine/geom/Direction";
import { InteractiveNode } from "./InteractiveNode";

export class SwitchNode extends InteractiveNode {
    @asset("sprites/rat.aseprite.json")
    private static sprite: Aseprite;
    private turnedOn: boolean = false;
    private onlyOnce: boolean;
    private stateChanges = 0;

    public constructor(onlyOnce = false) {
        super({
            aseprite: SwitchNode.sprite,
            anchor: Direction.CENTER,
        }, "Press E to press switch");
        this.onlyOnce = onlyOnce;
    }

    public interact(): void {
        if (this.canInteract()) {
            this.turnedOn = !this.turnedOn;
            this.stateChanges++;
        }
    }

    public canInteract(): boolean {
        return this.stateChanges === 0 || !this.onlyOnce;
    }

    public getTurnedOn(): boolean {
        return this.turnedOn;
    }

    public draw(context: CanvasRenderingContext2D): void {
        // Render switch
        const offY = 0;
        context.fillStyle = "#666";
        context.fillRect(-4, offY - 4, 8, 8);
        context.fillStyle = this.turnedOn ? "#ff0000" : "#603030";
        context.fillRect(-3, offY - 3, 6, 6);

        super.draw(context);
    }

}
