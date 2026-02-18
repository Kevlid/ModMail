export class CustomError extends Error {
    public type: string;
    [key: string]: unknown;

    constructor(error: { type: string; message: string; [key: string]: unknown }) {
        super(error.message);
        for (const key in error) {
            if (error.hasOwnProperty(key) && key !== "message") {
                this[key] = error[key];
            }
        }
    }
}