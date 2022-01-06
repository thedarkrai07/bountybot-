import { CommandContext } from 'slash-create'
import { Request } from './Request'
import { MessageReactionRequest } from '../types/discord/MessageReactionRequest';
import { Activities } from '../constants/activities';
import { Message } from 'discord.js';
import DiscordUtils from '../utils/DiscordUtils';

export class CompleteRequest extends Request {
    bountyId: string;
    commandContext: CommandContext;

    message: Message;
    
    constructor(args: {
        commandContext: CommandContext, 
        messageReactionRequest: MessageReactionRequest
    }) {
        if (args.commandContext) {
            let commandContext: CommandContext = args.commandContext;
            if (commandContext.subcommands[0] !== Activities.complete) {
                throw new Error('CompleteRequest attempted created for non Complete activity.');
            }
            super(Activities.complete, commandContext.guildID, args.commandContext.user.id, args.commandContext.user.bot);
            this.commandContext = commandContext;
            this.bountyId = commandContext.options.complete['bounty-id'];
        }
        else if (args.messageReactionRequest) {
            let messageReactionRequest: MessageReactionRequest = args.messageReactionRequest;
            super(Activities.complete, messageReactionRequest.message.guildId, messageReactionRequest.user.id, messageReactionRequest.user.bot);
            this.message = messageReactionRequest.message;
            this.bountyId = DiscordUtils.getBountyIdFromEmbedMessage(messageReactionRequest.message);
        }
    }
}