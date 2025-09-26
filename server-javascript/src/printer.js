'use strict';

import * as fs from 'node:fs';
import { SerialPort } from 'serialport';
import { Job } from './job.js';
import { log } from './log.js';
import { EventEmitter } from 'node:events';

// Character encoding used in Marlin compatible 3D printers
const MARLIN_PROTOCOL_ENCODING = 'utf-8';

// Used to differentiate between ambiguous errors and errors thrown by printer operations
export class PrinterError extends Error {};

export const PrinterState = {
    NOT_CONNECTED: 0,
    READY: 1,
    PRINTING: 2,
    CONNECTING: 3,
    PAUSED: 4,
    ERROR: 5
};

const validBaudRates = [115200, 250000, 230400, 57600, 38400, 19200, 9600];

/**
 * Class used to communicate with {@link https://github.com/MarlinFirmware/Marlin Marlin firmware} compatible 3D printers
 */
export class Printer {
    #state;
    // Used to hold incomplete responses from the printer
    #dataBuffer;
    #currentJob;
    #serialPort;
    // Used to call any callback functions that are listening for events from this printer
    #eventEmitter;

    constructor() {
        this.#state = PrinterState.NOT_CONNECTED;
        this.#dataBuffer = '';
        this.#serialPort = undefined;
        this.#currentJob = undefined;
        this.#eventEmitter = new EventEmitter();
    }
    
    #sendGcodeCommand(gcodeCommand) {
        /** @todo Figure out the errors that can occur. Maybe use .isOpen to determine if the port is still open? */
        try {
            this.#serialPort.write(gcodeCommand, MARLIN_PROTOCOL_ENCODING);
        } catch (err) {
            throw new PrinterError(`Failed to send a command to the 3D printer at port "${this.#serialPort.path}"`, { cause: err });
        }
    }
    
    /** 
     * Function used to listen and process data coming from a connected 3D printer
     * Assumes to be a callback function to the {@link https://nodejs.org/docs/latest-v18.x/api/stream.html#event-data 'data'} event
     */
    #portListener(dataFromPort) {
        // Interpret the raw binary coming from the port as UTF-8 (or whatever MARLIN_PROTOCOL_ENCODING is) encoded strings
        if (dataFromPort instanceof Buffer)
            dataFromPort = dataFromPort.toString(MARLIN_PROTOCOL_ENCODING);
        
        // The response from the printer may not be complete so we must store the current response in a buffer
        // When we receive more data, we'll stitch the content together to create a complete response
        if (typeof dataFromPort === 'string')
            this.#dataBuffer += dataFromPort;
        else
            throw new Error(`Stream at port "${this.#serialPort?.path}" is in object mode which is not supported`);

        // Each complete response from the printer must be processed by the server
        // a complete response is UTF-8 (or whatever MARLIN_PROTOCOL_ENCODING is) encoded strings ending with a newline 
        // sometimes the printer will send multiple complete responses at once so we split each response by the newline
        const outputLines = this.#dataBuffer.split('\n');
        
        // But, the last line doesn't end with a newline so we won't process it (outputLines.length - 1)
        for (let i = 0; i < outputLines.length - 1; i++) {
            const currentLine = outputLines[i];
            //## Handle progress update
            /** @todo */
            
            //## When we receive an OK
            if (currentLine.startsWith('ok') && currentLine.length === 2) {
                // Send the next G-Code command if the printer is PRINTING or READY
                if (this.#state === PrinterState.READY || this.#state === PrinterState.PRINTING) {
                    const cJob = this.#currentJob;

                    if (cJob instanceof Job) {
                        if (!cJob.isComplete()) {
                            // More G-code to send
                            const nextCommand = cJob.nextGCodeCommand();
                            this.#sendGcodeCommand(nextCommand);
                        } else {
                            // No more G-code to send
                            log(
                                `Printer at port "${this.#serialPort?.path}" finished printing`,
                                'printer.js',
                                'PRINTER_JOB_COMPLETED'
                            );
                            this.#state = PrinterState.READY;

                            if (this.#dataBuffer.length !== 0) {
                                log(
                                    `The 3D printer at port "${this.#serialPort?.path}" had the content "${this.#dataBuffer}" in its buffer`,
                                    'printer.js',
                                    'NON_EMPTY_OUTPUT_BUFFER_ON_JOB_COMPLETE'
                                );
                            }
                            // Clear the buffer so the next job doesn't have garbage added to it
                            this.#dataBuffer = '';
                        }
                    }
                }
            }
    
            //## Handle temperature change
            /** @todo */
        }
        
        log(`${this.#serialPort?.path} ${this.#dataBuffer}`, 'printer.js', 'RESPONSE_FROM_PRINTER');
        
        // Because the last line is not a complete response, we'll store it in our buffer 
        // and concatenate it with the next response from the printer
        this.#dataBuffer = outputLines[outputLines.length - 1];
    }
    
    #closeListener(err) {
        throw new Error('Function not implemented');
    }
    
    /**
     * Sets the serial port to communicate with and baudRate to use. Baud rate defaults to 115200b/s
     * If the printer is printing or paused, this will throw a `PrinterError`
     */
    setSerialPort(serialPortLocation, baudRate = 115200) {
        if (!(validBaudRates.includes(baudRate)))
            throw new Error(`${baudRate} is not a valid or supported baud rate`);
            
        if (this.#serialPort instanceof SerialPort) {
            if (this.#state === PrinterState.PRINTING || this.#state === PrinterState.PAUSED)
                throw new PrinterError(`Cannot set serial port because the printer at port "${this.#serialPort.path}" is currently printing`);

            this.#serialPort.close();
        }
        
        this.#state = PrinterState.CONNECTING;

        this.#serialPort = new SerialPort({ path: serialPortLocation, baudRate: baudRate}, _ => {
            /** I believe this function is called when the SerialPort class has connected to the serial port @todo Double check */
            this.#state = PrinterState.READY;
        });
        
        this.#serialPort
            .on('data', this.#portListener.bind(this))
            .on('close', this.#closeListener.bind(this));
    }
    
    /**
     * Tells the printer to start the passed job
     * If the printer is printing or paused, this will throw a `PrinterError`
     */
    startJob(job) {
        if (!(job instanceof Job))
            throw new TypeError(`When starting a job, you need to use a job object and not a "${typeof job}"`);

        if (this.#state === PrinterState.READY) {
            this.#currentJob = job;
            

            log(
                `Job ${job.name} has started at printer "${this.#serialPort.path}"`, 
                'printer.js', 
                'PRINTER_JOB_STARTED'
            );
        } else {
            throw new PrinterError(`Printer at port "${this.#serialPort?.path}" is not done printing the current job. Therefore, it won't start another job`);
        }
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

    /** @returns {number} */
    getCurrentState() {
        return this.#state;
    }

}
