import { Vector2Like } from "../graphics/Vector2";

export interface UserEvent {
    reload?: boolean;
    shoot?: boolean,
    jump?: boolean;
    mouseDistanceToPlayer?: number;
    username?: string;
    position?: Vector2Like;
    aimingAngle?: number;
    direction?: number;
    velocity?: Vector2Like;
    lastShotTime?: number;
    isOnGround?: boolean;
    isReloading?: boolean;
    isFalling?: boolean;
    hitpoints?: number;
    enemyId?: number;
}