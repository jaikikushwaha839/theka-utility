import { Schema, model, type Document } from 'mongoose';

export interface IAfkStatus extends Document {
    guildId: string;
    userId: string;
    reason: string;
    since: Date;
}

const AfkStatusSchema = new Schema<IAfkStatus>({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    reason: { type: String, default: 'AFK' },
    since: { type: Date, default: Date.now },
});

AfkStatusSchema.index({ guildId: 1, userId: 1 }, { unique: true });

export const AfkStatus = model<IAfkStatus>('AfkStatus', AfkStatusSchema);
