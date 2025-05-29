/**
 * Logger Utility
 * 
 * Provides logging functionality for the application
 */

const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log file paths
const errorLogPath = path.join(logsDir, 'error.log');
const accessLogPath = path.join(logsDir, 'access.log');

// Log levels
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

// Set default log level to INFO
const currentLogLevel = LOG_LEVELS.INFO;

/**
 * Format message for logging
 * @param {string} level Log level
 * @param {string} message Log message
 * @returns {string} Formatted log message
 */
function formatMessage(level, message) {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level}] ${message}`;
}

/**
 * Write to log file
 * @param {string} filePath Log file path 
 * @param {string} message Message to log
 */
function writeToLog(filePath, message) {
  fs.appendFile(filePath, message + '\n', err => {
    if (err) {
      console.error('Error writing to log file:', err);
    }
  });
}

/**
 * Log debug message
 * @param {string} message Debug message
 */
function debug(message) {
  if (currentLogLevel <= LOG_LEVELS.DEBUG) {
    const formattedMessage = formatMessage('DEBUG', message);
    console.debug(formattedMessage);
    writeToLog(accessLogPath, formattedMessage);
  }
}

/**
 * Log info message
 * @param {string} message Info message
 */
function info(message) {
  if (currentLogLevel <= LOG_LEVELS.INFO) {
    const formattedMessage = formatMessage('INFO', message);
    console.info(formattedMessage);
    writeToLog(accessLogPath, formattedMessage);
  }
}

/**
 * Log warning message
 * @param {string} message Warning message
 */
function warn(message) {
  if (currentLogLevel <= LOG_LEVELS.WARN) {
    const formattedMessage = formatMessage('WARN', message);
    console.warn(formattedMessage);
    writeToLog(accessLogPath, formattedMessage);
  }
}

/**
 * Log error message
 * @param {string} message Error message
 * @param {Error} [error] Optional error object
 */
function error(message, error) {
  if (currentLogLevel <= LOG_LEVELS.ERROR) {
    let formattedMessage = formatMessage('ERROR', message);
    
    if (error) {
      formattedMessage += `\n${error.stack || error}`;
    }
    
    console.error(formattedMessage);
    writeToLog(errorLogPath, formattedMessage);
  }
}

module.exports = {
  debug,
  info,
  warn,
  error
}; 