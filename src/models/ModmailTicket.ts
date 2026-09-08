import { Schema, model, type Document } from 'mongoose';

export interface IModmailTicket extends Document {
    guildId: string;
    userId: string;
    userTag: string;
    channelId: string;
    open: boolean;
    claimedBy?: string;
    createdAt: Date;
    closedAt?: Date;
}

const ModmailTicketSchema = new Schema<IModmailTicket>({
    guildId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    userTag: { type: String, required: true },
    channelId: { type: String, required: true },
    open: { type: Boolean, default: true },
    claimedBy: { type: String },
    createdAt: { type: Date, default: Date.now },
    closedAt: { type: Date },
});

export const ModmailTicket = model<IModmailTicket>('ModmailTicket', ModmailTicketSchema);
