import * as io from "socket.io-client";

import { Assets } from "./assets/Assets";
import { clamp } from "./util/math";
import { ControllerManager } from "./input/ControllerManager";
import { createCanvas, getRenderingContext } from "./util/graphics";
import { GamepadInput } from "./input/GamepadInput";
import { Keyboard } from "./input/Keyboard";
import { Scenes } from "./scene/Scenes";
import { GAME_HEIGHT, GAME_WIDTH } from "../main/constants";
import { getAudioContext } from "./assets/Sound";
import { Vector2Like } from "./graphics/Vector2";
import { Signal } from "./util/Signal";
import { getRoom, isDev } from "./util/env";
import { GameScene } from "../main/scenes/GameScene";
import { PlayerNode } from "../main/nodes/PlayerNode";

/**
 * Max time delta (in s). If game freezes for a few seconds for whatever reason, we don't want
 * updates to jump too much.
 */
const MAX_DT = 0.1;

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

export interface JoinEvent {
    username: string;
}

export abstract class Game {
    public readonly controllerManager = ControllerManager.getInstance();
    public readonly keyboard = new Keyboard();
    public readonly gamepad = new GamepadInput();
    public readonly scenes = new Scenes(this);
    public readonly assets = new Assets();

    public backgroundColor: string = "black";

    protected socket?: SocketIOClient.Socket;
    public username: string | null = null;
    public onPlayerUpdate = new Signal<UserEvent>();
    public onPlayerConnect = new Signal<string>();
    public onGameStart = new Signal<void>();
    public players: Set<string> = new Set();
    public isHost = false;

    public canvas: HTMLCanvasElement;
    private readonly ctx: CanvasRenderingContext2D;
    private readonly gameLoopCallback = this.gameLoop.bind(this);
    private gameLoopId: number | null = null;
    private lastUpdateTime: number = performance.now();
    protected currentTime: number = 0;
    protected paused = false;

    public constructor(public readonly width: number = GAME_WIDTH, public readonly height: number = GAME_HEIGHT) {
        const canvas = this.canvas = createCanvas(width, height);
        // Desynchronized sounds like a good idea but unfortunately it prevents pixelated graphics
        // on some systems (Chrome+Windows+NVidia for example which forces bilinear filtering). So
        // it is deactivated here.
        this.ctx = getRenderingContext(canvas, "2d", { alpha: false, desynchronized: false });
        const style = canvas.style;
        style.position = "absolute";
        style.margin = "auto";
        style.left = style.top = style.right = style.bottom = "0";
        style.imageRendering = "pixelated";
        style.imageRendering = "crisp-edges";
        document.body.appendChild(this.canvas);
        this.updateCanvasSize();
        window.addEventListener("resize", () => this.updateCanvasSize());
        canvas.addEventListener("contextmenu", event => {
            event.preventDefault();
        });

        // Use Alt+Enter to toggle fullscreen mode.
        window.addEventListener("keydown", async (event) => {
            if (event.altKey && event.key === "Enter") {
                const lockingEnabled = "keyboard" in navigator && "lock" in navigator.keyboard && typeof navigator.keyboard.lock === "function";
                // If the browser is in full screen mode AND fullscreen has been triggered by our own keyboard shortcut...
                if (window.matchMedia("(display-mode: fullscreen)").matches && document.fullscreenElement != null) {
                    if (lockingEnabled) {
                        navigator.keyboard.unlock();
                    }
                    await document.exitFullscreen();
                } else {
                    if (lockingEnabled) {
                        await navigator.keyboard.lock(["Escape"]);
                    }
                    await document.body.requestFullscreen();
                }
            }
        });
        this.input.onButtonDown.filter(ev => ev.isPause).connect(this.pauseGame, this);
    }

    public get input(): ControllerManager {
        return this.controllerManager;
    }

