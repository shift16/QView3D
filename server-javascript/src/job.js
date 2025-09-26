'use strict';
/**
 * Class used to hold G-code to be sent to a 3D printer
 */
export class Job {
    #gcodeScriptIndex;
    #gcodeScript;
    name;

    /**
     * Creates a new job from a G-code script
     * @param {string} name Identifier used to differentiate between jobs
     * @param {string[]} gcodeScript Each command from the G-code script @todo Might update this property
     */
    constructor(name, gcodeScript) {
        if (!(gcodeScript instanceof Array))
            throw new TypeError(`GCode scripts are expected to be arrays`);

        this.#gcodeScript = gcodeScript;
        this.#gcodeScriptIndex = 0;
        this.name = name;
    }
    
    /**
     * Returns the next G-code command from the G-code script
     * If this Job has no more G-code commands to send, then an error will be thrown
     * @returns string
     */
    nextGCodeCommand() {
        const nextCommand = this.#gcodeScript[this.#gcodeScriptIndex];

        if (nextCommand === undefined)
            throw new Error(`The job "${this.name}" has no more G-code commands to send`);

        this.#gcodeScriptIndex++;
        return nextCommand;
    }

    isComplete() {
        return this.#gcodeScript[this.#gcodeScriptIndex] === undefined;
    }

    /**
     * Restarts the current job
     * @returns {void}
     */
    restart() {
        this.#gcodeScriptIndex = 0;
    }
}
