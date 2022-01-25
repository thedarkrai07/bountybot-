import { CompleteRequest } from '../../requests/CompleteRequest';
import DiscordUtils from '../../utils/DiscordUtils';
import Log, { LogUtils } from '../../utils/Log';
import { GuildMember, MessageEmbed, Message, TextChannel } from 'discord.js';
import MongoDbUtils from '../../utils/MongoDbUtils';
import mongo, { Db, UpdateWriteOpResult } from 'mongodb';
import { BountyCollection } from '../../types/bounty/BountyCollection';
import { CustomerCollection } from '../../types/bounty/CustomerCollection';
import RuntimeError from '../../errors/RuntimeError';
import { BountyStatus } from '../../constants/bountyStatus';
import { BountyEmbedFields } from '../../constants/embeds';


export const completeBounty = async (request: CompleteRequest): Promise<void> => {
    const completedByUser = await DiscordUtils.getGuildMemberFromUserId(request.userId, request.guildId);
	Log.info(`${request.bountyId} bounty completed by ${completedByUser.user.tag}`);
	
    const getDbResult: {dbBountyResult: BountyCollection, bountyChannel: string} = await getDbHandler(request);
    await writeDbHandler(request, completedByUser);

    let bountyEmbedMessage: Message;
    if (!request.message) {
        const bountyChannel: TextChannel = await completedByUser.guild.channels.fetch(getDbResult.bountyChannel) as TextChannel;
        bountyEmbedMessage = await bountyChannel.messages.fetch(getDbResult.dbBountyResult.discordMessageId).catch(e => {
            LogUtils.logError(`could not find bounty ${request.bountyId} in discord #bounty-board channel ${bountyChannel.id} in guild ${request.guildId}`, e);
            throw new RuntimeError(e);
        });
    } else {
        bountyEmbedMessage = request.message;
    }
    
    await completeBountyMessage(bountyEmbedMessage, completedByUser);
	
	const bountyUrl = process.env.BOUNTY_BOARD_URL + request.bountyId;
	const submittedByUser: GuildMember = await completedByUser.guild.members.fetch(getDbResult.dbBountyResult.submittedBy.discordId);
	const creatorCompleteDM = 
        `Thank you for reviewing ${bountyUrl}\n` +
        `Please remember to tip <@${submittedByUser.id}>`;

    
    const submitterCompleteDM = 
        `Your bounty has passed review and is now complete!\n${bountyUrl}\n` +
        `<@${completedByUser.id}> should be tipping you with ${getDbResult.dbBountyResult.reward.amount} ${getDbResult.dbBountyResult.reward.currency} soon`;
	
    
    await completedByUser.send({ content: creatorCompleteDM });
    await submittedByUser.send({ content: submitterCompleteDM})
    return;
}

/**
 * Wraps read only calls to the database.
 * Intended to be replaced with calls to the API.
 * Note that the full customer read result is left out to be forward compatible with
 *     publishing bounties to a specified discord channel or multiple discord channels.
 *     This is b/c bountyChannel will be consumed from the bounty record at every step except publish
 * @param request CompleteRequest, passed from activity initiator
 * @returns 
 */
const getDbHandler = async (request: CompleteRequest): Promise<{dbBountyResult: BountyCollection, bountyChannel: string}> => {
    const db: Db = await MongoDbUtils.connect('bountyboard');
	const bountyCollection = db.collection('bounties');
    const customerCollection = db.collection('customers');

	const dbBountyResult: BountyCollection = await bountyCollection.findOne({
		_id: new mongo.ObjectId(request.bountyId),
		status: BountyStatus.in_review,
	});

    if (request.message) {
        return {
            dbBountyResult: dbBountyResult,
            bountyChannel: null
        }
    }

    const dbCustomerResult: CustomerCollection = await customerCollection.findOne({
        customerId: request.guildId,
    });

    return {
        dbBountyResult: dbBountyResult,
        bountyChannel: dbCustomerResult.bountyChannel
    }
}

// TODO: consider adding the previous read result as a parameter to save a db read
const writeDbHandler = async (request: CompleteRequest, completedByUser: GuildMember): Promise<void> => {
    const db: Db = await MongoDbUtils.connect('bountyboard');
	const bountyCollection = db.collection('bounties');

	const dbBountyResult: BountyCollection = await bountyCollection.findOne({
		_id: new mongo.ObjectId(request.bountyId),
		status: BountyStatus.in_review,
	});

	const currentDate = (new Date()).toISOString();
	const writeResult: UpdateWriteOpResult = await bountyCollection.updateOne(dbBountyResult, {
		$set: {
			reviewedBy: {
				discordHandle: completedByUser.user.tag,
				discordId: completedByUser.user.id,
				iconUrl: completedByUser.user.avatarURL(),
			},
            // TO-DO: What is the point of status history if we publish createdAt, claimedAt... as first class fields?
            // note that createdAt, claimedAt are not part of the BountyCollection type
			reviewedAt: currentDate,
			status: BountyStatus.complete,
		},
		$push: {
			statusHistory: {
				status: BountyStatus.complete,
				setAt: currentDate,
			},
		},
	});

    if (writeResult.result.ok !== 1) {
        Log.error(`Write result did not execute correctly`);
        throw new Error(`Write to database for bounty ${request.bountyId} failed for Complete `);
    }
}

export const completeBountyMessage = async (message: Message, completedByUser: GuildMember): Promise<any> => {
	Log.debug('fetching bounty message for complete')

	const embedMessage: MessageEmbed = message.embeds[0];
	embedMessage.fields[BountyEmbedFields.status].value = BountyStatus.complete;
	embedMessage.setColor('#01d212');
	embedMessage.addField('Completed by', completedByUser.user.tag, true);
	embedMessage.setFooter({text: ''});
	await message.edit({ embeds: [embedMessage] });
	await addCompleteReactions(message);
};

export const addCompleteReactions = async (message: Message): Promise<any> => {
	await message.reactions.removeAll();
	await message.react('🔥');
};