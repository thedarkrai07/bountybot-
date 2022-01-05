import { SubmitRequest } from '../../requests/SubmitRequest';

export const submitBounty = async (request: SubmitRequest): Promise<any> => {
    await request.commandContext.send({ content: `Mock Submit Bounty` });
}