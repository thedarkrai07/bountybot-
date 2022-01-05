import { CommandContext } from 'slash-create'
import { GuildMember } from 'discord.js';
import { DeleteRequest } from '../../requests/DeleteRequest';

export const deleteBounty = async (request: DeleteRequest): Promise<any> => {
    await request.commandContext.send({ content: `Mock Delete Bounty` });
}