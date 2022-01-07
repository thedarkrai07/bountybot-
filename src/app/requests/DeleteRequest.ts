import { CommandContext } from 'slash-create'
import { Request } from './Request'
import { MessageReactionRequest } from '../types/discord/MessageReactionRequest';
import { Activities } from '../constants/activities';

export class DeleteRequest extends Request {
    bountyId: string;
    commandContext: CommandContext;
    
    constructor(args: {
        commandContext: CommandContext, 
        messageReactionRequest: MessageReactionRequest
        directRequest: {
            bountyId: string,
            guildId: string,
            userId: string,
            activity: string,
            bot: boolean 
        }
    }) {
        if (args.commandContext) {
            let commandContext: CommandContext = args.commandContext;
            if (commandContext.subcommands[0] !== Activities.delete) {
                throw new Error('PublishRequest attempted created for non Publish activity.');
            }
            super(commandContext.subcommands[0], commandContext.guildID, commandContext.user.id, commandContext.user.bot);
            this.commandContext = commandContext;
            this.bountyId = commandContext.options.delete['bounty-id'];
        }
        else if (args.messageReactionRequest) {
            let messageReactionRequest: MessageReactionRequest = args.messageReactionRequest;
            super(Activities.publish, messageReactionRequest.message.guildId, messageReactionRequest.user.id, messageReactionRequest.user.bot);
        }
        else if (args.directRequest) {
            super(args.directRequest.activity, args.directRequest.guildId, args.directRequest.userId, args.directRequest.bot);
            this.bountyId = args.directRequest.bountyId;

        }
    }
}