'use strict';
// The class/driver architecture is unnecessary because the behavior of every
// 3D printer flashed with Marlin's firmware should behave similarly
// The callback model seems better

import * as fs from 'node:fs';
import { SerialPort } from 'serialport';
import { Job } from './job.js';
import { log } from './log.js';

// Character encoding used in Marlin compatible 3D printers
const PROTOCOL_CHARACTER_ENCODING = 'utf-8';

export class PrinterError extends Error {};

/**
 * Class used to communicate with {@link https://github.com/MarlinFirmware/Marlin Marlin firmware} compatible 3D printers
 */
export class Printer {
    static NOT_CONNECTED = 0;
    static READY = 1;
    static PRINTING = 2;
    static CONNECTING = 3;
    static PAUSED = 4;
    static ERROR = 5;

    // Private properties
    #state;
    #serialOutputBuffer;
    #currentJob;
    #serialPort;

    /**
     * Creates a new printer object
     */
    constructor() {
        this.#state = Printer.NOT_CONNECTED;
        this.#serialOutputBuffer = '';
        this.#serialPort = undefined;
        this.#currentJob = undefined;
    }

    /**
     * Function used to listen and process data coming from the connected 3D printer
     * @param {Buffer | string | any} serialOutput Chunk of data from the serial port
     */
    #portListener(serialOutput) {
        if (serialOutput instanceof Buffer)
            serialOutput.toString(PROTOCOL_CHARACTER_ENCODING);

        if (typeof serialOutput === 'string')
            this.#serialOutputBuffer += serialOutput;
        else
            throw new Error(`Stream at port "${this.#serialPort?.path}" is in object mode which is not supported`);

        // Only strings with new lines should be processed
        const outputLines = this.#serialOutputBuffer.split('\n');
        // The last line doesn't have a new line (hence the outputLines.length - 1)
        for (let i = 0; i < outputLines.length - 1; i++) {
            const currentLine = outputLines[i];
            //## Handle progress update
            
            //## When we receive an OK
            if (currentLine.startsWith('ok') && currentLine.length === 2) {
                // Send the next G-Code command if the printer is PRINTING or READY
                if (this.#state === Printer.READY || this.#state === Printer.PRINTING) {
                    const cJob = this.#currentJob;

                    if (cJob instanceof Job) {
                        if (cJob.notComplete()) {
                            // More G-code to send
                            const nextCommand = cJob.nextGCodeCommand();

                            /** @todo Figure out the errors that can occur. Maybe use .isOpen to determine if the port is still open? */
                            try {
                                this.#serialPort.write(nextCommand, PROTOCOL_CHARACTER_ENCODING);
                            } catch (err) {
                                throw new PrinterError(`Failed to send a command to the 3D printer at port "${this.#serialPort.path}"`, { cause: err });
                            }
                        } else {
                            // No more G-code to send
                            this.#state = Printer.READY;

                            if (this.#serialOutputBuffer.length !== 0) {
                                log(
                                    `The 3D printer at port "${this.#serialPort?.path}" had the content "${this.#serialOutputBuffer}" in its buffer`,
                                    'printer.js',
                                    'NON_EMPTY_OUTPUT_BUFFER_ON_JOB_COMPLETE'
                                );
                            }
                            // Clear the buffer
                            this.#serialOutputBuffer = '';
                        }
                    }
                }
            }
    
            //## Handle temperature change
        }
    }
    
    /**
     * Sets the serial port to communicate with
     * If the printer is printing, this will error
     * @param {string} path The path to the serial port (e.g. /dev/ttyACM0 on Linux or COM1 on Windows)
     * @param {number} baudRate The baud rate of the serial port
     */
    setSerialPort(path, baudRate) {
        if (this.#serialPort instanceof SerialPort) {
            if (this.#state === Printer.PRINTING)
                throw new PrinterError(`Cannot set serial port because the printer at port "${this.#serialPort.path}" is currently printing`);

            this.#serialPort.close();
        }
        
        this.#state = Printer.CONNECTING;

        this.#serialPort = new SerialPort({ path: path, baudRate: baudRate}, _ => {
            /** I believe this function is called when the SerialPort class has connected to the serial port @todo Double check */
            this.#state = Printer.READY;
        });
    }
    
    startJob(job) {
        if (!(job instanceof Job))
            throw new TypeError(`When starting a job, you need to use a job object "${typeof job}"`);


        
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

    setCurrentState(newState) {
        
    }

}