import { CommandContext } from 'slash-create'

const ValidationModule = {
    async isValidCommand(comandContext: CommandContext): Promise<boolean> {
        return true;
    },
};

export default ValidationModule;