    public async initOnlineGame(): Promise<void> {
        const onlineBaseUrl = isDev() ? "http://localhost:3000/" : "https://ewer.rest:3000/";
        let room = getRoom();
        if (!room) {
            room = (Math.random() * 10000000).toFixed();
        }
        const playersInRoomRes = await (await fetch(`${onlineBaseUrl}${room}`)
            .then(response => response.json()));
        this.username = (Math.random() * 1000).toFixed(); //   window.prompt("Enter a username");
        let askForUsername = !this.username || playersInRoomRes?.includes(this.username);
        while (askForUsername) {
            this.username = window.prompt("Username already taken. Enter another username");
            askForUsername = !this.username || playersInRoomRes?.includes(this.username);
        }

        this.socket = io.connect(onlineBaseUrl, { query: { room, username: this.username },transportOptions: ["websocket"] });

        this.socket.on("connect", () => {
            this.players.add(this.username!);
        });

        this.socket.on("playerUpdate", (val: UserEvent) => {
            if (this.scenes.activeScene instanceof GameScene) {
                if (val.username !== this.username) {
                    this.spawnOtherPlayer(val);
                    this.onPlayerUpdate.emit(val);
                }
            } else {
                this.onGameStart.emit();
                setTimeout(() => {
                    if (val.username !== this.username) {
                        this.spawnOtherPlayer(val);
                        this.onPlayerUpdate.emit(val);
                    }
                });
            }
        });

        this.socket.on("roomInfo", (val: {host: string, users: Array<string>}) => {
            if (val.host === this.username) {
                this.isHost = true;
            }
            this.players.clear();
            val.users.forEach(user => {
                this.players.add(user);
            });
            const removedPlayer = this.checkIfPlayersShouldBeRemoved();
            if (removedPlayer) {
                console.log(removedPlayer, " left the match");
            }
            this.getPlayer()?.syncCharacterState(true);
        });


        this.socket.on("disconnect", () => {
            console.log(this.socket!.id);
        });
    }
    public abstract checkIfPlayersShouldBeRemoved(): string | null;

    public abstract spawnOtherPlayer(event: UserEvent): Promise<void>;

    public abstract getPlayer(): PlayerNode;

    public syncNodeData(event: Partial<UserEvent>): void {
        this.socket?.emit("playerUpdate", event);
    }

    public pauseGame(): void {
        if (this.paused) {
            this.paused = false;
            getAudioContext().resume();
        } else {
            this.paused = true;
            getAudioContext().suspend();
        }
    }

    private updateCanvasSize(): void {
        const { width, height } = this;

        const scale = Math.max(
            1,
            Math.floor(Math.min(window.innerWidth / width, window.innerHeight / height))
        );

        const style = this.canvas.style;
        style.width = width * scale + "px";
        style.height = height * scale + "px";
    }

    private gameLoop(): void {
        const currentUpdateTime = performance.now();
        const dt = clamp((currentUpdateTime - this.lastUpdateTime) / 1000, 0, MAX_DT);
        this.currentTime += dt;
        // TODO if we are fancy, we may differentiate between elapsed system time and actual game time (e.g. to allow
        // pausing the game and stuff, or slow-mo effects)
        this.update(dt, this.currentTime);
        this.lastUpdateTime = currentUpdateTime;

        const { ctx, width, height } = this;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = this.backgroundColor;
        ctx.fillRect(0, 0, width, height);
        this.draw(ctx, width, height);
        ctx.restore();

        this.nextFrame();
    }

    private nextFrame(): void {
        this.gameLoopId = requestAnimationFrame(this.gameLoopCallback);
        // this.gameLoopId = window.setTimeout(this.gameLoopCallback, 50); // simulate low FPS rate
    }

    protected update(dt: number, time: number): void {
        this.gamepad.update();
        if (!this.paused) {
            this.scenes.update(dt, time);
        }
    }

    protected draw(ctx: CanvasRenderingContext2D, width: number, height: number): void {
        this.scenes.draw(ctx, width, height);
    }

    public start(): void {
        if (this.gameLoopId == null) {
            this.lastUpdateTime = performance.now();
            this.nextFrame();
        }
    }

    public startForOtherPlayers(): void {
        this.socket?.emit("startGame");
    }

    public stop(): void {
        if (this.gameLoopId != null) {
            cancelAnimationFrame(this.gameLoopId);
            this.gameLoopId = null;
        }
    }

    public getTime(): number {
        return this.currentTime;
    }
}
