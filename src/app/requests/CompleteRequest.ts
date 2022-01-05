import { CommandContext } from 'slash-create'
import { Request } from './Request'
import { MessageReactionRequest } from '../types/discord/MessageReactionRequest';
import { Activities } from '../constants/activities';

export class CompleteRequest extends Request {
    bountyId: string;
    commandContext: CommandContext;
    
    constructor(args: {
        commandContext: CommandContext, 
        messageReactionRequest: MessageReactionRequest
    }) {
        if (args.commandContext) {
            let commandContext: CommandContext = args.commandContext;
            if (commandContext.subcommands[0] !== Activities.publish) {
                throw new Error('PublishRequest attempted created for non Publish activity.');
            }
            super(commandContext.subcommands[0], commandContext.guildID, args.commandContext.user.id, args.commandContext.user.bot);
            this.commandContext = commandContext;
            this.bountyId = commandContext.options.complete['bounty-id'];
        }
        else if (args.messageReactionRequest) {
            let messageReactionRequest: MessageReactionRequest = args.messageReactionRequest;
            super(Activities.publish, messageReactionRequest.message.guildId, messageReactionRequest.user.id, messageReactionRequest.user.bot);
        }
    }
}