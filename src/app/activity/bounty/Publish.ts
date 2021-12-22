import { CommandContext } from 'slash-create'
import { GuildMember } from 'discord.js'

const Publish =  async (commandContext: CommandContext): Promise<any> => {
    await commandContext.send({ content: `Mock Publish Bounty` });
}

export const finalizeBounty = async (guildMember: GuildMember, bountyId: string, guildId: string) => {
    await guildMember.send({ content: `Mock Publish Bounty` });
}

export default Publish;