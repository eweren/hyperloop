
import { AsepriteNode } from "../../engine/scene/AsepriteNode";
import { CharacterNode } from "./CharacterNode";
import { PlayerNode } from "./PlayerNode";

export abstract class InteractiveNode extends AsepriteNode {
    private target: CharacterNode | null = null;

    protected getRange(): number {
        return 30;
    }

    public update(dt: number, time: number): void {
        let target = null;
        const player = this.getPlayer();
        if (player) {
            const dis = player.getScenePosition().getSquareDistance(this.getScenePosition());
            if (dis < this.getRange() ** 2) {
                target = player;
            }
        }
        this.setTarget(target);
    }

    public abstract interact(): void;

    private setTarget(target: CharacterNode | null): void {
        if (target !== this.target) {
            if (this.target) {
                this.target.unregisterInteractiveNode(this);
            }
            this.target = target;
            if (this.target) {
                this.target.registerInteractiveNode(this);
            }
        }
    }

    public getTarget(): CharacterNode | null {
        return this.target;
    }

    private getPlayer(): PlayerNode | undefined {
        return this.getScene()?.rootNode.getDescendantsByType(PlayerNode)[0];
    }
}
