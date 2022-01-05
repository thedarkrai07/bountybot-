import { CommandContext } from 'slash-create'
import { HelpRequest } from '../../requests/HelpRequest';

export const helpBounty = async (request: HelpRequest): Promise<any> => {
    await request.commandContext.send({ content: `Mock Help Bounty` });
}