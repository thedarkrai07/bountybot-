import { CommandContext } from 'slash-create';
import ValidationError from '../errors/ValidationError';
import BountyUtils from '../utils/BountyUtils';
import Log from '../utils/Log';
import mongo, { Db } from 'mongodb';
import MongoDbUtils from '../utils/MongoDbUtils';
import { BountyCollection } from '../types/bounty/BountyCollection';
import { Activities } from '../constants/activities';
import { ListRequest } from '../requests/ListRequest';
import { PublishRequest } from '../requests/PublishRequest';
import { CreateRequest } from '../requests/CreateRequest';

const ValidationModule = {
    /**
     * 
     * @param request 
     * @returns empty Promise for error handling or async calls
     */
    async run(request: any): Promise<void> {
        Log.debug('Reached Validation Handler')
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
                return list(request as ListRequest);
            case Activities.delete:
                return;
            case Activities.help:
                return;
			case 'gm':
                return;
            default:
                throw new ValidationError(`Command not recognized. Please try again.`);
        }
    },
};

export default ValidationModule;

const create = async (request: CreateRequest): Promise<void> => {
    BountyUtils.validateTitle(request.title);

    BountyUtils.validateReward(request.reward);

    BountyUtils.validateCopies(request.copies);

    await BountyUtils.validateGate(request.gate, request.guildId);
}

const publish = async (request: PublishRequest): Promise<void> => {
    
    await BountyUtils.validateBountyId(request.bountyId);

    const db: Db = await MongoDbUtils.connect('bountyboard');
    const dbCollectionBounties = db.collection('bounties');
    const dbBountyResult: BountyCollection = await dbCollectionBounties.findOne({
        _id: new mongo.ObjectId(request.bountyId),
    });

    if (!dbBountyResult) {
        throw new ValidationError('Please select a valid bounty id to publish. ' +
            'Check your previous DMs from bountybot for the correct id.')
    }

    if (dbBountyResult.status && dbBountyResult.status !== 'Draft') {
        throw new ValidationError(`The bounty id you have selected is in status ${dbBountyResult.status}\n` +
        `Currently, only bounties with status draft can be published to the bounty channel.\n` +
        `Please reach out to your favorite Bounty Board representative with any questions!`)
    }
}

const list = async (request: ListRequest): Promise<void> => {
    switch (request.listType) { 
    case 'CREATED_BY_ME':
        return;
	case 'CLAIMED_BY_ME':
		return;
    case 'CLAIMED_BY_ME_AND_COMPLETE':
        return;
	case 'DRAFTED_BY_ME':
		return;
	case 'OPEN':
		return;
	case 'IN_PROGRESS':
		return;
	default:
		Log.info('invalid list-type');
        throw new ValidationError('Please select a valid list-type from the command menu');
	}
}