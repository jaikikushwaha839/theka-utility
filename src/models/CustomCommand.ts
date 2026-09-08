import { Schema, model, type Document } from 'mongoose';

export interface ICustomCommand extends Document {
    guildId: string;
    name: string; // lowercase, no spaces
    response: string;
    createdBy: string;
    createdAt: Date;
}

const CustomCommandSchema = new Schema<ICustomCommand>({
    guildId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    response: { type: String, required: true },
    createdBy: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});

CustomCommandSchema.index({ guildId: 1, name: 1 }, { unique: true });

export const CustomCommand = model<ICustomCommand>('CustomCommand', CustomCommandSchema);
