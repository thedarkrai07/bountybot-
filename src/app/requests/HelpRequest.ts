import { CommandContext } from 'slash-create'
import { Request } from './Request'
import { Activities } from '../constants/activities';
import { MessageReactionRequest } from '../types/discord/MessageReactionRequest';

export class HelpRequest extends Request {
    bountyId: string;
    bountyCreatorId: string;
    commandContext: CommandContext;
    constructor(args: {
        commandContext: CommandContext, 
        messageReactionRequest: MessageReactionRequest
    }) {
        if (args.commandContext) {
            if (args.commandContext.subcommands[0] !== Activities.help) {
                throw new Error('ListRequest created for non List activity.');
            }
            super(args.commandContext.subcommands[0], args.commandContext.guildID, args.commandContext.user.id, args.commandContext.user.bot);
            this.commandContext = args.commandContext;
            // TODO: set HelpRequest fields
        }
        else if (args.messageReactionRequest) {
            let messageReactionRequest: MessageReactionRequest = args.messageReactionRequest;
            super(Activities.help, messageReactionRequest.message.guildId, messageReactionRequest.user.id, messageReactionRequest.user.bot);
        }

        else {
            throw new Error('ListRequest needs a non null commandContext')
        }
    }
}