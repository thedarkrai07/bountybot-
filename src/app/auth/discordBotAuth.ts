import { CommandContext } from 'slash-create'

const AuthModule = {
    async isAuth(comandContext: CommandContext): Promise<boolean> {
        return true;
    },
};

export default AuthModule;