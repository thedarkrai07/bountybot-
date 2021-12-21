import { GuildMember, Role, Guild } from 'discord.js';
import client from '../app';
import { CommandContext } from 'slash-create';

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
    }
}

export default DiscordUtils;