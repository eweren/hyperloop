
import { AsepriteNode, AsepriteNodeArgs } from "../../engine/scene/AsepriteNode";
import { clamp } from "../../engine/util/math";
import { Hyperloop } from "../Hyperloop";
import { CharacterNode } from "./CharacterNode";
import { PlayerNode } from "./PlayerNode";

export abstract class InteractiveNode extends AsepriteNode<Hyperloop> {
    private target: CharacterNode | null = null;
    protected caption: string;
    private captionOpacity = 0;
    protected hideSprite = false;

    public constructor(args: AsepriteNodeArgs, caption: string = "") {
        super(args);
        this.caption = caption;
    }

    public setCaption(caption: string): void {
        this.caption = caption;
    }

    protected getRange(): number {
        return 50;
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
        if (!this.hideSprite) {
            super.draw(context);
        }
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
