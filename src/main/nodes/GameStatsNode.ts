import { OnlineService } from "../../engine/online/OnlineService";
import { TextNode, TextNodeArgs } from "../../engine/scene/TextNode";
import { Hyperloop } from "../Hyperloop";

export class GameStatsNode extends TextNode<Hyperloop> {
    private readonly onlineService = new OnlineService();

    public constructor(args: TextNodeArgs) {
        super(args);
        this.equalCharWidth = true;
    }

    public update(dt: number, time: number) {
        super.update(dt, time);
        this.setText(`PLAYER       |  K  |  D  |\n${[...this.getGame().getPlayers(), this.getGame().getPlayer()]
            .sort((a, b) => b.killCounter - a.killCounter)
            .map(player => `${player.username.toUpperCase().padEnd(12, " ").substr(0, 12)}${player.username === this.onlineService.username ? "←" : " "}| ${player.killCounter.toFixed().padStart(2, " ")}  | ${player.dieCounter.toFixed().padStart(2, " ")}  |`)
            .join("\n")}`);
    }

    /** @inheritDoc */
    public draw(ctx: CanvasRenderingContext2D): void {
        ctx.save();

        (CanvasRenderingContext2D.prototype as any)["roundRect"] = function (x: number, y: number, w: number, h: number, r: number) {
            if (w < 2 * r) r = w / 2;
            if (h < 2 * r) r = h / 2;
            this.beginPath();
            this.moveTo(x + r, y);
            this.arcTo(x + w, y, x + w, y + h, r);
            this.arcTo(x + w, y + h, x, y + h, r);
            this.arcTo(x, y + h, x, y, r);
            this.arcTo(x, y, x + w, y, r);
            this.closePath();
            return this;
        };
        if (this.getText() !== "") {
            ctx.beginPath();

            // Hack to get pixel boundaries correct
            const transform = ctx.getTransform();
            ctx.translate(
                Math.round(transform.e) - transform.e,
                Math.round(transform.f) - transform.f
            );
            const scale = this.getSceneTransformation().getScaleX();
            ctx.translate(0.5 * scale, 0.5 * scale);

            const w = this.getWidth();
            const h = this.getHeight();

            ctx.globalAlpha = 0.6;
            ctx.fillRect(-4, -4, w + 8, h + 12);
            ctx.fillStyle = "white";
            ctx.fill();
            ctx.globalAlpha = 1;
        }
        ctx.restore();
        ctx.save();
        super.draw(ctx);
        ctx.restore();
    }
}

