import { Hyperloop } from "../Hyperloop";
import { Scene } from "../../engine/scene/Scene";
import { ProgressBarNode } from "../../engine/scene/ProgressBarNode";
import { TitleScene } from "./TitleScene";

export class LoadingScene extends Scene<Hyperloop> {
    private progressBar!: ProgressBarNode;

    public setup(): void {
        this.progressBar = new ProgressBarNode({
            x: this.game.width >> 1,
            y: this.game.height >> 1
        }).appendTo(this.rootNode);
    }

    public cleanup(): void {
        this.rootNode.clear();
    }

    public async activate(): Promise<void> {
        await this.game.assets.load(this.updateProgress.bind(this));
        this.game.scenes.setScene(TitleScene);
    }

    private updateProgress(total: number, loaded: number): void {
        if (loaded < total) {
            this.progressBar.setProgress(loaded / total);
        } else {
            this.progressBar.remove();
        }
    }
}
