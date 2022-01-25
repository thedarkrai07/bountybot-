import { SubmitRequest } from '../../requests/SubmitRequest';
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


export const submitBounty = async (request: SubmitRequest): Promise<void> => {
    const submittedByUser = await DiscordUtils.getGuildMemberFromUserId(request.userId, request.guildId);
	Log.info(`${request.bountyId} bounty submitted by ${submittedByUser.user.tag}`);
	
    const getDbResult: {dbBountyResult: BountyCollection, bountyChannel: string} = await getDbHandler(request);
    await writeDbHandler(request, submittedByUser);

    let bountyEmbedMessage: Message;
    if (!request.message) {
        const bountyChannel: TextChannel = await submittedByUser.guild.channels.fetch(getDbResult.bountyChannel) as TextChannel;
        bountyEmbedMessage = await bountyChannel.messages.fetch(getDbResult.dbBountyResult.discordMessageId).catch(e => {
            LogUtils.logError(`could not find bounty ${request.bountyId} in discord #bounty-board channel ${bountyChannel.id} in guild ${request.guildId}`, e);
            throw new RuntimeError(e);
        });
    } else {
        bountyEmbedMessage = request.message;
    }
    
    await submitBountyMessage(bountyEmbedMessage, submittedByUser);
	
	const bountyUrl = process.env.BOUNTY_BOARD_URL + request.bountyId;
	const createdByUser: GuildMember = await submittedByUser.guild.members.fetch(getDbResult.dbBountyResult.createdBy.discordId);
	let creatorSubmitDM = `Please reach out to <@${submittedByUser.user.id}>. They are ready for bounty review ${bountyUrl}`

	if (request.url) {
		creatorSubmitDM += `\nPlease review this URL:\n${request.url}`
	}

	if (request.notes) {
		creatorSubmitDM += `\nPlease review these notes:\n${request.notes}`
	}
	await createdByUser.send({ content: creatorSubmitDM });
	await submittedByUser.send({ content: `Bounty in review! Expect a message from <@${createdByUser.id}>` });
    return;
}

/**
 * Wraps read only calls to the database.
 * Intended to be replaced with calls to the API.
 * Note that the full customer read result is left out to be forward compatible with
 *     publishing bounties to a specified discord channel or multiple discord channels.
 *     This is b/c bountyChannel will be consumed from the bounty record at every step except Submit
 * @param request SubmitRequest, passed from activity initiator
 * @returns 
 */
const getDbHandler = async (request: SubmitRequest): Promise<{dbBountyResult: BountyCollection, bountyChannel: string}> => {
    const db: Db = await MongoDbUtils.connect('bountyboard');
	const bountyCollection = db.collection('bounties');
    const customerCollection = db.collection('customers');

	const dbBountyResult: BountyCollection = await bountyCollection.findOne({
		_id: new mongo.ObjectId(request.bountyId),
		status: BountyStatus.in_progress,
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
const writeDbHandler = async (request: SubmitRequest, submittedByUser: GuildMember): Promise<void> => {
    const db: Db = await MongoDbUtils.connect('bountyboard');
	const bountyCollection = db.collection('bounties');

	const dbBountyResult: BountyCollection = await bountyCollection.findOne({
		_id: new mongo.ObjectId(request.bountyId),
		status: BountyStatus.in_progress,
	});

	const currentDate = (new Date()).toISOString();
	const writeResult: UpdateWriteOpResult = await bountyCollection.updateOne(dbBountyResult, {
		$set: {
			submittedBy: {
				discordHandle: submittedByUser.user.tag,
				discordId: submittedByUser.user.id,
				iconUrl: submittedByUser.user.avatarURL(),
			},
			submittedAt: currentDate,
			status: BountyStatus.in_review,
			submissionUrl: request.url,
			submissionNotes: request.notes,
		},
		$push: {
			statusHistory: {
				status: BountyStatus.in_review,
				setAt: currentDate,
			},
		},
	});

    if (writeResult.result.ok !== 1) {
        Log.error(`Write result did not execute correctly`);
        throw new Error(`Write to database for bounty ${request.bountyId} failed for Submit `);
    }
}

export const submitBountyMessage = async (message: Message, submittedByUser: GuildMember): Promise<any> => {
	Log.debug('fetching bounty message for submit')

	const embedMessage: MessageEmbed = message.embeds[0];
	embedMessage.fields[BountyEmbedFields.status].value = BountyStatus.in_review;
	embedMessage.setColor('#d39e00');
	embedMessage.addField('Submitted by', submittedByUser.user.tag, true);
	embedMessage.setFooter({text: '✅ - complete |  🆘 - help'});
	await message.edit({ embeds: [embedMessage] });
	await addSubmitReactions(message);
};

export const addSubmitReactions = async (message: Message): Promise<any> => {
	await message.reactions.removeAll();
	await message.react('✅');
	await message.react('🆘');
};