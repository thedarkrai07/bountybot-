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
import Log, { LogUtils } from '../../utils/Log';

import ValidationError from '../../errors/ValidationError';
import RuntimeError from '../../errors/RuntimeError';

const BountyActivityHandler = {
    async run(commandContext: CommandContext): Promise<any> {
        if (commandContext.user.bot) return;

        let command: Promise<any>;

        Log.debug('Reached Activity Handler')
        try {
        switch (commandContext.subcommands[0]) {
            case 'create':
                command = CreateBounty(commandContext);
                break;
            case 'publish':
                command = PublishBounty(commandContext);
                break;
            case 'claim':
                command = ClaimBounty(commandContext);;
                break;
            case 'submit':
                command = SubmitBounty(commandContext);
                break;
            case 'complete':
                command = CompleteBounty(commandContext);
                break;
            case 'list':
                command = ListBounty(commandContext);
                break;
            case 'delete':
                command = DeleteBounty(commandContext);
                break;
            case 'help':
                command = HelpBounty(commandContext);
                break;
			case 'gm':
                const { guildMember } = await BountyActivityHandler.getGuildAndMember(commandContext);
                await commandContext.send({ content: `gm <@${guildMember.id}>!` })
                break;
        }
        return BountyActivityHandler.after(commandContext, command);
    } catch (e) {
        Log.error(e)
    }
    },

    after(commandContext: CommandContext, command: Promise<any>): void {
		command.then(() => {
			return commandContext.initiallyResponded ? null : commandContext.send(`${commandContext.user.mention} Sent you a DM with information.`);
		}).catch(e => {
			if (e instanceof ValidationError) {
                Log.info(e.message);
				throw new ValidationError(e.message);
			} else {
				LogUtils.logError('error', e);
				commandContext.send('You really banged this up this time didn\'t you behold');
			}
		});
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