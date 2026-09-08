# dyno-clone

A small Dyno-style moderation bot built on **discord.js v14** and **mongoose**.
Slash-command based, MongoDB-backed case log, DM notifications styled like Dyno's
warning embeds (colored action card + plain "Message from server" card).

## Commands

| Command | Permission | What it does |
|---|---|---|
| `/warn <user> <reason>` | Moderate Members | Warns a user, DMs them, logs a case |
| `/warnings <user>` | Moderate Members | Lists a user's active warnings |
| `/clearwarn <case_id>` | Moderate Members | Deactivates a single warning case |
| `/kick <user> <reason>` | Kick Members | Kicks a user, DMs them first, logs a case |
| `/ban <user> <reason> [delete_days]` | Ban Members | Bans a user, DMs them first, logs a case |
| `/unban <user_id> [reason]` | Ban Members | Unbans by ID, logs a case |
| `/mute <user> <duration> <reason>` | Moderate Members | Native Discord timeout (max 28d), DMs, logs a case |
| `/unmute <user> [reason]` | Moderate Members | Clears an active timeout, logs a case |
| `/modlog <channel>` | Manage Server | Sets the channel mod actions get logged to |
| `/purge <amount> [user]` | Manage Messages | Bulk-deletes recent messages (optionally filtered by user) |
| `/customcommand add/remove/list` | Manage Server | Create text-triggered auto-replies (e.g. `!rules`) |
| `/prefix view` | Everyone | Shows the current server prefix |
| `/prefix set <prefix>` | Manage Server | Changes the server prefix (e.g. to `-`) |
| `/automod keywords/mention-spam/list/disable` | Manage Server | Sets up **native Discord AutoMod** rules (keyword filter, mention-spam blocking) |
| `/modmail setup <category>` | Manage Server | Sets the category new modmail tickets are created under |
| `/modmail close` | Manage Server | Closes the modmail ticket in the current channel |
| `/slowmode <seconds> [channel]` | Manage Channels | Sets per-user rate limit on a channel |
| `/lock [channel] [reason]` | Manage Channels | Denies @everyone Send Messages in a channel |
| `/unlock [channel]` | Manage Channels | Restores @everyone Send Messages |
| `/case <case_id>` | Moderate Members | Shows full details of one mod case |
| `/antinuke enable/disable/status` | Administrator | Turns anti-nuke protection on/off, shows config |
| `/antinuke config` | Administrator | Sets threshold, time window, punishment, log channel |
| `/antinuke reset` | Administrator | Resets thresholds/punishment to defaults |
| `/antinuke logs [limit]` | Administrator | Shows recent anti-nuke incidents |
| `/antinuke whitelist add/remove/list` | Administrator | Exempts trusted users from detection |
| `/nick <user> [nickname]` | Manage Nicknames | Sets or resets a member's nickname |
| `/role add/remove <user> <role>` | Manage Roles | Adds/removes a role from a member |
| `/role info <role>` | Manage Roles | Shows a role's color, position, member count, etc. |
| `/userinfo [user]` | Everyone | Account/join dates, roles, boost status |
| `/channelinfo [channel]` | Everyone | Channel type, topic, slowmode, category |
| `/serverinfo` | Everyone | Member/channel/role counts, boost tier, owner |
| `/permissions [user] [channel]` | Moderate Members | Shows a member's resolved permissions |
| `/stafflist` | Everyone | Lists members holding a moderation-capable role |
| `/modstats [moderator] [days]` | Moderate Members | Mod action counts — per-mod or server leaderboard |
| `/afk [reason]` | Everyone | Marks you AFK; auto-clears and notes mentions until you speak again |
| `/badge view [user]` | Everyone | Shows a user's profile badges |
| `/badge add/remove <user> <badge>` | **Bot developers only** | Grants/revokes a badge |
| `/ping` | Everyone | Shows roundtrip and WebSocket latency |
| `/devinfo` | Everyone | Bot stats: developer(s), uptime, server count, versions, memory |
| `/premium status` | Everyone | Checks whether the current server has premium |
| `/premium add/remove <guild_id>` | **Bot developers only** (see `DEV_IDS`) | Grants/revokes premium for a server, optionally with an expiry |
| `/botprofile nickname/avatar/reset` | Manage Server + **premium required** | Per-server bot nickname/avatar customization |
| `/noprefix add/remove/list` | **Bot developers only** | Lets a user run commands with no prefix at all |
| `/blacklist add/remove/list` | **Bot developers only** | Blocks a user or server from using the bot entirely |
| `/guildinspect <guild_id>` | **Bot developers only** | Inspects any server the bot is in, by ID |
| `/guilds` | **Bot developers only** | Lists every server the bot is in |
| `/help [command]` | Everyone | Lists all commands, or detailed usage for one |

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment** — copy `.env.example` to `.env` and fill in:
   - `DISCORD_TOKEN` — your bot's token (Discord Developer Portal → Bot)
   - `CLIENT_ID` — your application's client ID
   - `MONGODB_URI` — connection string (local Mongo, or Atlas)
   - `GUILD_ID` *(optional)* — set this while developing so slash commands
     register instantly to one server instead of taking up to an hour globally
   - `EMBED_COLOR` *(optional)* — hex color (no `#`) for the action embeds

