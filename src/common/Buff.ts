import { StartedGameContext } from "./game-context";

export interface Buff {
    id: string;
    name: string;
    description: string;
    onEffect: (ctx: StartedGameContext) => void;
    onApply?: (ctx: StartedGameContext) => void;
    onRemove?: (ctx: StartedGameContext) => void;

    remainingTime?: number;
    interval?: number;
}

export class Buff {
    private leap?: number;
    tick(ctx: StartedGameContext): boolean {
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