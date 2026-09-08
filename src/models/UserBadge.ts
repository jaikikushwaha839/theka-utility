import { Schema, model, type Document } from 'mongoose';

export interface IUserBadge extends Document {
    userId: string;
    badges: string[];
}

const UserBadgeSchema = new Schema<IUserBadge>({
    userId: { type: String, required: true, unique: true },
    badges: { type: [String], default: [] },
});

export const UserBadge = model<IUserBadge>('UserBadge', UserBadgeSchema);
