import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    AutoModerationRuleTriggerType,
    AutoModerationActionType,
    AutoModerationRuleEventType,
} from 'discord.js';
import type { Command } from '../../types';
import { buildConfirmEmbed } from '../../utils/embeds';

const KEYWORD_RULE_NAME = 'dyno-clone: banned keywords';
const MENTION_SPAM_RULE_NAME = 'dyno-clone: mention spam';

export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('automod')
        .setDescription('Set up native Discord AutoMod rules for this server.')
        .addSubcommand((sub) =>
            sub
                .setName('keywords')
                .setDescription('Block messages containing specific words/phrases')
                .addStringOption((opt) =>
                    opt.setName('words').setDescription('Comma-separated list of words/phrases to block').setRequired(true),
                )
                .addChannelOption((opt) => opt.setName('alert_channel').setDescription('Channel to send AutoMod alerts to')),
        )
        .addSubcommand((sub) =>
            sub
                .setName('mention-spam')
                .setDescription('Block messages that mention too many users at once')
                .addIntegerOption((opt) =>
                    opt.setName('limit').setDescription('Max mentions allowed per message').setMinValue(2).setMaxValue(50).setRequired(true),
                ),
        )
        .addSubcommand((sub) => sub.setName('list').setDescription('List active AutoMod rules created by this bot'))
        .addSubcommand((sub) =>
            sub
                .setName('disable')
                .setDescription('Disable a rule created by this bot')
                .addStringOption((opt) =>
                    opt
                        .setName('rule')
                        .setDescription('Which rule to disable')
                        .setRequired(true)
                        .addChoices({ name: 'Banned keywords', value: 'keywords' }, { name: 'Mention spam', value: 'mention-spam' }),
                ),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .setDMPermission(false),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const guild = interaction.guild;

        if (sub === 'keywords') {
            const raw = interaction.options.getString('words', true);
            const keywords = raw.split(',').map((w) => w.trim()).filter(Boolean).slice(0, 1000); // Discord's per-rule cap
            const alertChannel = interaction.options.getChannel('alert_channel');

            if (keywords.length === 0) {
                return interaction.reply({ embeds: [buildConfirmEmbed('Provide at least one word or phrase.', true)], ephemeral: true });
            }

            const existing = (await guild.autoModerationRules.fetch()).find((r) => r.name === KEYWORD_RULE_NAME);
            if (existing) await existing.delete('Replaced by /automod keywords');

            await guild.autoModerationRules.create({
                name: KEYWORD_RULE_NAME,
                eventType: AutoModerationRuleEventType.MessageSend,
                triggerType: AutoModerationRuleTriggerType.Keyword,
                triggerMetadata: { keywordFilter: keywords },
                actions: [
                    { type: AutoModerationActionType.BlockMessage },
                    ...(alertChannel
                        ? [{ type: AutoModerationActionType.SendAlertMessage, metadata: { channel: alertChannel.id } }]
                        : []),
                ],
                enabled: true,
                reason: `Set up by ${interaction.user.tag} via /automod keywords`,
            });

            return interaction.reply({
                embeds: [buildConfirmEmbed(`Keyword filter enabled for **${keywords.length}** word/phrase(s).`)],
            });
        }

        if (sub === 'mention-spam') {
            const limit = interaction.options.getInteger('limit', true);

            const existing = (await guild.autoModerationRules.fetch()).find((r) => r.name === MENTION_SPAM_RULE_NAME);
            if (existing) await existing.delete('Replaced by /automod mention-spam');

            await guild.autoModerationRules.create({
                name: MENTION_SPAM_RULE_NAME,
                eventType: AutoModerationRuleEventType.MessageSend,
                triggerType: AutoModerationRuleTriggerType.MentionSpam,
                triggerMetadata: { mentionTotalLimit: limit },
                actions: [{ type: AutoModerationActionType.BlockMessage }],
                enabled: true,
                reason: `Set up by ${interaction.user.tag} via /automod mention-spam`,
            });

            return interaction.reply({
                embeds: [buildConfirmEmbed(`Mention-spam filter enabled — blocking messages with more than **${limit}** mentions.`)],
            });
        }

        if (sub === 'disable') {
            const which = interaction.options.getString('rule', true);
            const ruleName = which === 'keywords' ? KEYWORD_RULE_NAME : MENTION_SPAM_RULE_NAME;

            const rule = (await guild.autoModerationRules.fetch()).find((r) => r.name === ruleName);
            if (!rule) {
                return interaction.reply({ embeds: [buildConfirmEmbed('That rule is not currently set up.', true)], ephemeral: true });
            }

            await rule.delete(`Disabled by ${interaction.user.tag} via /automod disable`);
            return interaction.reply({ embeds: [buildConfirmEmbed(`Disabled the ${which === 'keywords' ? 'banned keywords' : 'mention spam'} rule.`)] });
        }

        // list
        const rules = (await guild.autoModerationRules.fetch()).filter((r) => r.name.startsWith('dyno-clone:'));
        if (rules.size === 0) {
            return interaction.reply({ embeds: [buildConfirmEmbed('No AutoMod rules set up yet.')], ephemeral: true });
        }

        const description = rules.map((r) => `**${r.name.replace('dyno-clone: ', '')}** — ${r.enabled ? 'enabled' : 'disabled'}`).join('\n');
        return interaction.reply({ embeds: [buildConfirmEmbed(description)], ephemeral: true });
    },
};
