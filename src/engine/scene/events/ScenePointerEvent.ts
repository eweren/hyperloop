import { Game } from "../../Game";
import { ReadonlyVector2, Vector2 } from "../../graphics/Vector2";
import { Scene } from "../Scene";

export class ScenePointerEvent<T extends Game = Game, A = void> {
    private readonly position: ReadonlyVector2;

    public constructor(
        protected readonly scene: Scene<T, A>,
        protected readonly event: PointerEvent
    ) {
        const canvas = scene.game.canvas;
        const scaleX = canvas.width / canvas.offsetWidth;
        const scaleY = canvas.height / canvas.offsetHeight;
        const cameraTransformation = scene.camera.getSceneTransformation();
        this.position = new Vector2(event.offsetX, event.offsetY).scale(scaleX, scaleY).div(cameraTransformation);
    }

    public getX(): number {
        return this.position.x;
    }

    public getY(): number {
        return this.position.y;
    }

    public getPosition(): ReadonlyVector2 {
        return this.position;
    }
}
