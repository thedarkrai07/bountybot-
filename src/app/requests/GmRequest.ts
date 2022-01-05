import { CommandContext } from 'slash-create';
import { Request } from "./Request";

export class GmRequest extends Request {
    commandContext: CommandContext;

    constructor(args: {
        commandContext: CommandContext;
    }) {
        super(args.commandContext.subcommands[0], args.commandContext.guildID, args.commandContext.user.id, args.commandContext.user.bot);
        this.commandContext = args.commandContext;
    }
}