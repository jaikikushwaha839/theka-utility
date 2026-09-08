import { Schema, model, type Document } from 'mongoose';

export type ModActionType = 'warn' | 'kick' | 'ban' | 'unban' | 'mute' | 'unmute';

export interface IModCase extends Document {
    guildId: string;
    caseId: number;
    type: ModActionType;
    targetId: string;
    targetTag: string;
    moderatorId: string;
    moderatorTag: string;
    reason: string;
    duration?: string; // for mutes, e.g. "10m"
    active: boolean; // false once a warn is cleared, or a mute/ban is reversed
    createdAt: Date;
}

const ModCaseSchema = new Schema<IModCase>({
    guildId: { type: String, required: true, index: true },
    caseId: { type: Number, required: true },
    type: { type: String, required: true, enum: ['warn', 'kick', 'ban', 'unban', 'mute', 'unmute'] },
    targetId: { type: String, required: true, index: true },
    targetTag: { type: String, required: true },
    moderatorId: { type: String, required: true },
    moderatorTag: { type: String, required: true },
    reason: { type: String, default: 'No reason provided' },
    duration: { type: String },
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
});

// One incrementing case number per guild
ModCaseSchema.index({ guildId: 1, caseId: 1 }, { unique: true });

export const ModCase = model<IModCase>('ModCase', ModCaseSchema);

export async function getNextCaseId(guildId: string): Promise<number> {
    const last = await ModCase.findOne({ guildId }).sort({ caseId: -1 }).lean();
    return (last?.caseId ?? 0) + 1;
}
