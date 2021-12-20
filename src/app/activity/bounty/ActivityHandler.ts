import { CommandContext } from 'slash-create'
import CreateBounty from './Create'
import PublishBounty from './Publish'
import ClaimBounty from './Claim'
import SubmitBounty from './Submit'
import CompleteBounty from './Complete'
import ListBounty from './List'
import DeleteBounty from './Delete'
import HelpBounty from './Help'

import { Guild, GuildMember } from 'discord.js';
import client from '../../app';


const BountyActivityHandler = {
    async run(commandContext: CommandContext): Promise<any> {
        switch (commandContext.subcommands[0]) {
            case 'create':
                await CreateBounty(commandContext);
                break;
            case 'publish':
                await PublishBounty(commandContext);
                break;
            case 'claim':
                await ClaimBounty(commandContext);;
                break;
            case 'submit':
                await SubmitBounty(commandContext);
                break;
            case 'complete':
                await CompleteBounty(commandContext);
                break;
            case 'list':
                await ListBounty(commandContext);
                break;
            case 'delete':
                await DeleteBounty(commandContext);
                break;
            case 'help':
                await HelpBounty(commandContext);
                break;
			case 'gm':
                const { guildMember } = await BountyActivityHandler.getGuildAndMember(commandContext);
                await commandContext.send({ content: `gm <@${guildMember.id}>!` })
                break;
        }
    },

    async getGuildAndMember(ctx: CommandContext): Promise<{ guild: Guild, guildMember: GuildMember }> {
		const guild = await client.guilds.fetch(ctx.guildID);
		return {
			guild: guild,
			guildMember: await guild.members.fetch(ctx.user.id),
		};
	}
}

export default BountyActivityHandler;