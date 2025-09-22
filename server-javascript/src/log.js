// Simple log function with some flags

const DEBUG_FLAGS = {
    'GENERIC': true, // This flag is used to log events that don't fit in any categories 
};

/**
 * Function used to log messages. Adds fancy colors to the terminal
 * @param {string} msg The message to log to the console
 * @param {string} module The name of the module that the log comes from
 * @param {string} flag The identifier used to differentiate between logs
 */
export function log(msg, module, flag = 'GENERIC') {
    // All flags should be upper case
    flag = flag.toUpperCase();

    if (flag === 'GENERIC')
        console.log(`\x1b[1m${module}\x1b[0m: ${msg}`);
    else 
        if (flag in DEBUG_FLAGS)
            console.log(`\x1b[1m${module}\x1b[0m: \x1b[3m${flag}\x1b[0m ${msg}`);
}