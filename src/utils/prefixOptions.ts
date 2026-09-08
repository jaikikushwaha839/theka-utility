import { ApplicationCommandOptionType, type Message, type Attachment, type User, type Channel, type Role } from 'discord.js';

export class UsageError extends Error {}

interface ParsedOption {
    name: string;
    type: ApplicationCommandOptionType;
    value: string | number | User | Channel | Attachment | Role | undefined;
}

/** Minimal stand-in for discord.js's CommandInteractionOptionResolver, built from parsed args. */
export class FakeOptionsResolver {
    private map = new Map<string, ParsedOption>();
    private subcommand?: string;
    private subcommandGroup?: string;

    setSubcommand(name: string) {
        this.subcommand = name;
    }

    setSubcommandGroup(name: string) {
        this.subcommandGroup = name;
    }

    set(option: ParsedOption) {
        this.map.set(option.name, option);
    }

    getSubcommand(): string {
        if (!this.subcommand) throw new UsageError('This command requires a subcommand.');
        return this.subcommand;
    }

    getSubcommandGroup(): string | null {
        return this.subcommandGroup ?? null;
    }

    getString(name: string, required = false): string | null {
        const val = this.map.get(name)?.value;
        if (val === undefined) {
            if (required) throw new UsageError(`Missing required argument: \`${name}\``);
            return null;
        }
        return String(val);
    }

    getInteger(name: string, required = false): number | null {
        const val = this.map.get(name)?.value;
        if (val === undefined) {
            if (required) throw new UsageError(`Missing required argument: \`${name}\``);
            return null;
        }
        const n = Number(val);
        if (Number.isNaN(n)) throw new UsageError(`\`${name}\` must be a number.`);
        return n;
    }

    getUser(name: string, required = false): User | null {
        const val = this.map.get(name)?.value as User | undefined;
        if (!val) {
            if (required) throw new UsageError(`Missing required argument: \`${name}\` (mention a user or give their ID)`);
            return null;
        }
        return val;
    }

    getChannel(name: string, required = false): Channel | null {
        const val = this.map.get(name)?.value as Channel | undefined;
        if (!val) {
            if (required) throw new UsageError(`Missing required argument: \`${name}\` (mention a channel or give its ID)`);
            return null;
        }
        return val;
    }

    getAttachment(name: string, required = false): Attachment | null {
        const val = this.map.get(name)?.value as Attachment | undefined;
        if (!val) {
            if (required) throw new UsageError(`Missing required argument: \`${name}\` (attach a file)`);
            return null;
        }
        return val;
    }

    getRole(name: string, required = false): Role | null {
        const val = this.map.get(name)?.value as Role | undefined;
        if (!val) {
            if (required) throw new UsageError(`Missing required argument: \`${name}\` (mention a role or give its ID)`);
            return null;
        }
        return val;
    }
}

const USER_MENTION = /^<@!?(\d+)>$/;
const CHANNEL_MENTION = /^<#(\d+)>$/;
const ROLE_MENTION = /^<@&(\d+)>$/;
const RAW_ID = /^\d{15,25}$/;

async function resolveUser(token: string, message: Message<true>): Promise<User | undefined> {
    const id = token.match(USER_MENTION)?.[1] ?? (RAW_ID.test(token) ? token : undefined);
    if (!id) return undefined;
    return (await message.client.users.fetch(id).catch(() => null)) ?? undefined;
}

async function resolveChannel(token: string, message: Message<true>): Promise<Channel | undefined> {
    const id = token.match(CHANNEL_MENTION)?.[1] ?? (RAW_ID.test(token) ? token : undefined);
    if (!id) return undefined;
    return message.guild.channels.cache.get(id) ?? (await message.guild.channels.fetch(id).catch(() => null)) ?? undefined;
}

function resolveRole(token: string, message: Message<true>): Role | undefined {
    const id = token.match(ROLE_MENTION)?.[1] ?? (RAW_ID.test(token) ? token : undefined);
    if (!id) return undefined;
    return message.guild.roles.cache.get(id) ?? undefined;
}

/**
 * Walks a slash command's builder JSON and consumes tokens from `args` in
 * the same order the options were declared, producing a FakeOptionsResolver
 * that existing command `execute()` functions can use transparently.
 *
 * The last STRING option in a given option list consumes the rest of the
 * message (so `reason`/`response`-style free-text fields work naturally).
 */
