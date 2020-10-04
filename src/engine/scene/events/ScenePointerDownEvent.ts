import { Game } from "../../Game";
import { ScenePointerEvent } from "./ScenePointerEvent";

export class ScenePointerDownEvent<T extends Game = Game, A = void> extends ScenePointerEvent<T, A> {
}
