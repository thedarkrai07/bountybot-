import { GuildMember, Role, Guild, DMChannel, AwaitMessagesOptions } from 'discord.js';
import client from '../app';
import { CommandContext } from 'slash-create';
import ValidationError from '../errors/ValidationError';

const DiscordUtils = {
    async getGuildMemberFromUserId(userId: string, guildID: string): Promise<GuildMember> {
        const guild = await client.guilds.fetch(guildID);
        return await guild.members.fetch(userId);
    },

    async getRoleFromRoleId(roleId: string, guildID: string): Promise<Role> {
        const guild = await client.guilds.fetch(guildID);
        return await guild.roles.fetch(roleId);
    },

    async getGuildAndMember(ctx: CommandContext): Promise<{ guild: Guild, guildMember: GuildMember }> {
        const guild = await client.guilds.fetch(ctx.guildID);
        return {
            guild: guild,
            guildMember: await guild.members.fetch(ctx.user.id),
        };
    },

    async awaitUserDM(dmChannel: DMChannel, replyOptions: AwaitMessagesOptions): Promise<string> {
		const message = (await dmChannel.awaitMessages(replyOptions)).first();
		const messageText = message.content;

		if(message.author.bot) {
			throw new ValidationError(
				'Detected bot response to last message! The previous bounty has been discarded.\n' +
				'Currently, you can only run one Bounty create command at once.\n' +
				'Be sure to check your DMs for any messages from Bountybot.\n' +
				'Please reach out to your favorite Bounty Board representative with any questions.\n',
			);
		}

		return messageText;
	},

    isAllowListedRole(guildMember: GuildMember, roles: string[]): boolean {
		return DiscordUtils.hasSomeRole(guildMember, roles);
	},

    hasSomeRole(guildMember: GuildMember, roles: string[]): boolean {
		for (const role of roles) {
			if (DiscordUtils.hasRole(guildMember, role)) {
				return true;
			}
		}
		return false;
	},

    hasRole(guildMember: GuildMember, role: string): boolean {
		return guildMember.roles.cache.some(r => r.id === role);
	},
}

export default DiscordUtils;