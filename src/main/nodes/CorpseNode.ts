import { Aseprite } from "../../engine/assets/Aseprite";
import { Direction } from "../../engine/geom/Direction";
import { InteractiveNode } from "./InteractiveNode";
import { asset } from "../../engine/assets/Assets";
import { SceneNodeArgs } from "../../engine/scene/SceneNode";
import { Sound } from "../../engine/assets/Sound";
import { MusicManager } from "../MusicManager";
import { ControllerFamily } from "../../engine/input/ControllerFamily";
import { sleep } from "../../engine/util/time";
import { PlayerNode } from "./PlayerNode";

export class CorpseNode extends InteractiveNode {
    @asset("sprites/corpse.aseprite.json")
    private static readonly sprite: Aseprite;

    @asset("sounds/fx/breakerSwitch.ogg")
    private static readonly lightSound: Sound;

    @asset("sounds/fx/pickupKey.ogg")
    private static readonly pickupSound: Sound;

    private keyTaken = false;

    public constructor(args: SceneNodeArgs) {
        super({
            aseprite: CorpseNode.sprite,
            anchor: Direction.BOTTOM,
            tag: "off",
            ...args
        }, "PRESS E TO SEARCH CORPSE");
    }

    public update(dt: number, time: number): void {
        this.caption = `PRESS ${this.getGame().input.currentControllerFamily === ControllerFamily.GAMEPAD ? "Y" : "E"} TO SEARCH CORPSE`;
        super.update(dt, time);
    }

    public async interact(): Promise<void> {
        if (this.canInteract()) {
            // TODO play some neat key take sound
            this.keyTaken = true;
            this.getGame().keyTaken = true;
            CorpseNode.pickupSound.play();
            const player = this.getTarget();
            player?.say({line: "This key will surely be useful", duration: 3, delay: 0.5});
            await sleep(5000);
            CorpseNode.lightSound.play();
            this.getGame().turnOffAllLights();
            MusicManager.getInstance().loopTrack(2);
            const game = this.getGame();
            const fader = game.getFader();
            fader.fadeOut({ duration: 0.1 }).then(() => {
                fader.fadeIn({ duration: 2 });
            });
            // Deactivated until better solution? 1.5 looks really shitty
            // game.getCamera().setZoom(1.5);
            player?.say({line: "Uh oh...", duration: 3, delay: 1.5});
            await sleep(5000);
            (player as PlayerNode)?.flickerLight();
            player?.say({line: "Ehh... Really? Isn't it already scary enough?", duration: 3,delay:  1.5});

        }
    }

    public canInteract(): boolean {
        return !this.keyTaken;
    }

}
