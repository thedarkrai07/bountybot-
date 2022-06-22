import { Message, MessageReaction, PartialUser, User } from 'discord.js';
import { handler } from '../activity/bounty/Handler';
import { BountyEmbedFields } from '../constants/embeds';
import AuthorizationError from '../errors/AuthorizationError';
import ValidationError from '../errors/ValidationError';
import { RefreshRequest } from '../requests/RefreshRequest';
import { DiscordEvent } from '../types/discord/DiscordEvent';
import DiscordUtils from '../utils/DiscordUtils';
import Log, { LogUtils } from '../utils/Log';

export default class implements DiscordEvent {
    name = 'messageReactionAdd';
    once = false;

    async execute(reaction: MessageReaction, user: User | PartialUser): Promise<any> {
        // When a reaction is received, check if the structure is partial
        if (reaction.partial) {
            // Log.info('Pulling full reaction from partial');
            await reaction.fetch();
        }

        if (user.partial) {
            // Log.info('Pulling full user from partial');
            try {
                await user.fetch();
            } catch (error) {
                LogUtils.logError('failed to pull user partial', error);
                return;
            }
        }

        if (user.bot) {
            // Log.info('Bot detected.');
            return;
        }

        if (reaction.message.author.id !== reaction.client.user.id) {
            // Log.info('Message Reaction Processing Stopped. Message author is not this bot');
            return;
        }

        await this.messageReactionHandler(reaction, user as User);
    }

    async messageReactionHandler(reaction: MessageReaction, user: User) {
        let message: Message = await reaction.message.fetch();
        Log.info(`Processing reaction ${reaction.emoji.name} to message ${message.id}`)
    
        if (message === null) {
            Log.debug('message not found');
            return;
        }

        if (message.embeds == null || message.embeds[0] == null || message.embeds[0].fields[BountyEmbedFields.bountyId] == null) {
            return;
        }

        const bountyId: string = DiscordUtils.getBountyIdFromEmbedMessage(message);
        if (!bountyId) return;

        let request: any;

        if (reaction.emoji.name === '🔄') {
            Log.info(`${user.tag} attempting to refresh the list`);
            request = new RefreshRequest({
                commandContext: null,
                messageReactionRequest: {
                    user: user,
                    message: message
                },
                buttonInteraction: null,
            });
        } else {
            return;
        }

        try {
            await handler(request);
        }
        catch (e) {
            if (e instanceof ValidationError) {
                // TO-DO: Consider adding a User (tag, id) metadata field to logging objects
                Log.info(`${user.tag} submitted a request that failed validation`);
                return user.send(`<@${user.id}>\n` + e.message);
            } else if (e instanceof AuthorizationError) {
                Log.info(`${user.tag} submitted a request that failed authorization`);
                return user.send(`<@${user.id}>\n` + e.message);
            }
            else {
                LogUtils.logError('error', e);
                return user.send('Sorry something is not working and our devs are looking into it.');
            }
        }
    }


}