import { CommandContext } from 'slash-create';
import MongoDbUtils  from '../../utils/MongoDbUtils';
import { Cursor, Db } from 'mongodb';
import { GuildMember, MessageEmbedOptions } from 'discord.js';
import Log from '../../utils/Log';
import { BountyCollection } from '../../types/BountyCollection';
import DiscordUtils from '../../utils/DiscordUtils';
import ValidationError from '../../errors/ValidationError';

const DB_RECORD_LIMIT = 10;

export default async (commandContext: CommandContext): Promise<any> => {
    const guildAndMember = await DiscordUtils.getGuildAndMember(commandContext);
    const guildMember: GuildMember = guildAndMember.guildMember;
    const guildId: string = guildAndMember.guild.id;
    const listType: string = commandContext.options.list['list-type'];

    let dbRecords: Cursor;
    // TODO: move to constants
	const db: Db = await MongoDbUtils.connect('bountyboard');
	const dbBounty = db.collection('bounties');

    Log.debug('Connected to database successfully.');
    Log.info('Bounty list type: ' + listType);

	switch (listType) { 
	case 'CREATED_BY_ME':
		dbRecords = dbBounty.find({ 'createdBy.discordId': guildMember.user.id, status: { $ne: 'Deleted' }, 'customerId': guildId }).limit(DB_RECORD_LIMIT);
		break;
	case 'CLAIMED_BY_ME':
		dbRecords = dbBounty.find({ 'claimedBy.discordId': guildMember.user.id, status: { $ne: 'Deleted' }, 'customerId': guildId }).limit(DB_RECORD_LIMIT);
		break;
    case 'CLAIMED_BY_ME_AND_COMPLETE':
        dbRecords = dbBounty.find({ 'claimedBy.discordId': guildMember.user.id, status: 'Completed', 'customerId': guildId }).limit(DB_RECORD_LIMIT);
        break;
	case 'DRAFTED_BY_ME':
		dbRecords = dbBounty.find({ 'createdBy.discordId': guildMember.user.id, status: 'Draft', 'customerId': guildId }).limit(DB_RECORD_LIMIT);
		break;
	case 'OPEN':
		dbRecords = dbBounty.find({ status: 'Open', 'customerId': guildId }).limit(DB_RECORD_LIMIT);
		break;
	case 'IN_PROGRESS':
		dbRecords = dbBounty.find({ status: 'In-Progress', 'customerId': guildId }).limit(DB_RECORD_LIMIT);
		break;
	default:
		Log.info('invalid list-type');
		return commandContext.send({ content: 'Please select a valid list-type from the command menu' });
	}
	if (!await dbRecords.hasNext()) {
		return commandContext.send({ content: 'We couldn\'t find any bounties!' });
	}
	return sendMultipleMessages(guildMember, dbRecords, guildId);
};

const sendMultipleMessages = async (guildMember: GuildMember, dbRecords: Cursor, guildId: string): Promise<any> => {
	const listOfBounties = [];
	while (listOfBounties.length < 10 && await dbRecords.hasNext()) {
		const record: BountyCollection = await dbRecords.next();
		const messageOptions: MessageEmbedOptions = await generateListEmbedMessage(record, record.status, guildId);
		listOfBounties.push(messageOptions);
	}
	 await (guildMember.send({ embeds: listOfBounties }));
	await guildMember.send({ content: 'Please go to #🧀-bounty-board to take action.' });
};

// TODO: better as shared function
export const generateListEmbedMessage = async (dbBounty: BountyCollection, newStatus: string, guildID: string): Promise<MessageEmbedOptions> => {
	let messageEmbedOptions: MessageEmbedOptions = {
		color: 1998388,
		title: dbBounty.title,
        // TODO BOUNTY_BOARD_URL should be multitenant
		url: (process.env.BOUNTY_BOARD_URL + dbBounty._id.toHexString()),
		author: {
			iconURL: dbBounty.createdBy.iconUrl,
			name: dbBounty.createdBy.discordHandle,
		},
		description: dbBounty.description,
		fields: [
			{ name: 'HashId', value: dbBounty._id.toHexString(), inline: false },
			{ name: 'Criteria', value: dbBounty.criteria, inline: false },
			{ name: 'Reward', value: dbBounty.reward.amount + ' ' + dbBounty.reward.currency.toUpperCase(), inline: true },
			{ name: 'Status', value: newStatus, inline: true },
			{ name: 'Deadline', value: formatDisplayDate(dbBounty.dueAt), inline: true },
			{ name: 'Created by', value: dbBounty.createdBy.discordHandle, inline: true },
		],
		timestamp: new Date().getTime(),
		// footer: {
		// 	text: '🏴 - claim | 🔄 - refresh | 📝 - edit | ❌ - delete',
		// },
	};

	let isUser = true;
	let isRole = true;

	if(dbBounty.gate) {
		try {
			const guildMember = await DiscordUtils.getGuildMemberFromUserId(dbBounty.gate[0], guildID);
			messageEmbedOptions.fields.push(
				{ name: 'Gated to', value: guildMember.user.tag, inline: false })
		}
		catch (error) {
			isUser = false;
			Log.info(`Publishing: Gate ${dbBounty.gate} is not a User`);
		}

		try {
			const role = await DiscordUtils.getRoleFromRoleId(dbBounty.gate[0], guildID);
			messageEmbedOptions.fields.push({ name: 'Gated to', value: role.name, inline: false })
		}
		catch (error) {
			isRole = false;
			Log.info(`Publishing: Gate ${dbBounty.gate} is not a Role`);
		}

		if(! (isUser || isRole) ) {
			Log.info(`Publishing bounty failed. Not gated to user or role`)
			throw new ValidationError('Please gate this bounty to a user or role.');
		}
	}

	return messageEmbedOptions;
};

// TODO: shared function
export const formatDisplayDate = (dateIso: string): string => {
    const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    };
    return (new Date(dateIso)).toLocaleString('en-US', options);
}