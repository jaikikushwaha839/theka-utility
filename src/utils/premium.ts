import { PremiumGuild } from '../models/PremiumGuild';

/** True if the guild has an active, non-expired premium entry. */
export async function isPremiumGuild(guildId: string): Promise<boolean> {
    const entry = await PremiumGuild.findOne({ guildId, active: true });
    if (!entry) return false;
    if (entry.expiresAt && entry.expiresAt.getTime() < Date.now()) return false;
    return true;
}
