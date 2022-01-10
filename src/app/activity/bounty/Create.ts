import { Bounty } from '../../types/bounty/Bounty';
import Log, { LogUtils } from '../../utils/Log';
import { Role, Message, MessageOptions, GuildMember, DMChannel, AwaitMessagesOptions, MessageReaction } from 'discord.js';
import DiscordUtils from '../../utils/DiscordUtils';
import BountyUtils from '../../utils/BountyUtils';
import MongoDbUtils from '../../utils/MongoDbUtils';
import { Db, InsertWriteOpResult, Double, Int32 } from 'mongodb'
import ValidationError from '../../errors/ValidationError';
import { BountyEmbedFields } from '../../constants/embeds';
import { CreateRequest } from '../../requests/CreateRequest';
import { publishBounty } from './Publish';
import { deleteBounty } from './Delete';
import { PublishRequest } from '../../requests/PublishRequest';
import { DeleteRequest } from '../../requests/DeleteRequest';
import { Activities } from '../../constants/activities';
import { BountyStatus } from '../../constants/bountyStatus';

export const createBounty = async (createRequest: CreateRequest): Promise<any> => {
    const guildAndMember = await DiscordUtils.getGuildAndMember(createRequest.guildId, createRequest.userId);
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
            guildMember.send({ content: `<@${guildMember.user.id}>\n` + e.message })
        }
    }

    await guildMember.send({ content: 'Awesome! Now what is absolutely required for the bounty to be complete?' });

    const criteria = await DiscordUtils.awaitUserDM(dmChannel, replyOptions);
    try {
        BountyUtils.validateCriteria(criteria);
    } catch (e) {
        if (e instanceof ValidationError) {
            guildMember.send({ content: `<@${guildMember.user.id}>\n` + e.message })
        }
    }
    if (createRequest.copies > 1) {
        const totalReward = Number(createRequest.reward.split(' ')[0]) * createRequest.copies;
        await guildMember.send({ content: `Are you sure you want to publish bounties with a \`total\` reward of \`${totalReward} ${createRequest.reward.split(' ')[1]}\`? (yes/no)` });
        const amountConfirmation: string = await DiscordUtils.awaitUserDM(dmChannel, replyOptions);
        if (!(amountConfirmation == 'yes' || amountConfirmation == 'YES' || amountConfirmation == 'Y' || amountConfirmation == 'Yes')) {
            guildMember.send({ content: 'Bounty deleted.' });
            throw new ValidationError('<@${guildMember.user.id}> check DM for more information.');
        }
    }

    let convertedDueDateFromMessage: Date;
    do {
        // TODO: update default date to a reaction instead of text input
        await guildMember.send({ content: 'Please enter `UTC` date in format `yyyy-mm-dd`, i.e 2022-01-01`? (type \'no\' or \'skip\' for a default value of 3 months from today)' });
        const dueAtMessageText = await DiscordUtils.awaitUserDM(dmChannel, replyOptions);

        if (dueAtMessageText.toLowerCase() !== 'no' || dueAtMessageText.toLowerCase() !== 'skip') {
            try {
                convertedDueDateFromMessage = BountyUtils.validateDate(dueAtMessageText);
            } catch (e) {
                Log.warn('user entered invalid date for bounty');
                await guildMember.send({ content: 'Please try `UTC` date in format `yyyy-mm-dd`, i.e 2021-08-15' });
            }
        } else if (dueAtMessageText.toLowerCase() === 'no') {
            convertedDueDateFromMessage = null;
            break;
        }

        if (convertedDueDateFromMessage.toString() === 'Invalid Date') {
            Log.warn('user entered invalid date for bounty');
            await guildMember.send({ content: 'Please try `UTC` date in format `yyyy-mm-dd`, i.e 2021-08-15' });
        }
    } while (convertedDueDateFromMessage.toString() === 'Invalid Date');
    const dueAt = convertedDueDateFromMessage ? convertedDueDateFromMessage : BountyUtils.threeMonthsFromNow();

    const [listOfPrepBounties, dbInsertResult] = await createDbHandler(
        createRequest,
        description,
        criteria,
        dueAt,
        guildMember);


    Log.info(`user ${guildMember.user.tag} inserted bounty into db`);
    const listOfBountyIds = Object.values(dbInsertResult.insertedIds).map(String);
    const newBounty = listOfPrepBounties[0];
    let bountyPreview: MessageOptions = {
        embeds: [{
            title: newBounty.title,
            url: (process.env.BOUNTY_BOARD_URL + listOfBountyIds[0]),
            author: {
                icon_url: guildMember.user.avatarURL(),
                name: newBounty.createdBy.discordHandle,
            },
            description: newBounty.description,
            fields: [
                // TODO: figure out a way to explicitly match order with BountyEmbedFields
                // static bountyId = 0;
                // static criteria = 1;
                // static reward = 2;
                // static status = 3;
                // static deadline = 4;
                // static createdBy = 5;
                { name: 'Bounty Id', value: listOfBountyIds[0], inline: false },
                { name: 'Criteria', value: newBounty.criteria.toString() },
                { name: 'Reward', value: newBounty.reward.amount + ' ' + newBounty.reward.currency, inline: true },
                { name: 'Status', value: 'Open', inline: true },
                { name: 'Deadline', value: BountyUtils.formatDisplayDate(newBounty.dueAt), inline: true },
                { name: 'Created by', value: newBounty.createdBy.discordHandle.toString(), inline: true },
            ],
            timestamp: new Date().getTime(),
            footer: {
                text: '👍 - publish | ❌ - delete | Please reply within 60 minutes',
            },
        }],
    };

    if (newBounty.gate) {
        const role: Role = await DiscordUtils.getRoleFromRoleId(newBounty.gate[0], guildId);
        bountyPreview.embeds[0].fields.push({ name: 'Gated to', value: role.name, inline: false });
    }

    await guildMember.send('Thank you! Does this look right?');
    const message: Message = await guildMember.send(bountyPreview);

    await message.react('👍');
    //TODO: fix edit functionality
    //await message.react('📝');
    await message.react('❌');

    return handleBountyReaction(message, guildMember, guildId, listOfBountyIds, createRequest);
}