3. **Enable required intents** in the Developer Portal → Bot page (both are privileged and must be toggled on there, not just in code):
   - `SERVER MEMBERS INTENT` (needed to fetch members for moderation/timeouts)
   - `MESSAGE CONTENT INTENT` (needed to read message text for custom commands)

4. **Invite the bot** with the `bot` and `applications.commands` scopes and at
   least: Kick Members, Ban Members, Moderate Members, Manage Guild
   (for `/modlog`), Manage Channels (for `/slowmode`, `/lock`, `/modmail`),
   Manage Roles (for `/role`, anti-nuke role-strip punishment), Manage
   Nicknames (`/nick`, `/afk`), View Audit Log (**required for anti-nuke** —
   without it, incident detection silently can't identify who did what),
   Send Messages, Embed Links.

5. **Register slash commands**
   ```bash
   npm run deploy
   ```

6. **Run the bot**
   ```bash
   npm run dev     # ts-node-dev, hot reload
   # or
   npm run build && npm start   # compiled JS
   ```

## Notes on structure

- `src/utils/modAction.ts` is the shared path every punishment command routes
  through — it creates the case in Mongo, DMs the user with the Dyno-style
  embeds, and posts to the mod-log channel if one is configured. Add a new
  action type by extending `ModActionType` in `src/models/ModCase.ts` and the
  `ACTION_VERBS` map in `src/utils/embeds.ts`.
- Mutes use Discord's **native timeout** (`GuildMember.timeout()`) rather than
  a mute role — no extra permission wrangling per-channel, capped at 28 days
  by Discord itself.
- Case numbers auto-increment per guild (`getNextCaseId`), matching Dyno's
  `Case #N` footer convention.
- `/automod` calls Discord's **native AutoModeration API** directly (creates
  real server-side rules) rather than scanning messages in JS — faster, and
  it keeps working even if the bot goes offline. The bot's role needs
  **Manage Server** for these calls to succeed.
- `/customcommand` triggers are handled in `src/events/messageCreate.ts`
  by prefix match. Requires the `MESSAGE CONTENT` privileged intent.
- The prefix itself is per-guild — `/prefix set <new_prefix>` changes it
  (e.g. `-` instead of `!`). `/prefix view` is open to everyone so any
  member can check what it currently is; `/prefix set` is visible to
  everyone too but actually checks **Manage Server** in code before
  applying the change (rather than hiding the subcommand via Discord's
  permission gate) — so "anyone can type `/prefix -`" gets a clear
  permission-denied reply rather than either silently failing or actually
  letting non-staff change it.

## Setting up modmail

1. Create a channel **category** for tickets (e.g. "Modmail") and set its
   permissions so only your staff role(s) can view it — every new ticket
   channel inherits whatever overwrites you put on the category, so this is
   the only place you need to configure access.
2. Run `/modmail setup category:<that category>` in the server.
3. Users DM the bot to open a ticket. If the bot is only in one server with
   modmail configured, a ticket opens immediately; if it shares multiple
   modmail-enabled servers with that user, it asks them to pick one from a
   dropdown first.
4. Staff reply by typing in the ticket channel — messages get relayed to the
   user's DMs automatically (and vice versa, every DM they send back shows
   up in the channel).
5. Run `/modmail close` in the ticket channel when done. The channel is
   locked and renamed to `closed-<user>` rather than deleted, so the
   transcript stays available — delete it manually once you no longer need it.

The bot needs **Manage Channels** permission to create ticket channels.

## Anti-Nuke

`/antinuke enable` turns on detection per-server (off by default). It watches
four gateway events — channel deletes, role deletes, bans, and webhook
creation — and for each one looks up the **audit log** entry from the last
few seconds to identify who actually did it (`src/utils/antinuke.ts`,
`getRecentExecutor`). If the same person crosses the configured threshold
within the configured time window, they're punished automatically:

- `/antinuke config threshold:<n> window:<seconds> punishment:<strip_roles|kick|ban> log_channel:<#channel>`
- Defaults: 3 actions within 10 seconds → strip all roles.
- The guild owner and anyone on `/antinuke whitelist` are always exempt.
- Every incident is logged to Mongo (`/antinuke logs`) and, if configured,
  posted to a log channel.

This needs the **View Audit Log** permission — without it, `getRecentExecutor`
silently returns nothing and no punishment fires (it fails safe rather than
guessing). It also needs the `GuildWebhooks` gateway intent, already added
in `src/client.ts`.

**Worth knowing:** the action-counting is in-memory (`src/utils/antinuke.ts`),
not persisted — a bot restart clears any burst that was mid-count. This is
intentional (anti-nuke cares about a burst happening *right now*), but it
means a very slow, patient attacker spread across a restart wouldn't
accumulate a count. For most nuke attempts (which are fast) this doesn't
matter.

