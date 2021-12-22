export default class RuntimeError extends Error {

	constructor(error: Error) {
		super(error.message);

		Object.setPrototypeOf(this, RuntimeError.prototype);
	}
}