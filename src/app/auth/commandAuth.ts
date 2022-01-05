import mongo, { Db } from 'mongodb';
import MongoDbUtils from '../utils/MongoDbUtils';
import { CustomerCollection } from '../types/bounty/CustomerCollection';
import { BountyCollection } from '../types/bounty/BountyCollection';
import AuthorizationError from '../errors/AuthorizationError';
import DiscordUtils from '../utils/DiscordUtils';
import { GuildMember } from 'discord.js';
import { Activities } from '../constants/activities';
import { PublishRequest } from '../requests/PublishRequest';
import { CreateRequest } from '../requests/CreateRequest';
import Log from '../utils/Log';

const AuthorizationModule = {
    /**
     * Routes requests to the correct authorization functions.
     * Note: Authentication is handled natively by discord.
     * @param request 
     * @returns an empty Promise for upstream error handling and async calls
     * @throws AuthorizationError
     */
    async run(request: any): Promise<void> {
        Log.debug('Reached Authorization Handler')
        // TODO: how to type check request.bot?
        if (request.bot) {
            throw new AuthorizationError('Bots are unauthorized to work directly with bounties.')
        };

        // TODO: how to type check request.activity?
        switch (request.activity) {
            case Activities.create:
                return create(request as CreateRequest);
            case Activities.publish:
                return publish(request as PublishRequest);
            case Activities.claim:
                return;
            case Activities.submit:
                return;
            case Activities.complete:
                return;
            case Activities.list:
                return;
            case Activities.delete:
                return;
            case Activities.help:
                return;
			case 'gm':
                return;
        }
    },
};

const create = async (request: CreateRequest): Promise<void> => {
    const db: Db = await MongoDbUtils.connect('bountyboard');
	const dbCustomers = db.collection('customers');

	const dbCustomerResult: CustomerCollection = await dbCustomers.findOne({
		customerId: request.guildId
	});

    const guildMember: GuildMember = await DiscordUtils.getGuildMemberFromUserId(request.userId, request.guildId);

    if (!DiscordUtils.isAllowListedRole(guildMember, dbCustomerResult.allowlistedRoles)) {
        throw new AuthorizationError(`Thank you for giving bounty commands a try!\n` +
                                `It looks like you don't have permission to use this command.\n` +
                                `If you think this is an error, please reach out to a server admin for help.`);
    }
}

const publish = async (request: PublishRequest): Promise<void> => {
    const db: Db = await MongoDbUtils.connect('bountyboard');
    const dbCollectionBounties = db.collection('bounties');
    const dbBountyResult: BountyCollection = await dbCollectionBounties.findOne({
        _id: new mongo.ObjectId(request.bountyId),
    });

    if (request.userId !== dbBountyResult.createdBy.discordId) {
        throw new AuthorizationError(`Thank you for giving bounty commands a try!\n` +
        `It looks like you don't have permission to publish this bounty.\n` +
        `If you think this is an error, please reach out to a server admin for help.`);
    }
}

// TODO: for claim, use:
/**
 * The creator of this bounty gated it to specific role holders. Check the "gated to" section to see which role you would need to claim it.
 */

export default AuthorizationModule;