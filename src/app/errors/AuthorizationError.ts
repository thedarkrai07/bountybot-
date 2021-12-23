export default class AuthorizationError extends Error {

	constructor(message: string) {
		super(message);

		Object.setPrototypeOf(this, AuthorizationError.prototype);
	}
}
