import { Schema, model, type Document } from 'mongoose';

export interface INoPrefixUser extends Document {
    userId: string;
    addedBy: string;
    note?: string;
    createdAt: Date;
}

const NoPrefixUserSchema = new Schema<INoPrefixUser>({
    userId: { type: String, required: true, unique: true },
    addedBy: { type: String, required: true },
    note: { type: String },
    createdAt: { type: Date, default: Date.now },
});

export const NoPrefixUser = model<INoPrefixUser>('NoPrefixUser', NoPrefixUserSchema);