const createDbHandler = async (
    createRequest: CreateRequest,
    description: string,
    criteria: string,
    dueAt: Date,
    guildMember: GuildMember
): Promise<[Bounty[], InsertWriteOpResult<any>]> => {
    const db: Db = await MongoDbUtils.connect('bountyboard');
    const dbBounty = db.collection('bounties');

    // TODO: perform copies validation
    const rawCopies = createRequest.copies
    const copies = rawCopies && rawCopies > 0 ? rawCopies : 1;

    const listOfPrepBounties: Bounty[] = [];
    for (let i = 0; i < copies; i++) {
        listOfPrepBounties.push(generateBountyRecord(
            createRequest,
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
    createRequest: CreateRequest,
    description: string,
    criteria: string,
    dueAt: Date,
    guildMember: GuildMember
): Bounty => {

    Log.debug('generating bounty record')
    const [reward, symbol] = (createRequest.reward != null) ? createRequest.reward.split(' ') : [null, null];
    let scale = reward.split('.')[1]?.length;
    scale = (scale != null) ? scale : 0;
    const currentDate = (new Date()).toISOString();
    let bountyRecord: Bounty = {
        customerId: createRequest.guildId,
        //TODO can we migrate from customer_id?
        customer_id: createRequest.guildId,
        title: createRequest.title,
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
                status: BountyStatus.draft,
                setAt: currentDate,
            },
        ],
        status: BountyStatus.draft,
        dueAt: dueAt.toISOString(),
    };

    if (createRequest.gate) {
        bountyRecord.gate = [createRequest.gate]
    }

    return bountyRecord;
};

const handleBountyReaction = (message: Message, guildMember: GuildMember, guildID: string, bountyIds: string[], createRequest: CreateRequest): Promise<any> => {
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
                // TODO: should this go through the handler chain?
                await publishBounty(new PublishRequest({
                    commandContext: null,
                    messageReactionRequest: null,
                    directRequest: {
                        bountyId: bountyId,
                        guildId: guildID,
                        userId: guildMember.user.id,
                        activity: Activities.publish,
                        // Keep a close eye on this value below in the future
                        // This value is guaranteed to be false only when this code is hit through the slash command flow
                        bot: guildMember.user.bot
                    }
                }));
            }
            return;
        } else if (reaction.emoji.name === '❌') {
            // TODO: should this go through the handler chain?
            Log.info('/bounty create new | delete given');
            for (const bountyId of bountyIds) {
                await deleteBounty(new DeleteRequest({
                    commandContext: null,
                    messageReactionRequest: null,
                    directRequest: {
                        bountyId: bountyId,
                        guildId: guildID,
                        userId: guildMember.user.id,
                        activity: Activities.delete,
                        // Keep a close eye on this value below in the future
                        // This value is guaranteed to be false only when this code is hit through the slash command flow
                        bot: guildMember.user.bot
                    }
                }));
            }
            return;
        }
    }).catch(e => {
        LogUtils.logError('failed to handle bounty reaction', e);
        return guildMember.send('Sorry something is not working and our devs are looking into it.');
    })
};