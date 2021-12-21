import { CommandContext } from 'slash-create'
import Log from '../../utils/Log';

export default async (commandContext: CommandContext): Promise<any> => {
    await commandContext.send({ content: `Mock Create Bounty` });
    Log.debug('Create!');
}