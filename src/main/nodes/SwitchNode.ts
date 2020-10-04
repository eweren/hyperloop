import { Aseprite } from "../../engine/assets/Aseprite";
import { Direction } from "../../engine/geom/Direction";
import { InteractiveNode } from "./InteractiveNode";
import { SceneNodeArgs } from "../../engine/scene/SceneNode";
import { Sound } from "../../engine/assets/Sound";
import { asset } from "../../engine/assets/Assets";

export interface SwitchNodeArgs extends SceneNodeArgs {
    onlyOnce?: boolean;
    onUpdate?: (state: boolean) => void;
}

export class SwitchNode extends InteractiveNode {
    @asset("sprites/wallLever.aseprite.json")
    private static readonly sprite: Aseprite;

    @asset("sounds/fx/switch.mp3")
    private static readonly clickSound: Sound;

    private turnedOn: boolean = false;
    private onlyOnce: boolean;
    private stateChanges = 0;
    private onUpdate?: (state: boolean) => void;

    public constructor({ onlyOnce = false, onUpdate, ...args }: SwitchNodeArgs) {
        super({
            aseprite: SwitchNode.sprite,
            anchor: Direction.CENTER,
            tag: "off",
            ...args
        }, "Press E to press switch");
        this.onlyOnce = onlyOnce;
        this.onUpdate = onUpdate;
    }

    public interact(): void {
        if (this.canInteract()) {
            SwitchNode.clickSound.stop();
            SwitchNode.clickSound.play();
            this.turnedOn = !this.turnedOn;
            this.setTag(this.turnedOn ? "on" : "off");
            if (this.onUpdate != null) {
                this.onUpdate(this.turnedOn);
            }
            this.stateChanges++;
        }
    }

    public canInteract(): boolean {
        return this.stateChanges === 0 || !this.onlyOnce;
    }

    public getTurnedOn(): boolean {
        return this.turnedOn;
    }

    // public draw(context: CanvasRenderingContext2D): void {
    //     // Render switch
    //     const offY = 0;
    //     context.fillStyle = "#666";
    //     context.fillRect(-4, offY - 4, 8, 8);
    //     context.fillStyle = this.turnedOn ? "#ff0000" : "#603030";
    //     context.fillRect(-3, offY - 3, 6, 6);

    //     super.draw(context);
    // }

}
