import { Aseprite } from "../../engine/assets/Aseprite";
import { asset } from "../../engine/assets/Assets";
import { Direction } from "../../engine/geom/Direction";
import { ReadonlyVector2 } from "../../engine/graphics/Vector2";
import { CharacterNode } from "./CharacterNode";

enum AiState {
    BORED = 0,
    FOLLOW = 1
}

export class EnemyNode extends CharacterNode {
    @asset("sprites/female.aseprite.json")
    private static sprite: Aseprite;

    /** How far enemy can see player while idling */
    private squaredViewDistance = 120 ** 2;

    /** How far enemy can see player while chasing him */
    private squaredAlertViewDistance = 250 ** 2;

    /** Distance to target position where enemy stops moving further */
    private squaredPositionThreshold = 20 ** 2;

    private targetPosition: ReadonlyVector2;

    private state: AiState = AiState.BORED;

    public constructor() {
        super({
            aseprite: EnemyNode.sprite,
            anchor: Direction.BOTTOM,
            tag: "idle"
        });
        this.targetPosition = this.getPosition();
    }

    public update(dt: number) {
        super.update(dt);
        // AI
        switch (this.state) {
            case AiState.BORED:
                this.updateBored();
                break;
            case AiState.FOLLOW:
                this.updateFollow();
                break;
        }
    }

    private updateBored(): void {
        // Check distance to player
        // TODO get player from some global game state variable instead of via id
        const player = this.getScene()?.getNodeById("player");
        if (player) {
            const squaredDistance = player.getPosition().getSquareDistance(this.getPosition());
            if (squaredDistance < this.squaredViewDistance) {
                // Player spotted!
                this.setState(AiState.FOLLOW);
                this.targetPosition = player.getPosition();
            }
        }
    }

    private updateFollow(): void {
        // TODO get player from some global game state variable instead of via id
        const player = this.getScene()?.getNodeById("player");
        // Update target position if seeing player
        if (player) {
            // Update target if in sight
            const squaredDistance = player.getPosition().getSquareDistance(this.getPosition());
            if (squaredDistance < this.squaredAlertViewDistance) {
                // Player spotted!
                this.setState(AiState.FOLLOW);
                this.targetPosition = player.getPosition();
            } else {
                // Player too far away
                // TODO add intermediate ALERT state or something, where it looks around actively
                this.setState(AiState.BORED);
            }
        }
        // Move to target
        if (this.getPosition().getSquareDistance(this.targetPosition) > this.squaredPositionThreshold) {
            if (this.getX() > this.targetPosition.x) {
                this.setDirection(-1);
            } else {
                this.setDirection(1);
            }
        }
    }

    private setState(state: AiState): void {
        if (this.state !== state) {
            this.state = state;
        }
    }
}
