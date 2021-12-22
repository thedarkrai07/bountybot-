import { CommandContext } from 'slash-create'
import { Bounty } from '../../types/Bounty';
import Log, { LogUtils } from '../../utils/Log';
import { Message, MessageOptions, GuildMember, DMChannel, AwaitMessagesOptions, MessageReaction } from 'discord.js';
import DiscordUtils from '../../utils/DiscordUtils';
import BountyUtils from '../../utils/BountyUtils';
import MongoDbUtils from '../../utils/MongoDbUtils';
import { Db, InsertWriteOpResult, Double, Int32 } from 'mongodb'
import ValidationError from '../../errors/ValidationError';
import { finalizeBounty } from '../bounty/Publish'
import { deleteBountyForValidId } from './Delete';
import { convertTypeAcquisitionFromJson } from 'typescript';

export default async (commandContext: CommandContext): Promise<any> => {
    const guildAndMember = await DiscordUtils.getGuildAndMember(commandContext);
    const guildMember: GuildMember = guildAndMember.guildMember;
    const guildId: string = guildAndMember.guild.id;

    const workNeededMessage: Message = await guildMember.send({ content: `Hello <@${guildMember.id}>! Can you tell me a description of your bounty?` });
	const dmChannel: DMChannel = await workNeededMessage.channel.fetch() as DMChannel;
	const replyOptions: AwaitMessagesOptions = {
		max: 1,
		time: 180000,
		errors: ['time'],
	};

	const description = await DiscordUtils.awaitUserDM(dmChannel, replyOptions);
    try {
	    BountyUtils.validateDescription(description);
    } catch (e) {
        if (e instanceof ValidationError) {
            guildMember.send({ content: `<@${guildMember.user.id}>\n` + e.message})
        }
    }

	await guildMember.send({ content: 'Awesome! Now what is absolutely required for the bounty to be complete?' });

	const criteria = await DiscordUtils.awaitUserDM(dmChannel, replyOptions);
    try {
	    BountyUtils.validateCriteria(criteria);
    } catch (e) {
        if (e instanceof ValidationError) {
            guildMember.send({ content: `<@${guildMember.user.id}>\n` + e.message})
        }
    }

	if (commandContext.options.create.copies > 1) {
		const totalReward = commandContext.options.create.reward.amount * commandContext.options.create.copies;
		await guildMember.send({ content: `Are you sure you want to publish bounties with a \`total\` reward of \`${totalReward} ${commandContext.options.create.reward.split(' ')[1]}\`? (yes/no)` });
		const amountConfirmation: string = await DiscordUtils.awaitUserDM(dmChannel, replyOptions);
		if (!(amountConfirmation == 'yes' || amountConfirmation == 'YES' || amountConfirmation == 'Y' || amountConfirmation == 'Yes')) {
			return guildMember.send({ content: 'Ok no problem, bounty deleted.' });
		}
	}

	let convertedDueDateFromMessage: Date;
	do {
		await guildMember.send({ content: 'Please enter `UTC` date in format `yyyy-mm-dd`, i.e 2021-08-15`? (no to exit)' });
		const dueAtMessageText = await DiscordUtils.awaitUserDM(dmChannel, replyOptions);

		if (dueAtMessageText !== 'no') {
			try {
				convertedDueDateFromMessage = BountyUtils.validateDate(dueAtMessageText);
			} catch(e) {
				Log.warn('user entered invalid date for bounty');
				await guildMember.send({ content: 'Please try `UTC` date in format `yyyy-mm-dd`, i.e 2021-08-15' });
			}
		} else if (dueAtMessageText === 'no') {
			convertedDueDateFromMessage = null;
			break;
		}

		if(convertedDueDateFromMessage.toString() === 'Invalid Date') {
			Log.warn('user entered invalid date for bounty');
			await guildMember.send({ content: 'Please try `UTC` date in format `yyyy-mm-dd`, i.e 2021-08-15' });
		}
	} while (convertedDueDateFromMessage.toString() === 'Invalid Date');
	const dueAt = convertedDueDateFromMessage ? convertedDueDateFromMessage : BountyUtils.threeMonthsFromNow();

    const [listOfPrepBounties, dbInsertResult] = await createDbHandler(
        commandContext, 
        guildId,
        description,
        criteria,
        dueAt,
        guildMember);


	Log.info(`user ${guildMember.user.tag} inserted bounty into db`);
	const listOfBountyIds = Object.values(dbInsertResult.insertedIds).map(String);
	const newBounty = listOfPrepBounties[0];
	let messageOptions: MessageOptions = {
		embeds: [{
			title: newBounty.title,
			url: (process.env.BOUNTY_BOARD_URL + listOfBountyIds[0]),
			author: {
				icon_url: guildMember.user.avatarURL(),
				name: newBounty.createdBy.discordHandle,
			},
			description: newBounty.description,
			fields: [
				{ name: 'HashId', value: listOfBountyIds[0], inline: false },
				{ name: 'Reward', value: newBounty.reward.amount + ' ' + newBounty.reward.currency, inline: true },
				{ name: 'Status', value: 'Open', inline: true },
				{ name: 'Deadline', value: BountyUtils.formatDisplayDate(newBounty.dueAt), inline: true },
				{ name: 'Criteria', value: newBounty.criteria.toString() },
				{ name: 'Created by', value: newBounty.createdBy.discordHandle.toString(), inline: true },
			],
			timestamp: new Date().getTime(),
			//TODO: fix edit functionality
			// footer: {
			// 	text: '👍 - publish | 📝 - edit | ❌ - delete | Please reply within 60 minutes',
			// },
			footer: {
				text: '👍 - publish | ❌ - delete | Please reply within 60 minutes',
			},
		}],
	};

	if(newBounty.gate) {
		try {
			const role = await DiscordUtils.getRoleFromRoleId(newBounty.gate[0], guildId);
			messageOptions.embeds[0].fields.push({ name: 'Gated to', value: role.name, inline: false })
		}
		catch (error) {
			Log.info(`Gate ${newBounty.gate} is not a Role`);
            throw new ValidationError('Please gate this bounty to a role.');
		}
	}

	await guildMember.send('Thank you! Does this look right?');
	const message: Message = await guildMember.send(messageOptions);

	await message.react('👍');
	//TODO: fix edit functionality
	//await message.react('📝');
	await message.react('❌');

	return handleBountyReaction(message, guildMember, guildId, listOfBountyIds);
}

