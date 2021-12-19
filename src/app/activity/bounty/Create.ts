import { CommandContext } from 'slash-create'

export default async (commandContext: CommandContext): Promise<any> => {
    await commandContext.send({ content: `Mock Create Bounty` });
}