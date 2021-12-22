import ValidationError from '../errors/ValidationError';
import { LogUtils } from './Log';
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