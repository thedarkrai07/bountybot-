import {
	CommandContext,
	CommandOptionType,
	SlashCommand,
	SlashCreator,
} from 'slash-create';
import AuthModule from '../../auth/commandAuth';
import ValidationModule from '../../validation/commandValidation';
import BountyActivityHandler from '../../activity/bounty/ActivityHandler';
import ValidationError from '../../errors/ValidationError';
import { LogUtils } from '../../utils/Log';


export default class Bounty extends SlashCommand {
	constructor(creator: SlashCreator) {
		super(creator, {
			name: 'bounty',
			description: 'List, create, claim, delete, and mark bounties complete',
			//TODO: make this dynamic?
			guildIDs: ['905250069463326740'],
			options: [
                {
					name: 'create',
					type: CommandOptionType.SUB_COMMAND,
					description: 'Create a new draft of a bounty and finalize on the website',
					options: [
						{
							name: 'title',
							type: CommandOptionType.STRING,
							description: 'What should the bounty be called?',
							required: true,
						},
						{
							name: 'reward',
							type: CommandOptionType.STRING,
							description: 'What is the reward? (i.e 100 BANK)',
							required: true,
						},
						{
							name: 'copies',
							type: CommandOptionType.INTEGER,
							description: 'How many bounties should be published? (level 3+, max 100)',
							required: false,
						},
						{
							name: 'gate',
							type: CommandOptionType.ROLE,
							description: 'Select a role that will have permissions to claim this bounty',
							required: false,
						},
					],
				},
                {
					name: 'publish',
					type: CommandOptionType.SUB_COMMAND,
					description: 'Validate discord handle drafted bounty from the website',
					options: [
						{
							name: 'bounty-id',
							type: CommandOptionType.STRING,
							description: 'Bounty hash ID',
							required: true,
						},
					],
				},
				{
					name: 'claim',
					type: CommandOptionType.SUB_COMMAND,
					description: 'Claim a bounty to work on',
					options: [
						{
							name: 'bounty-id',
							type: CommandOptionType.STRING,
							description: 'Hash ID of the bounty',
							required: true,
						},
					],
				},
                {
					name: 'submit',
					type: CommandOptionType.SUB_COMMAND,
					description: 'Submit the bounty that you are working on. Bounty will be reviewed',
					options: [
						{
							name: 'bounty-id',
							type: CommandOptionType.STRING,
							description: 'Hash ID of the bounty',
							required: true,
						},
						{
							name: 'url',
							type: CommandOptionType.STRING,
							description: 'Url of work',
							required: false,
						},
						{
							name: 'notes',
							type: CommandOptionType.STRING,
							description: 'any additional notes for bounty completion',
							required: false,
						},
					],
				},
				{
					name: 'complete',
					type: CommandOptionType.SUB_COMMAND,
					description: 'Mark bounty as complete and reward the claimer',
					options: [
						{
							name: 'bounty-id',
							type: CommandOptionType.STRING,
							description: 'Hash ID of the bounty',
							required: true,
						},
					],
				},
				{
					name: 'list',
					type: CommandOptionType.SUB_COMMAND,
					description: 'View list of bounties you created or are claimed',
					options: [
						{
							name: 'list-type',
							type: CommandOptionType.STRING,
							description: 'Which bounties should be displayed?',
							choices: [
								{
									name: 'created by me',
									value: 'CREATED_BY_ME',
								},
								{
									name: 'claimed by me',
									value: 'CLAIMED_BY_ME',
								},
								{
									name: 'drafted by me',
									value: 'DRAFTED_BY_ME',
								},
                                {
									name: 'claimed by me and completed',
									value: 'CLAIMED_BY_ME_AND_COMPLETE',
								},
								{
									name: 'open',
									value: 'OPEN',
								},
								{
									name: 'in progress',
									value: 'IN_PROGRESS',
								},
							],
							required: true,
						},
					],
				},
				{
					name: 'delete',
					type: CommandOptionType.SUB_COMMAND,
					description: 'Delete an open or in draft bounty',
					options: [
						{
							name: 'bounty-id',
							type: CommandOptionType.STRING,
							description: 'Hash ID of the bounty',
							required: true,
						},
					],
				},
                {
					name: 'gm',
					type: CommandOptionType.SUB_COMMAND,
					description: 'GM GM GM GM',
				},
                {
					name: 'help',
					type: CommandOptionType.SUB_COMMAND,
					description: 'FAQ for using bounty commands',
				},
			],
			throttling: {
				usages: 2,
				duration: 1,
			},
			defaultPermission: true,
		});
	}

	async run(commandContext: CommandContext): Promise<any> {
        // TODO: migrate to adding handlers to array
            // core-logic of any Activity:
            // Auth check
            // validate/sanitize user input
            // Parse user input into database/api call
            // API response --> user success handling or user failure handling
        
        try {
            await ValidationModule.isValidCommand(commandContext);
        
            await AuthModule.isAuth(commandContext);

            await BountyActivityHandler.run(commandContext);
        }
        catch(e) {
			if (e instanceof ValidationError) {
				return commandContext.send(`<@${commandContext.user.id}>\n` + e.message);
			} else {
				LogUtils.logError('error', e);
				return commandContext.send('Sorry something is not working and our devs are looking into it.');
			}
		}
        
	}
}