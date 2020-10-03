import { Aseprite } from "../../engine/assets/Aseprite";
import { asset } from "../../engine/assets/Assets";
import { Direction } from "../../engine/geom/Direction";
import { ReadonlyVector2 } from "../../engine/graphics/Vector2";
import { CharacterNode } from "./CharacterNode";
import { PlayerNode } from "./PlayerNode";

enum AiState {
    BORED = 0,
    FOLLOW = 1,
    ATTACK = 2
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

    /** Distance to player required for a successful melee attack */
    private squaredAttackDistance = 20 ** 2;

    /** ms it takes for enemy to attack player */
    private attackDelay = 300;

    private targetPosition: ReadonlyVector2;

    private state: AiState = AiState.BORED;

    private lastStateChange = 0;

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
            case AiState.ATTACK:
                this.updateAttack();
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
            // Hurt player
            if (squaredDistance < this.squaredAttackDistance) {
                this.tryToAttack();
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

    private updateAttack(): void {
        if (Date.now() > this.lastStateChange + this.attackDelay) {
            // Hurt player
            // TODO get player from some global game state variable instead of via id
            const player = this.getScene()?.getNodeById("player") as PlayerNode;
            player?.hurt();
            // Return to follow state
            this.setState(AiState.FOLLOW);
        }
    }

    private setState(state: AiState): void {
        if (this.state !== state) {
            this.state = state;
            this.lastStateChange = Date.now();
        }
    }

    private tryToAttack(): boolean {
        this.setState(AiState.ATTACK);
        return true;
    }
}
