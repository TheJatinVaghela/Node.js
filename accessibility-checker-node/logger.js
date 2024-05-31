const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf } = format;

// Define your custom format
const customFormat = printf(({ level, message, timestamp }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${message}`;
});

const logger = createLogger({
    format: combine(
        timestamp(),
        customFormat
    ),
    transports: [
        new transports.Console(), // Log to console
        new transports.File({ filename: `combined.log` }) // Log to file
    ]
});

module.exports = logger;