export async function parsePrefixArgs(
    commandJson: { options?: any[] },
    args: string[],
    message: Message<true>,
): Promise<FakeOptionsResolver> {
    const resolver = new FakeOptionsResolver();
    let options = commandJson.options ?? [];
    let cursor = 0;

    // Subcommand group? (e.g. `/antinuke whitelist add`) First token picks the group,
    // second picks the subcommand within it, then we parse against ITS options.
    if (options.length > 0 && options[0].type === ApplicationCommandOptionType.SubcommandGroup) {
        const groupName = args[cursor];
        const group = options.find((o) => o.name === groupName);
        if (!group) {
            const choices = options.map((o: any) => o.name).join('|');
            throw new UsageError(`Specify a subcommand group: \`${choices}\``);
        }
        resolver.setSubcommandGroup(group.name);
        cursor += 1;

        const subOptions = group.options ?? [];
        const subName = args[cursor];
        const sub = subOptions.find((o: any) => o.name === subName);
        if (!sub) {
            const choices = subOptions.map((o: any) => o.name).join('|');
            throw new UsageError(`Specify a subcommand: \`${groupName} <${choices}>\``);
        }
        resolver.setSubcommand(sub.name);
        options = sub.options ?? [];
        cursor += 1;
    }
    // Plain subcommand? First token selects it, then we parse against ITS options.
    else if (options.length > 0 && options[0].type === ApplicationCommandOptionType.Subcommand) {
        const subName = args[cursor];
        const sub = options.find((o) => o.name === subName);
        if (!sub) {
            const choices = options.map((o: any) => o.name).join('|');
            throw new UsageError(`Specify a subcommand: \`${choices}\``);
        }
        resolver.setSubcommand(sub.name);
        options = sub.options ?? [];
        cursor += 1;
    }

    for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        const isLast = i === options.length - 1;
        const raw = args[cursor];

        if (opt.type === ApplicationCommandOptionType.Attachment) {
            const attachment = message.attachments.first();
            if (attachment) resolver.set({ name: opt.name, type: opt.type, value: attachment });
            continue; // attachments aren't positional tokens, don't advance cursor
        }

        if (raw === undefined) continue; // leave unset — required-ness is checked when the command calls getX(name, true)

        if (opt.type === ApplicationCommandOptionType.String && isLast) {
            const rest = args.slice(cursor).join(' ');
            if (rest) resolver.set({ name: opt.name, type: opt.type, value: rest });
            cursor = args.length;
            continue;
        }

        if (opt.type === ApplicationCommandOptionType.User) {
            const user = await resolveUser(raw, message);
            if (user) resolver.set({ name: opt.name, type: opt.type, value: user });
            cursor += 1;
            continue;
        }

        if (opt.type === ApplicationCommandOptionType.Channel) {
            const channel = await resolveChannel(raw, message);
            if (channel) resolver.set({ name: opt.name, type: opt.type, value: channel });
            cursor += 1;
            continue;
        }

        if (opt.type === ApplicationCommandOptionType.Role) {
            const role = resolveRole(raw, message);
            if (role) resolver.set({ name: opt.name, type: opt.type, value: role });
            cursor += 1;
            continue;
        }

        // STRING (non-last) / INTEGER / anything else: single token
        resolver.set({ name: opt.name, type: opt.type, value: raw });
        cursor += 1;
    }

    return resolver;
}

/** Builds a `!command <sub> <arg> <arg>` usage hint from the builder JSON, for error messages. */
export function buildUsage(prefix: string, name: string, commandJson: { options?: any[] }): string {
    const options = commandJson.options ?? [];

    if (options.length > 0 && options[0].type === ApplicationCommandOptionType.SubcommandGroup) {
        const lines: string[] = [];
        for (const group of options) {
            for (const sub of group.options ?? []) {
                const parts = (sub.options ?? []).map((o: any) => (o.required ? `<${o.name}>` : `[${o.name}]`));
                lines.push(`${prefix}${name} ${group.name} ${sub.name} ${parts.join(' ')}`.trim());
            }
        }
        return lines.join('\n');
    }

    if (options.length > 0 && options[0].type === ApplicationCommandOptionType.Subcommand) {
        const subUsages = options.map((sub: any) => {
            const parts = (sub.options ?? []).map((o: any) => (o.required ? `<${o.name}>` : `[${o.name}]`));
            return `${prefix}${name} ${sub.name} ${parts.join(' ')}`.trim();
        });
        return subUsages.join('\n');
    }

    const parts = options.map((o: any) => (o.required ? `<${o.name}>` : `[${o.name}]`));
    return `${prefix}${name} ${parts.join(' ')}`.trim();
}
