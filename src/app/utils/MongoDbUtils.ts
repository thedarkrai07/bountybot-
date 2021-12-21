import { Db, MongoClient, MongoClientOptions } from 'mongodb';
import Log from './Log';

const MongoDbUtils = {
	state: {
		dbMap: new Map<string, Db>(),
		clientMap: new Map<string, MongoClient>(),
	},

	connect: async (database: string): Promise<Db> => {
		let db: Db | undefined = MongoDbUtils.state.dbMap.get(database);
		if (db == null) {
			Log.debug(`Connecting to ${database} for first time!`);
			const options: MongoClientOptions = {
				writeConcern: {
					w: 'majority',
				},
				useNewUrlParser: true,
				useUnifiedTopology: true,
			};
            // TODO: add to constants file
			Log.debug(`Connection URI: ${process.env.MONGODB_URI + 'bountyboard'}`);
			const mongoClient = await MongoClient.connect(process.env.MONGODB_URI);
			MongoDbUtils.state.clientMap.set(database, mongoClient);
			MongoDbUtils.state.dbMap.set(database, mongoClient.db(database));
			db = mongoClient.db();
		}
		return db;
	},

};

export default MongoDbUtils;