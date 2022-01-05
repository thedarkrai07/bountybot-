import { CommandContext } from 'slash-create'
import { ClaimRequest } from '../../requests/ClaimRequest';

export const claimBounty = async (request: ClaimRequest): Promise<any> => {
    
    await request.commandContext.send({ content: `Mock Claim Bounty` });
}