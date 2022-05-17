import mongo, { Db } from "mongodb";
import { Request } from "../requests/Request";
import { BountyCollection } from "../types/bounty/BountyCollection";
import DiscordUtils from "./DiscordUtils";
import MongoDbUtils from "./MongoDbUtils";

const ErrorUtils = {
    sendToDefaultChannel : async (message: string, request: any) => {
        const db: Db = await MongoDbUtils.connect('bountyboard');
        const bountyCollection = db.collection('bounties');
        const user = await DiscordUtils.getGuildMemberFromUserId(request.userId, request.guildId);
        const bounty: BountyCollection = await bountyCollection.findOne({
            _id: new mongo.ObjectId(request.bountyId)
        });
        const bountyChannel = await DiscordUtils.getBountyChannelfromCustomerId(bounty.customerId);

        await bountyChannel.send({
            embeds: [{
                title: 'Bounty Notification',
                fields: [{
                    name: 'For User',
                    value: `<@${user.id}>`,
                }, {
                    name: 'Message',
                    value: message,
                }]
            }]
        });
    }
}

export default ErrorUtils;