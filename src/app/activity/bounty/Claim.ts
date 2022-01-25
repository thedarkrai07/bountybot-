import { GuildMember, Message, MessageEmbed, TextChannel } from 'discord.js';
import { ClaimRequest } from '../../requests/ClaimRequest';
import { BountyCollection } from '../../types/bounty/BountyCollection';
import DiscordUtils from '../../utils/DiscordUtils';
import Log, { LogUtils } from '../../utils/Log';
import mongo, { Db, UpdateWriteOpResult } from 'mongodb';
import MongoDbUtils from '../../utils/MongoDbUtils';
import { CustomerCollection } from '../../types/bounty/CustomerCollection';
import RuntimeError from '../../errors/RuntimeError';
import { BountyEmbedFields } from '../../constants/embeds';
import { BountyStatus } from '../../constants/bountyStatus';

export const claimBounty = async (request: ClaimRequest): Promise<any> => {
    const claimedByUser = await DiscordUtils.getGuildMemberFromUserId(request.userId, request.guildId);
	Log.info(`${request.bountyId} bounty claimed by ${claimedByUser.user.tag}`);
	
    const getDbResult: {dbBountyResult: BountyCollection, bountyChannel: string} = await getDbHandler(request);
    await writeDbHandler(request, claimedByUser);
    
    let bountyEmbedMessage: Message;
    // TODO: consider changing claim, submit, complete, and delete requests to have a channel id instead of the complete Message
    if (!request.message) {
        const bountyChannel: TextChannel = await claimedByUser.guild.channels.fetch(getDbResult.bountyChannel) as TextChannel;
        bountyEmbedMessage = await bountyChannel.messages.fetch(getDbResult.dbBountyResult.discordMessageId).catch(e => {
            LogUtils.logError(`could not find bounty ${request.bountyId} in discord #bounty-board channel ${bountyChannel.id} in guild ${request.guildId}`, e);
            throw new RuntimeError(e);
        });
    } else {
        bountyEmbedMessage = request.message;
    }
    
    await claimBountyMessage(bountyEmbedMessage, claimedByUser);
	
	const bountyUrl = process.env.BOUNTY_BOARD_URL + request.bountyId;
	const createdByUser: GuildMember = await claimedByUser.guild.members.fetch(getDbResult.dbBountyResult.createdBy.discordId);
	let creatorClaimDM = `Your bounty has been claimed by <@${claimedByUser.user.id}>.\n${bountyUrl}`

	await createdByUser.send({ content: creatorClaimDM });

	await claimedByUser.send({ content: `You have claimed this bounty: ${bountyUrl} \nReach out to <@${createdByUser.id}> (${createdByUser.displayName}) with any questions` });
    return;
};

const getDbHandler = async (request: ClaimRequest): Promise<{dbBountyResult: BountyCollection, bountyChannel: string}> => {
    const db: Db = await MongoDbUtils.connect('bountyboard');
	const bountyCollection = db.collection('bounties');
    const customerCollection = db.collection('customers');

	const dbBountyResult: BountyCollection = await bountyCollection.findOne({
		_id: new mongo.ObjectId(request.bountyId),
        status: BountyStatus.open,
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

const writeDbHandler = async (request: ClaimRequest, claimedByUser: GuildMember): Promise<void> => {
    const db: Db = await MongoDbUtils.connect('bountyboard');
	const bountyCollection = db.collection('bounties');

	const dbBountyResult: BountyCollection = await bountyCollection.findOne({
		_id: new mongo.ObjectId(request.bountyId),
		status: BountyStatus.open,
	});
    
    const currentDate = (new Date()).toISOString();
	const writeResult: UpdateWriteOpResult = await bountyCollection.updateOne(dbBountyResult, {
		$set: {
			claimedBy: {
				discordHandle: claimedByUser.user.tag,
				discordId: claimedByUser.user.id,
				iconUrl: claimedByUser.user.avatarURL(),
			},
			claimedAt: currentDate,
			status: BountyStatus.in_progress,
		},
		$push: {
			statusHistory: {
				status: BountyStatus.in_progress,
				setAt: currentDate,
			},
		},
	});

    if (writeResult.result.ok !== 1) {
        Log.error(`Write result did not execute correctly`);
        throw new Error(`Write to database for bounty ${request.bountyId} failed for ${request.activity} `);
    }
}

export const claimBountyMessage = async (message: Message, claimedByUser: GuildMember): Promise<any> => {
	Log.debug(`fetching bounty message for claim`)
    
    const embedMessage: MessageEmbed = message.embeds[0];

	embedMessage.fields[BountyEmbedFields.status].value = BountyStatus.in_progress;
	embedMessage.setColor('#d39e00');
	embedMessage.addField('Claimed by', claimedByUser.user.tag, true);

	embedMessage.setFooter({text: '📮 - submit | 🆘 - help'});
	await message.edit({ embeds: [embedMessage] });
	await addClaimReactions(message);
};

export const addClaimReactions = async (message: Message): Promise<any> => {
	await message.reactions.removeAll();
	await message.react('📮');
	await message.react('🆘');
};