import { Schema, model, type Document } from 'mongoose';

export type BlacklistType = 'user' | 'guild';

export interface IBlacklist extends Document {
    type: BlacklistType;
    targetId: string;
    reason: string;
    addedBy: string;
    createdAt: Date;
}

const BlacklistSchema = new Schema<IBlacklist>({
    type: { type: String, enum: ['user', 'guild'], required: true },
    targetId: { type: String, required: true },
    reason: { type: String, default: 'No reason provided' },
    addedBy: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});

BlacklistSchema.index({ type: 1, targetId: 1 }, { unique: true });

export const Blacklist = model<IBlacklist>('Blacklist', BlacklistSchema);
