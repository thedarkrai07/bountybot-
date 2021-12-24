import { CommandContext } from 'slash-create';
import ValidationError from '../errors/ValidationError';
import BountyUtils from '../utils/BountyUtils';
import Log from '../utils/Log';
import mongo, { Db } from 'mongodb';
import MongoDbUtils from '../utils/MongoDbUtils';
import { BountyCollection } from '../types/BountyCollection';

const ValidationModule = {
    async isValidCommand(commandContext: CommandContext): Promise<void> {
        switch (commandContext.subcommands[0]) {
            case 'create':
                return create(commandContext);
            case 'publish':
                return publish(commandContext);
            case 'claim':
                return;
            case 'submit':
                return;
            case 'complete':
                return;
            case 'list':
                return list(commandContext);
            case 'delete':
                return;
            case 'help':
                return;
			case 'gm':
                return;
            default:
                throw new ValidationError(`${commandContext.user.mention} Command not recognized. Please try again.`);
        }
    },
};

export default ValidationModule;

const create = async (commandContext: CommandContext): Promise<void> => {
    const ctxOptions: { [key: string]: any } = commandContext.options.create;
    
    BountyUtils.validateTitle(ctxOptions.title);

    BountyUtils.validateReward(ctxOptions.reward);

    BountyUtils.validateCopies(ctxOptions.copies);

    await BountyUtils.validateGate(ctxOptions.gate, commandContext.guildID);
}

const publish = async (commandContext: CommandContext): Promise<void> => {
    const ctxOptions: { [key: string]: any } = commandContext.options.publish;
    
    await BountyUtils.validateBountyId(ctxOptions['bounty-id']);

    const db: Db = await MongoDbUtils.connect('bountyboard');
    const dbCollectionBounties = db.collection('bounties');
    const dbBountyResult: BountyCollection = await dbCollectionBounties.findOne({
        _id: new mongo.ObjectId(commandContext.options.publish['bounty-id']),
    });

    if (!dbBountyResult) {
        throw new ValidationError('Please select a valid bounty id to publish. ' +
            'Check your previous DMs from bountybot for the correct id.')
    }

    if (dbBountyResult.status && dbBountyResult.status !== 'Draft') {
        throw new ValidationError(`The bounty id you have selected is in status ${dbBountyResult.status}\n` +
        `Check your previous DMs from bountybot for the correct id to publish.`)
    }
}

const list = async (commandContext: CommandContext): Promise<void> => {
    switch (commandContext.options.list['list-type']) { 
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