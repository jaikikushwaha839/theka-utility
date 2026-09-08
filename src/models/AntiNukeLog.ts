import { Schema, model, type Document } from 'mongoose';

export type AntiNukeActionType = 'channelDelete' | 'roleDelete' | 'ban' | 'webhookCreate';

export interface IAntiNukeLog extends Document {
    guildId: string;
    actorId: string;
    actorTag: string;
    actionType: AntiNukeActionType;
    occurrences: number;
    punishment: string;
    createdAt: Date;
}

const AntiNukeLogSchema = new Schema<IAntiNukeLog>({
    guildId: { type: String, required: true, index: true },
    actorId: { type: String, required: true },
    actorTag: { type: String, required: true },
    actionType: { type: String, required: true },
    occurrences: { type: Number, required: true },
    punishment: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});

export const AntiNukeLog = model<IAntiNukeLog>('AntiNukeLog', AntiNukeLogSchema);
