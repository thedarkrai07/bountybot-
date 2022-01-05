import { CommandContext } from 'slash-create'
import { CompleteRequest } from '../../requests/CompleteRequest';

export const completeBounty = async (request: CompleteRequest): Promise<any> => {
    await request.commandContext.send({ content: `Mock Complete Bounty` });
}