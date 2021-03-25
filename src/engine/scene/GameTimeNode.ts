import { Game } from "../Game";
import { now } from "../util/time";
import { TextNode } from "./TextNode";

export class GameTimeNode<T extends Game> extends TextNode<T> {

    public update(dt: number, time: number) {
        super.update(dt, time);
        const currentTime = now() / 1000;
        const gameStartTime = this.getGame().getStartTime() ?? currentTime;
        const diff = (gameStartTime + this.getGame().getGameDuration() - currentTime).toFixed();
        this.setText(`${diff}`);
    }
}