const createDbHandler = async (
    commandContext: CommandContext, 
    guildId: string,
    description: string,
    criteria: string,
    dueAt: Date,
    guildMember: GuildMember
    ): Promise<[Bounty[], InsertWriteOpResult<any>]> => {
    const db: Db = await MongoDbUtils.connect('bountyboard');
	const dbBounty = db.collection('bounties');

    // TODO: perform copies validation
    const rawCopies = commandContext.options.create.copies
    const copies = rawCopies && rawCopies > 0 ? rawCopies : 1 ;

    const listOfPrepBounties: Bounty[] = [];
	for (let i = 0; i < copies; i++) {
		listOfPrepBounties.push(generateBountyRecord(commandContext.options.create,
            guildId,
            description,
            criteria,
            dueAt,
            guildMember));
	}

	const dbInsertResult = await dbBounty.insertMany(listOfPrepBounties, { ordered: false });
    if (dbInsertResult == null) {
		Log.error('failed to insert bounties into DB');
		throw new Error('Sorry something is not working, our devs are looking into it.');
	}

    return [listOfPrepBounties, dbInsertResult];

}

export const generateBountyRecord = (
    ctxOptions: { [key: string]: any },
    guildId: string,
    description: string,
    criteria: string,
    dueAt: Date,
    guildMember: GuildMember
    ): Bounty => {

    Log.debug('generating bounty record')
    const [reward, symbol] = (ctxOptions.reward != null) ? ctxOptions.reward.split(' ') : [null, null];
    let scale = reward.split('.')[1]?.length;
    scale = (scale != null) ? scale : 0;
	const currentDate = (new Date()).toISOString();
	let bountyRecord : Bounty = {
		customerId: guildId,
		//TODO can we migrate from customer_id?
		customer_id: guildId,
		title: ctxOptions.title,
		description: description,
		criteria: criteria,
		reward: {
			currency: symbol.toUpperCase(),
			amount: new Double(reward),
			scale: new Int32(scale),
			amountWithoutScale: new Int32(reward.replace('.', ''))
		},
		createdBy: {
			discordHandle: guildMember.user.tag,
			discordId: guildMember.user.id,
			iconUrl: guildMember.user.avatarURL(),
		},
		createdAt: currentDate,
		statusHistory: [
			{
				status: 'Draft',
				setAt: currentDate,
			},
		],
		status: 'Draft',
		dueAt: dueAt.toISOString(),
	};

	if(ctxOptions.gate) {
		bountyRecord.gate = ctxOptions.gate
	}

	return bountyRecord;
};

const handleBountyReaction = (message: Message, guildMember: GuildMember, guildID: string, bountyIds: string[]): Promise<any> => {
	return message.awaitReactions({
		max: 1,
		time: (6000 * 60),
		errors: ['time'],
		filter: async (reaction, user) => {
			return ['👍', '❌'].includes(reaction.emoji.name) && !user.bot;
		},
	}).then(async collected => {
		const reaction: MessageReaction = collected.first();
		if (reaction.emoji.name === '👍') {
			Log.info('/bounty create new | :thumbsup: up given');
			for (const bountyId of bountyIds) {
				await finalizeBounty(guildMember, bountyId, guildID);
			}
			return;
		} else if (reaction.emoji.name === '❌') {
			Log.info('/bounty create new | delete given');
			for (const bountyId of bountyIds) {
				await deleteBountyForValidId(guildMember, bountyId, guildID);
			}
			return;
		}
	}).catch(e => LogUtils.logError('failed to handle bounty reaction', e));
};