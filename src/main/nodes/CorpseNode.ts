import { Aseprite } from "../../engine/assets/Aseprite";
import { Direction } from "../../engine/geom/Direction";
import { InteractiveNode } from "./InteractiveNode";
import { asset } from "../../engine/assets/Assets";
import { SceneNodeArgs } from "../../engine/scene/SceneNode";
import { Sound } from "../../engine/assets/Sound";
import { MusicManager } from "../MusicManager";

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

    public interact(): void {
        if (this.canInteract()) {
            // TODO play some neat key take sound
            this.keyTaken = true;
            this.getGame().keyTaken = true;
            CorpseNode.pickupSound.play();
            const player = this.getTarget();
            player?.say("This key will surely be useful", 3, 0.5);
            setTimeout(() => {
                CorpseNode.lightSound.play();
                this.getGame().turnOffAllLights();
                MusicManager.getInstance().loopTrack(2);
                const game = this.getGame();
                const fader = game.getFader();
                fader.fadeOut({ duration: 0.1 }).then(() => {
                    fader.fadeIn({ duration: 2 });
                });
                game.getCamera().setZoom(1.5);
                player?.say("Oh oh...", 3, 1.5);
            }, 5000);
        }
    }

    public canInteract(): boolean {
        return !this.keyTaken;
    }

}
