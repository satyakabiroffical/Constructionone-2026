/**
 * Written by Pradeep
 */
class ApiResponse {
    constructor(statusCode, data, message = "Success", meta = null) {
        this.statusCode = statusCode;
        this.data = data;
        this.message = message;
        this.success = statusCode < 400;
        if (meta) {
            this.meta = meta;
        }
    }
}

export { ApiResponse };
