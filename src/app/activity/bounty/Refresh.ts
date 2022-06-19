import mongo, { Db } from 'mongodb';
import { RefreshRequest } from '../../requests/RefreshRequest';
import { BountyCollection } from '../../types/bounty/BountyCollection';
import { CustomerCollection } from '../../types/bounty/CustomerCollection';
import BountyUtils from '../../utils/BountyUtils';
import Log from '../../utils/Log';
import MongoDbUtils from '../../utils/MongoDbUtils';

export const refreshBounty = async (request: RefreshRequest): Promise<any> => {
    Log.debug('In Refresh activity');
    let getDbResult: { dbBountyResult: BountyCollection, bountyChannel: string } = await getDbHandler(request);
    await BountyUtils.canonicalCard(getDbResult.dbBountyResult._id, request.activity);
    return;
};

const getDbHandler = async (request: RefreshRequest): Promise<{ dbBountyResult: BountyCollection, bountyChannel: string }> => {
    const db: Db = await MongoDbUtils.connect('bountyboard');
    const bountyCollection = db.collection('bounties');
    const customerCollection = db.collection('customers');

    const dbBountyResult: BountyCollection = await bountyCollection.findOne({
        _id: new mongo.ObjectId(request.bountyId)
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

