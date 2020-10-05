import { Hyperloop } from "../Hyperloop";
import { Scene } from "../../engine/scene/Scene";
import { GAME_HEIGHT, GAME_WIDTH, STANDARD_FONT } from "../constants";
import { TextNode } from "../../engine/scene/TextNode";
import { BitmapFont } from "../../engine/assets/BitmapFont";
import { asset } from "../../engine/assets/Assets";
import { Direction } from "../../engine/geom/Direction";
import { ImageNode } from "../../engine/scene/ImageNode";
import { GameScene } from "./GameScene";
import { ControllerIntent } from "../../engine/input/ControllerIntent";
import { ControllerEvent } from "../../engine/input/ControllerEvent";
import { FadeToBlackTransition } from "../../engine/transitions/FadeToBlackTransition";
import { MusicManager } from "../MusicManager";

export class TitleScene extends Scene<Hyperloop> {
    @asset(STANDARD_FONT)
    private static font: BitmapFont;

    @asset("images/title-image.png")
    private static titleImage: HTMLImageElement;

    private imageNode: ImageNode = new ImageNode({ image: TitleScene.titleImage, anchor: Direction.TOP_LEFT});
    private textNode = new TextNode({ font: TitleScene.font, anchor: Direction.BOTTOM });

    public setup() {
        this.outTransition = new FadeToBlackTransition({ duration: 0.5, exclusive: true });
        this.imageNode.appendTo(this.rootNode);
        this.textNode
            .setText("PRESS ENTER TO START")
            .moveTo(GAME_WIDTH / 2, GAME_HEIGHT - 64)
            .appendTo(this.rootNode);

        MusicManager.getInstance().loopTrack(0);
    }

    public cleanup(): void {
        this.rootNode.clear();
    }

    public startGame (): void {
        this.game.scenes.setScene(GameScene);
    }

    public activate(): void {
        this.game.input.onButtonPress.connect(this.handleButton, this);
    }

    public deactivate(): void {
        this.game.input.onButtonPress.disconnect(this.handleButton, this);
    }

    private handleButton(event: ControllerEvent): void {
        if (event.intents & ControllerIntent.CONFIRM) {
            this.startGame();
        }
    }
}
