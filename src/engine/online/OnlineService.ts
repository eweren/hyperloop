import * as io from "socket.io-client";

import { getRoom, isDev } from "../util/env";
import { Service } from "../util/service";
import { Signal } from "../util/Signal";
import { randomNames } from "./randomNames";

export interface RoomInfoEvent {
    host: string,
    users: Array<string>,
    playerJoined?: string,
    playerLeft?: string,
    gameTime?: number
}

export interface ActionEvent {
    id: string | number | null;
    type: string;
    args: any;
}

@Service
export class OnlineService {
    /** The username of the current user. */
    public username = randomNames[Math.floor(Math.random() * randomNames.length - 1)];

    /** The usernames of the other players in this game. */
    public players: Set<string> = new Set();

    /** Emits on updates of some character in the game. */
    public onCharacterUpdate = new Signal<any>();

    /** Emits on updates of some characters actions. */
    public onCharacterAction = new Signal<ActionEvent>();

    /** Emits if the current user is target of an event. */
    public onPlayerUpdate = new Signal<any>();

    /** Emits if the current player has successfully connected. */
    public onPlayerConnect = new Signal<void>();

    /** Emits if the current player has lost connection. */
    public onPlayerDisconnect = new Signal<void>();

    /** Emits if a new player has connected. */
    public onOtherPlayerConnect = new Signal<string>();

    /** Emits if a new player has joined. */
    public onOtherPlayerJoined = new Signal<any>();

    /** Emits if a gameTime update was emitted. */
    public onGameTimeUpdate = new Signal<number>();

    /** Emits if a player has lost connection. */
    public onOtherPlayerDisconnect = new Signal<string>();

    /** Emits if the gameState changed. Something like the host started the game. */
    public onGameStateUpdate = new Signal<string>();

    /** The socket.io client that handles all the updates. */
    private socket: SocketIOClient.Socket;

    /** Flag if the current user is the host of the room. */
    private _isHost = false;

    /** Holds the last gamestate in order to minimize unneeded payload. */
    private _lastGameState = "";

    public constructor() {
        const onlineBaseUrl = isDev() ? "http://localhost:3000/" : "https://hyperloop.thearc.dev:3000/";
        let room = getRoom();
        if (!room) {
            room = (Math.random() * 10000000).toFixed();
        }

        // Initialize socket and add current user to the list of users.
        this.socket = io.connect(onlineBaseUrl, { query: { room, username: this.username }, transportOptions: ["websocket"] });
        this.socket.on("connect", () => {
            this.onPlayerConnect.emit();
            this.players.add(this.username!);
        });

        // Listen on characterUpdate. Those updates are related to every character in the game and thus are very time
        // sensitive.
        this.socket.on("characterUpdate", (val: any) => {
            // We have to differentiate between actions that are related to other users characters or our own.
            if (val.username !== this.username) {
                this.onCharacterUpdate.emit(val);
            } else {
                // this.onPlayerUpdate.emit(val);
            }
        });

        // Listen on characterJoined. Those updates are related to every character in the game and thus are very time
        // sensitive.
        this.socket.on("characterJoined", (val: any) => {
            // We have to differentiate between actions that are related to other users characters or our own.
            if (val.username !== this.username) {
                this.onOtherPlayerJoined.emit(val);
            }
        });

        // Listen on playersUpdate. This is initially fired when a user joins the game.
        this.socket.on("playersUpdate", (val: Array<any>) => {
            val.forEach(player => {
                this.onOtherPlayerJoined.emit(player);
            });
        });

        // Listen on characterEvent. Those updates are related to every character in the game and thus are very time
        // sensitive.
        this.socket.on("characterEvent", (val: ActionEvent) => {
            // We have to differentiate between actions that are related to other users characters or our own.
            if (val.id !== this.username) {
                this.onCharacterAction.emit(val);
            }
        });

        // Listen on gameTime. Those updates are related to the online game-state.
        this.socket.on("gameTime", (val: number) => {
            this.onGameTimeUpdate.emit(val);
        });

        // Listen on updates of the room. Those are typically actions like players joining/leaving or host.switching.
        this.socket.on("roomInfo", (val: RoomInfoEvent) => {

            this._isHost = val.host === this.username;
            this.players = new Set(val.users);
            if (val.playerJoined) {
                this.onOtherPlayerConnect.emit(val.playerJoined);
            }
            if (val.playerLeft) {
                this.onOtherPlayerDisconnect.emit(val.playerLeft);
            }
            if (val.gameTime) {
                this.onGameTimeUpdate.emit(val.gameTime);
            }
        });

        // Listen on gameState changes. Those events are typically fired on gameStart, if the host starts a diacount or
        // other actions that result in stage-changes.
        this.socket.on("gameState", (val: string) => {
            this.onGameStateUpdate.emit(val);
        });

        this.socket.on("disconnect", () => {
            this.onPlayerDisconnect.emit();
        });
    }

    /**
     * Returns if the currentUser is the host of this session.
     * @returns if the currentUser is the host of this session.
     */
    public isHost(): boolean {
        return this._isHost;
    }

    /**
     * Sends an update of the characters values to the server, so that other clients of the room can react to the
     * changes.
     * @param event - The event to be send as an update.
     */
    public emitCharacterUpdate(event: any): void {
        if (!event.username || event.username === this.username) {
            this.socket.emit("characterUpdate", event);
        }
    }

    /**
     * Sends an update of the gameState to the server, so that other clients of the room can react to the changes.
     * @param event - The event to be send as an update.
     */
    public emitGameState(event: string, startTime?: number): void {
        if (this._lastGameState === event) {
            return;
        }
        if (event === "startGame" && startTime) {
            this.socket.emit("gameTime", startTime / 1000);
        }
        this._lastGameState = event;
        this.socket.emit("gameState", event);
    }

    /**
     * Sends an update of the characters actions to the server, so that other clients of the room can react to the
     * changes.
     * @param event - the event to emit.
     */
    public emitCharacterEvent(event: ActionEvent) {
        if (event.id != null) {
            this.socket.emit("characterEvent", event);
        }
    }
}
