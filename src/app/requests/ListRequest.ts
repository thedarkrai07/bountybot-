import { CommandContext } from 'slash-create'
import { Request } from './Request'
import { Activities } from '../constants/activities';

export class ListRequest extends Request {
    listType: string;
    commandContext: CommandContext;

    constructor(args: {
        commandContext: CommandContext, 
    }) {
        if (args.commandContext) {
            if (args.commandContext.subcommands[0] !== Activities.list) {
                throw new Error('ListRequest created for non List activity.');
            }
            super(args.commandContext.subcommands[0], args.commandContext.guildID, args.commandContext.user.id, args.commandContext.user.bot);
            this.listType = args.commandContext.options.list['list-type'];
            this.commandContext = args.commandContext;
        }

        else {
            throw new Error('ListRequest needs a non null commandContext')
        }
    }
}