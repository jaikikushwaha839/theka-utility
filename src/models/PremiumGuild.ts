import { Schema, model, type Document } from 'mongoose';

export interface IPremiumGuild extends Document {
    guildId: string;
    active: boolean;
    addedBy: string;
    note?: string;
    expiresAt?: Date; // omit/null for permanent
    createdAt: Date;
}

const PremiumGuildSchema = new Schema<IPremiumGuild>({
    guildId: { type: String, required: true, unique: true },
    active: { type: Boolean, default: true },
    addedBy: { type: String, required: true },
    note: { type: String },
    expiresAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
});

export const PremiumGuild = model<IPremiumGuild>('PremiumGuild', PremiumGuildSchema);
