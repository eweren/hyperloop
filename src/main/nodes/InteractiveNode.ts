
import { AsepriteNode, AsepriteNodeArgs } from "../../engine/scene/AsepriteNode";
import { clamp } from "../../engine/util/math";
import { CharacterNode } from "./CharacterNode";
import { PlayerNode } from "./PlayerNode";

export abstract class InteractiveNode extends AsepriteNode {
    private target: CharacterNode | null = null;
    private caption: string;
    private captionOpacity = 0;

    public constructor(args: AsepriteNodeArgs, caption: string = "") {
        super(args);
        this.caption = caption;
    }

    protected getRange(): number {
        return 30;
    }

    public update(dt: number, time: number): void {
        let target = null;
        if (this.canInteract()) {
            const player = this.getPlayer();
            if (player) {
                const dis = player.getScenePosition().getSquareDistance(this.getScenePosition());
                if (dis < this.getRange() ** 2) {
                    target = player;
                }
            }
        }
        this.setTarget(target);

        if (this.target) {
            this.captionOpacity = clamp(this.captionOpacity + dt * 2, 0, 1);
        } else {
            this.captionOpacity = clamp(this.captionOpacity - dt * 2, 0, 1);
        }
    }

    public abstract interact(): void;

    public canInteract(): boolean {
        return true;
    }

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

    protected getPlayer(): PlayerNode | undefined {
        return this.getScene()?.rootNode.getDescendantsByType(PlayerNode)[0];
    }

    public draw(context: CanvasRenderingContext2D): void {
        // Draw Caption
        if (this.caption !== "" && this.captionOpacity > 0) {
            context.save();
            context.font = "8px Arial";
            context.textAlign = "center";
            context.fillStyle = "black";
            context.strokeStyle = "white";
            context.globalAlpha *= this.captionOpacity;
            const offY = -12;
            context.strokeText(this.caption, 0, offY);
            context.fillText(this.caption, 0, offY);
            context.restore();
        }
    }
}
