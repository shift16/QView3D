// The class/driver architecture is unnecessary because the behavior of every
// 3D printer flashed with Marlin's firmware should behave similarly
// The callback model seems better

import * as fs from 'node:fs';
// Valid baud rates for Marlin compatible 3D printers
const validBaudRates = [115200, 250000, 230400, 57600, 38400, 19200, 9600];

/**
 * Class used to communicate with {@link https://github.com/MarlinFirmware/Marlin Marlin firmware} compatible 3D printers
 */
export class Printer {
    static STATE_ONLINE = 1
    static STATE_OFFLINE = 2
    static STATE_PRINTING = 3
    static STATE_CONNECTING = 4
    static STATE_PAUSED = 5
    static STATE_NOT_CONNECTED = 6

    // Private properties
    #state;

    /**
     * Creates a new printer object
     */
    constructor() {
        this.#state = Printer.STATE_NOT_CONNECTED;

        
    }

    #serialPort;

    #portListener(byteChunk) {
        throw new Error('Function not implemented');
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

    getCurrentJob() {
        throw new Error('Function not implemented');
    }

    getModelName() {
        throw new Error('Function not implemented');
    }

    getCurrentState() {
        throw new Error('Function not implemented');
    }

}