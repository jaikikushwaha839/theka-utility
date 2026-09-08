import { Schema, model, type Document } from 'mongoose';

export interface IGuildConfig extends Document {
    guildId: string;
    modLogChannelId?: string;
    muteRoleId?: string;
    prefix: string; // trigger prefix for custom text commands, e.g. "!"
    modmailCategoryId?: string; // category new modmail ticket channels get created under
}

const GuildConfigSchema = new Schema<IGuildConfig>({
    guildId: { type: String, required: true, unique: true },
    modLogChannelId: { type: String },
    muteRoleId: { type: String },
    prefix: { type: String, default: '!' },
    modmailCategoryId: { type: String },
});

export const GuildConfig = model<IGuildConfig>('GuildConfig', GuildConfigSchema);
