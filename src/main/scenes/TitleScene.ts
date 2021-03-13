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
import { GAME_HEIGHT, GAME_WIDTH, Layer, STANDARD_FONT } from "../constants";
import { Sound } from "../../engine/assets/Sound";
import { SuccessScene } from "./SuccessScene";
import { ControllerFamily } from "../../engine/input/ControllerFamily";
import { isDebugMap } from "../../engine/util/env";
import { PlayerListNode } from "../nodes/PlayerListNode";
import { BitmapFont } from "../../engine/assets/BitmapFont";

export class TitleScene extends Scene<Hyperloop> {
    @asset(STANDARD_FONT)
    private static font: BitmapFont;

    @asset("images/title-image.png")
    private static titleImage: HTMLImageElement;

    @asset("images/start-overlay-controller.png")
    private static controllerOverlayImage: HTMLImageElement;

    @asset("images/start-overlay.png")
    private static overlayImage: HTMLImageElement;

    @asset("sounds/interface/ticket.ogg")
    private static confirmSound: Sound;

    private imageNode: ImageNode = new ImageNode({ image: TitleScene.titleImage, anchor: Direction.TOP_LEFT, childAnchor: Direction.TOP_LEFT});
    private controllerImageNode: ImageNode = new ImageNode({ image: TitleScene.controllerOverlayImage, anchor: Direction.BOTTOM});
    private overlayImageNode: ImageNode = new ImageNode({ image: TitleScene.overlayImage, anchor: Direction.BOTTOM});
    private playerListNode?: PlayerListNode;

    public setup() {
        if (isDebugMap()) {
            this.startGame();
            return;
        }
        this.game.initOnlineGame();
        this.game.onGameStart.connect(this.startGame.bind(this));
        this.inTransition = new FadeTransition();
        this.outTransition = new FadeToBlackTransition({ duration: 0.5, exclusive: true });
        this.imageNode.appendTo(this.rootNode);

        MusicManager.getInstance().loopTrack(0);
    }

    public update(dt: number, time: number): void {
        if (this.input.currentControllerFamily === ControllerFamily.GAMEPAD && !this.controllerImageNode.getParent()) {
            this.controllerImageNode.moveTo(GAME_WIDTH / 2, GAME_HEIGHT).appendTo(this.rootNode);
            this.overlayImageNode.remove();
        } else if (this.input.currentControllerFamily === ControllerFamily.KEYBOARD && !this.overlayImageNode.getParent()) {
            this.overlayImageNode.moveTo(GAME_WIDTH / 2, GAME_HEIGHT).appendTo(this.rootNode);
            this.controllerImageNode.remove();
        }
        super.update(dt, time);
        if (!this.playerListNode?.isInScene()) {
            this.playerListNode = new PlayerListNode({ font: TitleScene.font,
                anchor: Direction.TOP_LEFT,
                layer: Layer.HUD
            });
            this.playerListNode.setX(4);
            this.playerListNode.setY(4);
            this.imageNode.appendChild(this.playerListNode);
        }
    }

    public cleanup(): void {
        this.rootNode.clear();
        this.game.onGameStart.disconnect(this.startGame.bind(this));
    }

    public startGame(): void {
        if (this.game.scenes.activeScene instanceof GameScene || !this.game.isHost) {
            return;
        }
        this.game.onGameStart.disconnect(this.startGame.bind(this));
        this.game.scenes.setScene(GameScene);
        if (this.game.isHost) {
            this.game.startForOtherPlayers();
        }
    }

    public gotoCredits (): void {
        this.game.scenes.setScene(SuccessScene);
    }

    public activate(): void {
        this.input.onButtonDown.connect(this.handleButton, this);
    }

    public deactivate(): void {
        this.input.onButtonDown.disconnect(this.handleButton, this);
    }

    private handleButton(event: ControllerEvent | MouseEvent): void {
        if (event instanceof MouseEvent || event.intents & ControllerIntent.CONFIRM) {
            TitleScene.confirmSound.play();
            this.startGame();
        } else if (event.intents & ControllerIntent.PLAYER_RELOAD) {
            TitleScene.confirmSound.play();
            this.gotoCredits();
        }
    }
}
