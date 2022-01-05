import { User, Message} from 'discord.js'

export interface MessageReactionRequest {
    user: User,
    message: Message
}