## Staff utility & AFK

- `/stafflist` has no separate setup step — it lists any member holding a
  role with Administrator, Kick/Ban Members, Manage Messages, or Moderate
  Members. That's a heuristic, not a config value, so a "Community Helper"
  role without moderation permissions won't show up.
- `/modstats` reads the same `ModCase` collection every punishment command
  already writes to — no separate tracking needed.
- `/afk` prepends `[AFK] ` to the user's nickname (skipped if the bot can't
  manage that member) and clears automatically — both the nickname and the
  Mongo record — the next time they send a message.

## Developer tools

- `/blacklist add type:guild id:<id>` also makes the bot leave that server
  immediately. `/blacklist add type:user` blocks that user's commands and
  modmail DMs everywhere. Both are checked in `messageCreate.ts` and
  `interactionCreate.ts` before anything else runs.
- `/noprefix add user:<user>` — a Discord user in the list can trigger any
  built-in command by typing its name with **no prefix at all** (`ping`
  instead of `!ping`). This is a real trade-off, not free: it means every
  message that user sends which happens to start with a word matching a
  command name will attempt to run it. Grant it sparingly (e.g. to
  yourself, for testing) rather than broadly.
- `/guildinspect` and `/guilds` are read-only lookups over guilds the bot is
  already in — useful for support/debugging without needing to join every
  server yourself.
- All of these follow the `/premium` pattern: no `setDefaultMemberPermissions`
  restriction (so Discord doesn't hide them from anyone), with the actual
  gate being `isDeveloper(interaction.user.id)` checked in code against the
  `DEV_IDS` env var. **They work identically via prefix** — the hybrid
  adapter described below doesn't care whether a command is dev-gated or
  not, since the real check happens inside `execute()` either way.

## Premium & bot profile customization

- `/premium add|remove` is restricted to Discord user IDs listed in the
  `DEV_IDS` env var (comma-separated), not any in-server permission — it's a
  cross-server, developer-level switch rather than something a guild admin
  can grant themselves.
- `/premium status` is open to anyone, so server admins can self-check.
- `/botprofile` (per-server nickname + avatar) is gated behind
  `isPremiumGuild()` in `src/utils/premium.ts` — the natural place to plug in
  more premium-only commands as you add them: check that function at the top
  of a command's `execute()` and reply with the same "premium required"
  message pattern used there.
- Per-guild bot **avatars** use Discord's Modify Current Member endpoint
  (`PATCH /guilds/{guild.id}/members/@me` with an `avatar` field), which
  Discord opened up to bots in September 2025. This needs a reasonably
  recent discord.js — `npm update discord.js` if `/botprofile avatar` fails
  with a 404. Nicknames use the standard `GuildMember.setNickname()` and work
  on any version.

## Prefix commands (`!warn`, `!ping`, etc.)

Every built-in slash command also works as a prefix command — same name,
same arguments, no separate implementation to maintain. `/warn @user
spamming` and `!warn @user spamming` run the exact same `execute()`
function.

**How it works:** `src/utils/prefixOptions.ts` reads a command's
`SlashCommandBuilder` JSON (the same definition used to register the slash
command) and walks it in order, consuming tokens from the raw message text —
mentions become Users/Channels, the last `STRING` option in a given
subcommand swallows the rest of the message (so free-text `reason`/`response`
fields work without quoting). `src/utils/messageCommandAdapter.ts` then
wraps the `Message` in an object shaped enough like a
`ChatInputCommandInteraction` — same `.guild`, `.channel`, `.client`, plus a
faked `.user`, `.options`, and `.reply()/.editReply()/.deferReply()` — that
existing commands run against it unmodified.

Since permission-gating (`setDefaultMemberPermissions`) is a Discord-side
gate that only applies to slash commands, `messageCreate.ts` checks it by
hand for prefix commands before running one — this is the one place that
actually differs by code path, not just by adapter shaping.

**Known trade-offs of this approach** (fine for most commands, worth knowing
if you add new ones):
- Only the **last** option in a subcommand's list gets multi-word text; an
  optional STRING option positioned *before* a trailing non-STRING option
  (e.g. `/premium add guild_id note days`, where `note` sits before the
  `days` integer) can only take a single word via prefix. Put free-text
  options last in the builder if you want them to work well from both paths.
- Slash-only UI affordances — `.addChoices()` validation, `.addChannelTypes()`
  filtering — aren't enforced in prefix mode; the command's own logic is
  what actually validates values either way, so this mostly just means
  prefix users get a plain error instead of Discord's autocomplete dropdown
  preventing a bad value up front.
- `ephemeral: true` is silently ignored for prefix replies (there's no such
  thing outside interactions) — the reply just posts normally in-channel.

To change a command's prefix name, name conflicts with `/customcommand`, or
per-guild prefix, use `/prefix set` — it's the same prefix used for both
systems, and built-in commands are matched before custom ones.
