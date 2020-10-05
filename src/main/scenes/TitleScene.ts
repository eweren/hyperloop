import { Hyperloop } from "../Hyperloop";
import { Scene } from "../../engine/scene/Scene";
import { GAME_HEIGHT, GAME_WIDTH, STANDARD_FONT } from "../constants";
import { TextNode } from "../../engine/scene/TextNode";
import { BitmapFont } from "../../engine/assets/BitmapFont";
import { asset } from "../../engine/assets/Assets";
import { Direction } from "../../engine/geom/Direction";
import { ImageNode } from "../../engine/scene/ImageNode";
import { GameScene } from "./GameScene";
import { Sound } from "../../engine/assets/Sound";
import { ControllerIntent } from "../../engine/input/ControllerIntent";

export class TitleScene extends Scene<Hyperloop> {
    @asset(STANDARD_FONT)
    private static font: BitmapFont;

    @asset("images/title-image.png")
    private static titleImage: HTMLImageElement;

    @asset("music/01-riding-the-hyperloop.ogg")
    private static bgm: Sound;

    private imageNode: ImageNode = new ImageNode({ image: TitleScene.titleImage, anchor: Direction.TOP_LEFT});
    private textNode = new TextNode({ font: TitleScene.font, anchor: Direction.BOTTOM });

    public setup() {
        this.imageNode.appendTo(this.rootNode);
        this.textNode
            .setText("PRESS ENTER TO START")
            .moveTo(GAME_WIDTH / 2, GAME_HEIGHT - 64)
            .appendTo(this.rootNode);

        TitleScene.bgm.play();
    }
    public cleanup(): void {
        this.rootNode.clear();
    }

    public startGame (): void {
        this.game.scenes.setScene(GameScene);
    }

    public update(dt: number, time: number): void {
        super.update(dt, time);
        const input = this.game.input;

        if (input.currentActiveIntents & ControllerIntent.CONFIRM) {
            this.startGame();
        }
    }
}
