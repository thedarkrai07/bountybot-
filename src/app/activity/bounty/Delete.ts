import { CommandContext } from 'slash-create'
import { GuildMember } from 'discord.js';

export default async (commandContext: CommandContext): Promise<any> => {
    await commandContext.send({ content: `Mock Delete Bounty` });
}

export const deleteBountyForValidId = async (guildMember: GuildMember, bountyId: string, guildId: string): Promise<any> => {
    await guildMember.send({ content: `Mock Delete Bounty` });
}