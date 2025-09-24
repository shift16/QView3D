'use strict';

// Simple log function with some flags

/** All flags follow {@link https://en.wikipedia.org/wiki/Snake_case screaming snake case} */
const DEBUG_FLAGS = {
    // Logs events that don't fit in any categories
    'GENERIC': true,
    // Logs events where the output buffer still has content after a job has completed
    'NON_EMPTY_OUTPUT_BUFFER_ON_JOB_COMPLETE': true,
    // Logs when a job is started
    'PRINTER_JOB_STARTED': true,
    // Logs when a job is completed
    'PRINTER_JOB_COMPLETED': true,
};

// Ansi Codes used to add rich text effects to your terminal
const bold = '\x1b[1m';
const italic = '\x1b[3m';
const endEffect = '\x1b[0m';
/**
 * Function used to log messages. Adds rich text effects to the terminal
 */
export function log(msg, filename, debugFlag = 'GENERIC') {
    // All flags should be upper case
    debugFlag = debugFlag.toUpperCase();

    if (debugFlag === 'GENERIC') {
        console.log(`${italic + filename + endEffect}: ${msg}`);

    } else {
        if (debugFlag in DEBUG_FLAGS) {
            if (DEBUG_FLAGS[debugFlag] === true) {
                console.log(`${italic + filename + endEffect}: ${bold + debugFlag + endEffect} ${msg}`);
            }
        } else {
            throw new Error(`${debugFlag} is not a valid debugFlag`);
        }
    }
}
