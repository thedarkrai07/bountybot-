import { GuildMember, Role} from 'discord.js';
import client from '../app';

const DiscordUtils = {
    async getGuildMemberFromUserId(userId: string, guildID: string): Promise<GuildMember> {
		const guild = await client.guilds.fetch(guildID);
		return await guild.members.fetch(userId);
	},

    async getRoleFromRoleId(roleId: string, guildID: string): Promise<Role> {
		const guild = await client.guilds.fetch(guildID);
		return await guild.roles.fetch(roleId);
	},
}

export default DiscordUtils;