import { WithCharacterContext } from "./game-context";

export interface Buff {
    id: string;
    name: string;
    description: string;
    onEffect: (ctx: WithCharacterContext) => void;
    onApply?: (ctx: WithCharacterContext) => void;
    onRemove?: (ctx: WithCharacterContext) => void;

    remainingTime?: number;
    interval?: number;
}

export class Buff {
    private leap?: number;
    tick(ctx: WithCharacterContext): boolean {
        if (!this.leap) {
            this.leap = ctx.time();
            this.onEffect(ctx);
        }
        if (!this.interval) return true;

        while (ctx.time() - this.leap >= this.interval) {
            if (this.remainingTime && this.remainingTime < this.interval) {
                // break;
                return false;
            }
            if (this.remainingTime) {
                this.remainingTime -= this.interval;
            }

            this.onEffect(ctx);
            this.leap += this.interval;
        }

        return true;
    }
}

// export class DiceBuff implements Buff {
//     id: string;
//     name: string;
//     description: string;
//     onEffect: (ctx: StartedGameContext) => void;
//     onApply?: ((ctx: StartedGameContext) => void) | undefined;
//     onRemove?: ((ctx: StartedGameContext) => void) | undefined;
//     remainingTime?: number | undefined;
//     interval?: number | undefined;
//     tick(ctx: StartedGameContext): boolean {
//         throw new Error("Method not implemented.");
//     }

// }