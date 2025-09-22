// Simple log function with some flags

// A list of debug flags (All flags follow screaming snake case https://en.wikipedia.org/wiki/Snake_case)
/** @type {Object.<string, boolean>} */
const DEBUG_FLAGS = {
    // Logs events that don't fit in any categories
    'GENERIC': true,
    // Logs events where the output buffer still has content after a job has completed
    'NON_EMPTY_OUTPUT_BUFFER_ON_JOB_COMPLETE': true,
};

// Ansi Codes used to add rich text effects to your terminal
const bold = '\x1b[1m';
const italic = '\x1b[3m';
const endEffect = '\x1b[0m';
/**
 * Function used to log messages. Adds rich text effects to the terminal
 * @param {string} msg The message to log to the console
 * @param {string} module The name of the module that the log comes from
 * @param {string} flag The identifier used to differentiate between logs
 */
export function log(msg, module, flag = 'GENERIC') {
    // All flags should be upper case
    flag = flag.toUpperCase();

    if (flag === 'GENERIC') {
        console.log(`${italic + module + endEffect}: ${msg}`);

    } else {
        if (flag in DEBUG_FLAGS) {
            if (DEBUG_FLAGS[flag] === true) {
                console.log(`${italic + module + endEffect}: ${bold + flag + endEffect} ${msg}`);
            }
        } else {
            throw new Error(`${flag} is not a valid flag`);
        }
    }
}