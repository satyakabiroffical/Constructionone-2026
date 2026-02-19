/**
 * Standard API Response Format
 * Written by Pradeep
 */
class ApiResponse {
    constructor(statusCode, data, message = "Success", meta = null) {
        // Standard production-level response format
        this.success = statusCode < 400;
        this.statusCode = statusCode;
        this.message = message;
        this.data = data;

        // Add metadata/pagination if provided
        if (meta) {
            this.meta = meta;
        }

        // Add timestamp for production tracking
        this.timestamp = new Date().toISOString();
    }
}

export { ApiResponse };
