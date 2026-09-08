import { Schema, model, type Document } from 'mongoose';

export type AntiNukePunishment = 'strip_roles' | 'kick' | 'ban';

export interface IAntiNukeConfig extends Document {
    guildId: string;
    enabled: boolean;
    whitelist: string[]; // user IDs exempt from detection
    threshold: number; // actions allowed within windowSeconds before punishment fires
    windowSeconds: number;
    punishment: AntiNukePunishment;
    logChannelId?: string;
}

const AntiNukeConfigSchema = new Schema<IAntiNukeConfig>({
    guildId: { type: String, required: true, unique: true },
    enabled: { type: Boolean, default: false },
    whitelist: { type: [String], default: [] },
    threshold: { type: Number, default: 3 },
    windowSeconds: { type: Number, default: 10 },
    punishment: { type: String, enum: ['strip_roles', 'kick', 'ban'], default: 'strip_roles' },
    logChannelId: { type: String },
});

export const AntiNukeConfig = model<IAntiNukeConfig>('AntiNukeConfig', AntiNukeConfigSchema);

export const ANTINUKE_DEFAULTS = {
    threshold: 3,
    windowSeconds: 10,
    punishment: 'strip_roles' as AntiNukePunishment,
};
