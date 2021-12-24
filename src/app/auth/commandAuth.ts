import { CommandContext } from 'slash-create';
import mongo, { Db } from 'mongodb';
import MongoDbUtils from '../utils/MongoDbUtils';
import { CustomerCollection } from '../types/CustomerCollection';
import { BountyCollection } from '../types/BountyCollection';
import AuthorizationError from '../errors/AuthorizationError';
import DiscordUtils from '../utils/DiscordUtils';
import { GuildMember } from 'discord.js';

const AuthModule = {
    async isAuth(commandContext: CommandContext): Promise<void> {
        if (commandContext.user.bot) {
            throw new AuthorizationError('Bots are unauthorized to work directly with bounties.')
        };

        switch (commandContext.subcommands[0]) {
            case 'create':
                return create(commandContext);
            case 'publish':
                return;
            case 'claim':
                return;
            case 'submit':
                return;
            case 'complete':
                return;
            case 'list':
                return;
            case 'delete':
                return;
            case 'help':
                return;
			case 'gm':
                return;
        }
    },
};

const create = async (commandContext: CommandContext): Promise<void> => {
    const db: Db = await MongoDbUtils.connect('bountyboard');
	const dbCustomers = db.collection('customers');

	const dbCustomerResult: CustomerCollection = await dbCustomers.findOne({
		customerId: commandContext.guildID
	});

    const guildMember: GuildMember = await DiscordUtils.getGuildMemberFromUserId(commandContext.user.id, commandContext.guildID)

    if (!DiscordUtils.isAllowListedRole(guildMember, dbCustomerResult.allowlistedRoles)) {
        throw new AuthorizationError(`Thank you for giving bounty commands a try!\n` +
                                `It looks like you don't have permission to use this command.\n` +
                                `If you think this is an error, please reach out to a server admin for help.`);
    }
}

const publish = async (commandContext: CommandContext): Promise<void> => {
    const db: Db = await MongoDbUtils.connect('bountyboard');
    const dbCollectionBounties = db.collection('bounties');
    const dbBountyResult: BountyCollection = await dbCollectionBounties.findOne({
        _id: new mongo.ObjectId(commandContext.options.publish['bounty-id']),
    });

    if (commandContext.user.id !== dbBountyResult.createdBy.discordId) {
        throw new AuthorizationError(`Thank you for giving bounty commands a try!\n` +
        `It looks like you don't have permission to publish this bounty.\n` +
        `If you think this is an error, please reach out to a server admin for help.`);
    }
}

export default AuthModule;