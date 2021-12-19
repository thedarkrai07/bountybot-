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
                CreateBounty(commandContext)
                break;
            case 'publish':
                PublishBounty(commandContext)
                break;
            case 'claim':
                ClaimBounty(commandContext)
                break;
            case 'submit':
                SubmitBounty(commandContext)
                break;
            case 'complete':
                CompleteBounty(commandContext)
                break;
            case 'list':
                ListBounty(commandContext)
                break;
            case 'delete':
                DeleteBounty(commandContext)
                break;
            case 'help':
                HelpBounty(commandContext)
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