import { Hyperloop } from "../Hyperloop";
import { Scene } from "../../engine/scene/Scene";
import { asset } from "../../engine/assets/Assets";
import { Direction } from "../../engine/geom/Direction";
import { ImageNode } from "../../engine/scene/ImageNode";
import { GameScene } from "./GameScene";
import { ControllerIntent } from "../../engine/input/ControllerIntent";
import { ControllerEvent } from "../../engine/input/ControllerEvent";
import { FadeToBlackTransition } from "../../engine/transitions/FadeToBlackTransition";
import { MusicManager } from "../MusicManager";
import { FadeTransition } from "../../engine/transitions/FadeTransition";
import { GAME_HEIGHT, GAME_WIDTH } from "../constants";
import { Sound } from "../../engine/assets/Sound";
import { SuccessScene } from "./SuccessScene";

export class TitleScene extends Scene<Hyperloop> {
    @asset("images/title-image.png")
    private static titleImage: HTMLImageElement;

    @asset("images/start-overlay.png")
    private static overlayImage: HTMLImageElement;

    @asset("sounds/interface/ticket.ogg")
    private static confirmSound: Sound;

    private imageNode: ImageNode = new ImageNode({ image: TitleScene.titleImage, anchor: Direction.TOP_LEFT});
    private overlayImageNode: ImageNode = new ImageNode({ image: TitleScene.overlayImage, anchor: Direction.BOTTOM});

    public setup() {
        this.inTransition = new FadeTransition();
        this.outTransition = new FadeToBlackTransition({ duration: 0.5, exclusive: true });
        this.imageNode.appendTo(this.rootNode);
        this.overlayImageNode.moveTo(GAME_WIDTH / 2, GAME_HEIGHT).appendTo(this.rootNode);

        MusicManager.getInstance().loopTrack(0);
    }

    public cleanup(): void {
        this.rootNode.clear();
    }

    public startGame (): void {
        this.game.scenes.setScene(GameScene);
    }

    public gotoCredits (): void {
        this.game.scenes.setScene(SuccessScene);
    }

    public activate(): void {
        this.game.input.onButtonPress.connect(this.handleButton, this);
    }

    public deactivate(): void {
        this.game.input.onButtonPress.disconnect(this.handleButton, this);
    }

    private handleButton(event: ControllerEvent): void {
        if (event.intents & ControllerIntent.CONFIRM) {
            TitleScene.confirmSound.play();
            this.startGame();
        }
        if (event.intents & ControllerIntent.PLAYER_RELOAD) {
            TitleScene.confirmSound.play();
            this.gotoCredits();
        }
    }
}
