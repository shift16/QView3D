// The class/driver architecture is unnecessary because the behavior of every
// 3D printer flashed with Marlin's firmware should behave similarly
// The callback model seems better

import * as fs from 'node:fs';
import { Job } from './job.js';
// Valid baud rates for Marlin compatible 3D printers
const validBaudRates = [115200, 250000, 230400, 57600, 38400, 19200, 9600];
const PROTOCOL_CHARACTER_ENCODING = 'utf-8';

/**
 * Class used to communicate with {@link https://github.com/MarlinFirmware/Marlin Marlin firmware} compatible 3D printers
 */
export class Printer {
    static STATE_ONLINE = 1;
    static STATE_OFFLINE = 2;
    static STATE_PRINTING = 3;
    static STATE_CONNECTING = 4;
    static STATE_PAUSED = 5;
    static STATE_NOT_CONNECTED = 6;
    static STATE_ERROR = 7;

    // Private properties
    #state;
    #outputBuffer;
    #jobArr;
    #serialPort;

    /**
     * Creates a new printer object
     */
    constructor() {
        this.#state = Printer.STATE_NOT_CONNECTED;
        this.#outputBuffer = '';
        this.#jobArr = [];
        this.#serialPort = undefined;
    }

    /**
     * Function used to listen and process data coming from the connected 3D printer
     * @param {Buffer | string | any} output Chunk of data from the serial port
     */
    #portListener(output) {
        if (output instanceof Buffer)
            output.toString(PROTOCOL_CHARACTER_ENCODING);

        if (typeof output === 'string')
            this.#outputBuffer += output;
        else
            throw new Error(`Stream at port ${this.#serialPort?.path} is in object mode which is not supported.`);

        // Only strings with new lines should be processed
        for (const line of this.#outputBuffer.split('\n')) {
            
            // Handle progress update
            
            // When we receive an OK
            if (line.startsWith('ok') && line.length === 2) {
                // Send the next G-Code instruction in the current job
                /** @todo */
            }
    
            // Handle temperature change
        }
    }
    
    sendGCodeScript(gCodeScript) {
        throw new Error('Function not implemented');
    }

    onTempChange(callback) {
        throw new Error('Function not implemented');
    }

    onProgressUpdate(callback) {
        throw new Error('Function not implemented');
    }

    getCurrentJobProgress() {
        throw new Error('Function not implemented');
    }

    getCurrentJob() {
        throw new Error('Function not implemented');
    }

    getModelName() {
        throw new Error('Function not implemented');
    }

    getCurrentState() {
        return this.#state;
    }

}