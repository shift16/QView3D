'use strict';

/**
 * Class used to hold G-code to be sent to a 3D printer
 */
export class Job {
    #gcodeScriptIndex;
    #gcodeScript;
    name;

    constructor(jobName, gcodeScript) {
        if (!(gcodeScript instanceof Array))
            throw new TypeError(`GCode scripts are expected to be arrays`);

        this.#gcodeScript = gcodeScript;
        this.#gcodeScriptIndex = 0;
        this.name = jobName;
    }
    
    /**
     * Returns the next G-code command in the G-code script as a string encoded using stringEncoding
     * Defaults to 'utf-8'
     * If this Job has no more G-code commands to send, then an error will be thrown
     */
    nextGCodeCommand(stringEncoding = 'utf-8') {
        const nextCommand = this.#gcodeScript[this.#gcodeScriptIndex];

        if (nextCommand === undefined)
            throw new Error(`The job "${this.name}" has no more G-code commands to send`);

        this.#gcodeScriptIndex++;
        
        return nextCommand.toString(stringEncoding);
    }

    isComplete() {
        return this.#gcodeScript[this.#gcodeScriptIndex] === undefined;
    }

    restart() {
        this.#gcodeScriptIndex = 0;
    }
}
