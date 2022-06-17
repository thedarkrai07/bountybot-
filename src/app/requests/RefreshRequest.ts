import { CommandContext } from 'slash-create';
import { Request } from './Request';
import { MessageReactionRequest } from '../types/discord/MessageReactionRequest';
import { Activities } from '../constants/activities';
import { ButtonInteraction, Message } from 'discord.js';
import DiscordUtils from '../utils/DiscordUtils';

export class RefreshRequest extends Request {
    bountyId: string;

    commandContext: CommandContext;
    message: Message;
    buttonInteraction: ButtonInteraction;

    constructor(args: {
        commandContext: CommandContext,
        messageReactionRequest: MessageReactionRequest,
        buttonInteraction: ButtonInteraction,
    }) {
        if (args.messageReactionRequest) {
            const messageReactionRequest: MessageReactionRequest = args.messageReactionRequest;
            super(Activities.refresh, messageReactionRequest.message.guildId, messageReactionRequest.user.id, messageReactionRequest.user.bot);
            this.message = messageReactionRequest.message;
            this.buttonInteraction = args.buttonInteraction;
            this.bountyId = DiscordUtils.getBountyIdFromEmbedMessage(messageReactionRequest.message);
        }
    }
}