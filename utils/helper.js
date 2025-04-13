const fs = require('fs');
const path = require('path');
const { Logger } = require('./logger');

class Helper {
    /**
     * Get priority level for different types of operations
     * @param {string} type - Type of operation or context
     * @returns {number} Priority level
     */
    static getPriorityLevel(type) {
        const priorityMap = {
            'critical': 5,
            'high': 4,
            'medium': 3,
            'low': 2,
            'default': 1,
            'none': 0
        };

        // Normalize the input type
        const normalizedType = String(type).toLowerCase().trim();

        // Return the priority level, defaulting to 1 if not found
        return priorityMap[normalizedType] || priorityMap['default'];
    }

    /**
     * Read JSON configuration file
     * @param {string} filePath - Path to the JSON configuration file
     * @returns {Object} Parsed configuration object
     */
    static readConfig(filePath) {
        try {
            const resolvedPath = path.resolve(filePath);
            const rawData = fs.readFileSync(resolvedPath, 'utf8');
            return JSON.parse(rawData);
        } catch (error) {
            Logger.error(`Error reading config file ${filePath}:`, error);
            return {};
        }
    }

    /**
     * Generate a unique identifier
     * @param {string} prefix - Optional prefix for the identifier
     * @returns {string} Unique identifier
     */
    static generateId(prefix = '') {
        const timestamp = Date.now().toString(36);
        const randomStr = Math.random().toString(36).substr(2, 5);
        return `${prefix}${timestamp}-${randomStr}`;
    }

    /**
     * Deep clone an object
     * @param {Object} obj - Object to clone
     * @returns {Object} Cloned object
     */
    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }

        // Handle Date
        if (obj instanceof Date) {
            return new Date(obj.getTime());
        }

        // Handle Array
        if (Array.isArray(obj)) {
            return obj.map(item => this.deepClone(item));
        }

        // Handle Object
        const clonedObj = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                clonedObj[key] = this.deepClone(obj[key]);
            }
        }

        return clonedObj;
    }

    /**
     * Validate input against a set of rules
     * @param {*} input - Input to validate
     * @param {Object} rules - Validation rules
     * @returns {Object} Validation result
     */
    static validate(input, rules) {
        const errors = [];

        for (const [key, ruleSet] of Object.entries(rules)) {
            const value = input[key];

            // Required check
            if (ruleSet.required && (value === undefined || value === null)) {
                errors.push(`${key} is required`);
                continue;
            }

            // Type check
            if (ruleSet.type && typeof value !== ruleSet.type) {
                errors.push(`${key} must be of type ${ruleSet.type}`);
                continue;
            }

            // Custom validation
            if (ruleSet.validate && typeof ruleSet.validate === 'function') {
                const customValidation = ruleSet.validate(value);
                if (customValidation !== true) {
                    errors.push(customValidation || `${key} failed validation`);
                }
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

module.exports = Helper;