import ValidationError from '../errors/ValidationError';
import Log, { LogUtils } from './Log';
import DiscordUtils from '../utils/DiscordUtils'
const BountyUtils = {

validateDescription(description: string): void {
    const CREATE_SUMMARY_REGEX = /^[\w\s\W]{1,4000}$/;
    if (description == null || !CREATE_SUMMARY_REGEX.test(description)) {
        throw new ValidationError(
            'Please enter a valid summary: \n' +
            '- 4000 characters maximum\n ' +
            '- alphanumeric\n ' +
            '- special characters: .!@#$%&,?');
    }
},

validateCriteria(criteria: string): void {
    const CREATE_CRITERIA_REGEX = /^[\w\s\W]{1,1000}$/;
    if (criteria == null || !CREATE_CRITERIA_REGEX.test(criteria)) {
        throw new ValidationError(
            'Please enter a valid criteria: \n' +
            '- 1000 characters maximum\n ' +
            '- alphanumeric\n ' +
            '- special characters: .!@#$%&,?'
        );
    }
},

validateDate(date: string): Date {
    try {
        return new Date(date + 'T00:00:00.000Z');
    } catch (e) {
        LogUtils.logError('failed to validate date', e);
        throw new ValidationError('Please try `UTC` date in format yyyy-mm-dd, i.e 2021-08-15');
    }
},

validateTitle(title: string): void {
    const CREATE_TITLE_REGEX = /^[\w\s\W]{1,80}$/;
    if (title == null || !CREATE_TITLE_REGEX.test(title)) {
        throw new ValidationError( 
            'Please enter a valid title: \n' +
            '- 80 characters maximum\n ' +
            '- alphanumeric\n ' +
            '- special characters: .!@#$%&,?',
        );
    }
},

validateCopies(copies: number): void {
    if (copies > 100 || copies < 1) {
        throw new ValidationError('Copies must be between `1` and `100`. If you have any questions, please reach out to your favorite Bounty Board representative!');
    }
},

validateReward(rewardInput: string): void {
    const [stringAmount, symbol] = (rewardInput != null) ? rewardInput.split(' ') : [null, null];
    const ALLOWED_CURRENCIES = ['BANK', 'ETH', 'BTC', 'USDC', 'USDT', 'TempCity', 'gOHM', 'LUSD', 'FOX', 'oneFOX'];
    const isValidCurrency = (typeof symbol !== 'undefined') && (ALLOWED_CURRENCIES.find(element => {
        return element.toLowerCase() === symbol.toLowerCase();
    }) !== undefined);
    const MAXIMUM_REWARD = 100000000.00;

    if (!isValidCurrency) {
        throw new ValidationError(
            '- Specify a valid currency. The accepted currencies are:\n' +
            `${ALLOWED_CURRENCIES.toString()}\n` +
            'Please reach out to your favorite Bounty Board representative to expand this list!',
        );
    }
    
    const amount: number = Number(stringAmount);
    if (Number.isNaN(amount) || !Number.isFinite(amount) || amount < 0 || amount > MAXIMUM_REWARD) {
        throw new ValidationError(
            'Please enter a valid decimal reward value: \n ' +
            '- 0 minimum, 100 million maximum \n ' +
            'Please reach out to your favorite Bounty Board representative to expand this range!',
        );
    }
},

async validateGate(gate: string, guildId: string): Promise<void> {
    try {
        await DiscordUtils.getRoleFromRoleId(gate, guildId);
    }
    catch (e) {
        Log.info(`Gate ${gate} is not a Role`);
        throw new ValidationError('Please gate this bounty to a role.');
    }
},

threeMonthsFromNow(): Date {
    let ts: number = Date.now();
    const date: Date = new Date(ts);
    return new Date(date.setMonth(date.getMonth()+3));
},

formatDisplayDate(dateIso: string): string {
    const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    };
    return (new Date(dateIso)).toLocaleString('en-US', options);
},

}

export default BountyUtils;