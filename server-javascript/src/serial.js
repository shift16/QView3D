import { autoDetect } from "@serialport/bindings-cpp";
import { readdir } from 'node:fs/promises';
import { platform } from 'node:process';
import { setTimeout as setTimeoutP } from 'node:timers/promises';
import { log } from './util/log.js';
import { countChar } from './util/util.js';

// Gets the current platform's C++ binding
const binding = autoDetect();

// Typical Linux serial port block device names
const ACM_SERIAL = 'ttyACM';
const USB_SERIAL = 'ttyUSB';

/** Thrown when a communication error occurs between a printer and the server */
export class CommError extends Error {};
export class PrinterTimeout extends Error {};

// Constants for serial communication
const DEFAULT_BAUD_RATE = 115200;
const DEFAULT_READ_BUFFER_SIZE = 1024; // 1KB
const DEFAULT_BYTES_TO_READ = 1024; // 1KB
const RESPONSE_COMPLETED = 'ok';
const MARLIN_PROTOCOL_ENCODING = 'utf8';
const SERIAL_BOOT_TIME = 5000;
// Used to test if the device we're communicating with is a printer
const HELLO_CMD = 'M118 E1 Hello, world!gh4rf';
const HELLO_CMD_REGEX = /Hello, world!gh4rf/;
const HELLO_CMD_TIMEOUT = 5000;

const PRINTER_FIRMWARE_INFO_CMD = 'M115';
const MACHINE_INFO_REGEX = /MACHINE_TYPE:([^\s]*)/;

/** A map where the keys are serial ports and the values are printers */
const connectedSerialPrinters = new Map();

const ConnectionType = {
    SerialPort: 'SerialPort',
    Network: 'Network' // Currently unsupported
}

export const PrinterState = {
    NOT_CONNECTED: 'NotConnected',
    CONNECTING: 'Connecting',
    READY: 'Ready',
    PRINTING: 'Printing',
    CONNECTING: 'Connected',
    PAUSED: 'Paused',
    ERROR: 'Error'
};

export class Printer {
    connectionType;
    serialPort;
    serialPortBinding;
    ipAddress; // Not implemented
    ipPort; // Not implemented
    printerModel;
    state;
    printerCapabilityTable; // Not implemented
    manufacturer;
    sendQueue = [];
    extractorStack = [];
}

export const ExtractorState = {
    TIMED_OUT: 'TimedOut',
    PENDING: 'Pending',
    FOUND_MATCH: 'FoundMatch',
    PRINTER_ERR_OCCURRED: 'PrinterErrorOccurred'
}
    
export class Extractor {
    regex;
    onMatchCallback;
    onPrinterErrorCallback;
    execRegexOnOk; 
    state = ExtractorState.PENDING;

    constructor(regex, onMatchCallback, onPrinterErrorCallback, execRegexOnOk) {
        this.regex = regex;
        this.onMatchCallback = onMatchCallback;
        this.onPrinterErrorCallback = onPrinterErrorCallback;
        this.execRegexOnOk = execRegexOnOk;
    }
}

export const SentGCodeCommandState = {
    SENT: 'Sent',
    TIMED_OUT: 'TimedOut',
    RECEIVED_RESPONSE: 'ReceivedResponse',
    PRINTER_ERR_OCCURRED: 'PrinterErrorOccurred'
}

export class SentGCodeCommand {
    command;
    onCompletionCallback;
    onPrinterErrorCallback;
    state = SentGCodeCommandState.SENT;

    constructor(command, onCompletionCallback, onPrinterErrorCallback) {
        this.command = command;
        this.onCompletionCallback = onCompletionCallback;
        this.onPrinterErrorCallback = onPrinterErrorCallback;
    }
}

export class PrinterFirmwareInfo {
    firmwareName;
    sourceCodeUrl;
    protocolVersion;
    machineType;
    kinematics;
    extruderCount;
    UUID;
}

/**
 * Returns an array of serial ports connected to this computer
 * Objects are of type {@link https://serialport.io/docs/api-bindings-cpp/#list PortInfo}
 */
export async function getConnectedSerialPorts() {
    const detectedSerialPorts = await binding.list();
    const otherSerialPorts = [];

    // The serialport library fails to find serial ports created via socat
    // These ports are created for debugging purposes on Linux systems
    if (platform === 'linux') {
        try {
            const devDir = await readdir('/dev');
            for (let i = 0; i < devDir.length; i++) {
                const fileName = devDir[i];

                if (fileName.includes(ACM_SERIAL) || fileName.includes(USB_SERIAL)) {
                    otherSerialPorts.push('/dev/' + fileName);
                }
            }
        } catch (err) {
            /** @todo Just in case any errors occur, we'll log them 
             * But, let's handle the errors when they occur
             */
            log(err.message, 'serial.js');
        }
    }

    // Ensure that the other serial ports aren't already in 
    // the detectedSerialPorts array
    for (let i = 0; i < otherSerialPorts.length; i++) {
        const port = otherSerialPorts[i];
        let addPort = true;

        for (let k = 0; k < detectedSerialPorts.length; k++) {
            const existingPort = detectedSerialPorts[k];
            if (port === existingPort.path) {
                addPort = false;
                continue;
            }
        }

        if (addPort === true)
            detectedSerialPorts.push({ path: port });
    }

    return detectedSerialPorts;
}

/** 
 * Sends a G-Code command to a printer
 * Returns a promise that is fulfilled when the printer responds to the G-Code command
 * Returns the output from the printer as well
 * This G-Code command will timeout after timeoutAfter in ms. If timeoutAfter > 0, then
 * a timeout error will be thrown, else it will not
 * If a newline character is not the last character in the command, then it will be added
 * The printer must be actively printing or ready to print (with autoChangeState = true)
 * If autoChangeState = true, then the printer's state would change
 * from PrinterState.READY to PrinterState.PRINTING
 * If sendImmediately = true, then this G-Code command will be moved
 * to the front of the queue
 */
export function sendGCodeCommand(gcodeCommand, printer, timeoutAfter = -1, sendImmediately = false, autoChangeState = true) {
    if (typeof gcodeCommand !== 'string')
        throw new TypeError(`Expected string got ${typeof gcodeCommand}`);

    if (!(printer instanceof Printer))
        throw new TypeError(`Expected Printer object, got ${typeof printer}`);

    if (typeof timeoutAfter !== 'number')
        throw new TypeError(`Expected number got ${typeof timeoutAfter}`);

    // Add a newline if it's missing
    if (!gcodeCommand.endsWith('\n'))
        gcodeCommand += '\n';

    // Ensure there's only one newline in the entire string
    if (countChar(gcodeCommand, '\n') !== 1)
        throw new Error(`Every G-Code command only has one newline character at the end of the command. Not ${countChar(gcodeCommand, '\n')}`);

    if (printer.state === PrinterState.READY) {
        if (autoChangeState === true)
            printer.state = PrinterState.PRINTING;
    }

    if (printer.state === PrinterState.PRINTING) {
        return new Promise((resolve, reject) => {
            const newSentGCodeCommand = new SentGCodeCommand(gcodeCommand, resolve, reject);
            if (sendImmediately === false) {
                printer.sendQueue.push(newSentGCodeCommand);
            } else {
                printer.sendQueue.unshift(newSentGCodeCommand);
            }

            // Handle timeout
            if (timeoutAfter > 0) {
                setTimeout(() => {
                    if (newSentGCodeCommand.state === SentGCodeCommandState.SENT) {
                        newSentGCodeCommand.state = SentGCodeCommandState.TIMED_OUT;
                        reject(new PrinterTimeout(`G-Code command "${gcodeCommand}" timed out after ${timeoutAfter}ms`));
                    }
                }, timeoutAfter);
            }
        });
    } else {
        throw new CommError(`G-Code can only be sent to a printer that is printing and not when its ${printer.state}`);
    }
}

/**
 * Immediately writes the G-Code command to the serial port
 * WARNING: This skips the sendQueue so it must only be used when
 * the communication loop has ended
 */
function sendHello(printer) {
    if (!(printer instanceof Printer))
        throw new TypeError(`Expected Printer object, got ${typeof printer}`);

    if (printer.connectionType === ConnectionType.SerialPort) {
        printer.serialPortBinding.write(Buffer.from(HELLO_CMD, MARLIN_PROTOCOL_ENCODING));
    }
}

/**
 * Returns a promise that succeeds when the given RegExp finds a match
 * in the printer's output
 * If execRegexOnOk is true, then a match will be looked for after the printer
 * has completed its response
 * responseTimeout is the maximum amount of time that can pass before the
 * promise rejects with a PrinterTimeout error
 * If connection to the printer is suddenly severed,
 * the promise will reject with a CommError
 */
export function onOutputMatch(regex, printer, execRegexOnOk = true, responseTimeout = 2000) {
    if (!(regex instanceof RegExp))
        throw new TypeError(`Expected RegExp object, got ${typeof regex}`);

    if (!(printer instanceof Printer))
        throw new TypeError(`Expected Printer object, got ${typeof printer}`);
    
    if (typeof responseTimeout !== 'number')
        throw new TypeError(`Expected type number, got ${typeof responseTimeout}`);

    return new Promise((resolve, reject) => {
        const newExtractor = new Extractor(regex, resolve, reject, execRegexOnOk);
        printer.extractorStack.push(newExtractor);

        // Handle the timeout
        setTimeout(() => {
            if (newExtractor.state === ExtractorState.PENDING) {
                newExtractor.state = ExtractorState.TIMED_OUT;
                reject(new PrinterTimeout(`The extractor "${regex}" timed out after ${responseTimeout}ms`));
            }
        }, responseTimeout);
    });
}

/** 
 * Returns the firmware info of a 3D printer
 * If the printer is not PrinterState.READY or PrinterState.PRINTING,
 * then an error will be thrown
 * If the connection to the printer is severed, a CommError 
 * will occur 
 */
export async function getFirmwareInfo(printer) {
    const printerOutput = await sendGCodeCommand(PRINTER_FIRMWARE_INFO_CMD, printer);
    const firmwareInfo = new PrinterFirmwareInfo();

    /** @todo Complete the getFirmwareInfo function */
    console.log(printerOutput);
}

/**
 * This function creates the serial communication loop between the printer and the serial port
 * The printer is returned when a successful connection is created
 */
async function createSerialCommunicationLoop(printer) {
    if (!(printer) instanceof Printer)
        throw new TypeError(`Expected object of type Printer got ${typeof printer}`);

    if (!(printer.state === PrinterState.CONNECTING))
        throw new CommError(`A serial communication loop has already been created for printer at port "${printer.serialPort}"`);

    const serialPortListener = async () => {
        /** Assumed to be of type {@link https://serialport.io/docs/api-bindings-cpp/#bindingport BindingPort} */
        const serialPortBinding = printer.serialPortBinding;

        let outputBuffer = '';
        let previousCommand = null;
        while (serialPortBinding.isOpen === true) {
            try {
                const nextOutput = await serialPortBinding.read(
                    Buffer.alloc(DEFAULT_READ_BUFFER_SIZE), 0, DEFAULT_BYTES_TO_READ);
                outputBuffer += nextOutput.buffer.toString(MARLIN_PROTOCOL_ENCODING);
                console.log(outputBuffer);

                // Only process G-Code commands when the printer is PrinterState.PRINTING
                if (printer.state === PrinterState.PRINTING) {
                    // Printer completed its response to a G-Code command
                    let responseCompleted = false;
                    if (outputBuffer.split('\n').includes(RESPONSE_COMPLETED))
                        responseCompleted = true;

                    // Handle extractors
                    const incompleteExtractors = [];
                    const extractors = printer.extractorStack;

                    while (extractors.length > 0) {
                        const extractor = extractors.pop();
                        // Ensure the extractor hasn't timed out
                        if (extractor.state === ExtractorState.TIMED_OUT)
                            continue;

                        let foundMatch = false;

                        if (extractor.execRegexOnOk === true) {
                            if (responseCompleted === true)
                                foundMatch = extractor.exec(outputBuffer) !== null;
                        } else {
                            foundMatch = extractor.exec(outputBuffer) !== null;
                        }

                        if (foundMatch === true) {
                            extractor.state = ExtractorState.FOUND_MATCH;
                            extractor.onMatchCallback(outputBuffer);
                        } else {
                            incompleteExtractors.push(extractor);
                        }
                    }

                    printer.extractorStack = incompleteExtractors;

                    // Handle sending next G-Code command
                    if (responseCompleted === true) {
                        if (previousCommand !== null) {
                            // Ensure this command hasn't timed out
                            if (previousCommand.state !== SentGCodeCommandState.TIMED_OUT) {
                                previousCommand.state = SentGCodeCommandState.RECEIVED_RESPONSE;
                                previousCommand.onCompletionCallback(outputBuffer);
                            }
                        }

                        const sendQueue = printer.sendQueue;

                        while (sendQueue.length > 0) {
                            const nextGCodeCommand = sendQueue.shift();

                            // Ensure the next command hasn't already timed out
                            if (nextGCodeCommand.state === SentGCodeCommandState.TIMED_OUT)
                                continue;

                            await printer.serialPortBinding.write(Buffer.from(nextGCodeCommand.command, MARLIN_PROTOCOL_ENCODING));
                            previousCommand = nextGCodeCommand;
                            
                            // Clear out the output buffer when we receive a completed response
                            // because all of the other data is no longer necessary
                            outputBuffer = '';
                        }
                    }
                }
            } catch (e) {
                console.log(e);
            }
        }

        console.log('Connection closed');
    }

    serialPortListener();
    // Wait a little of time for the printer to be ready
    await setTimeoutP(SERIAL_BOOT_TIME);

    printer.state = PrinterState.READY;
    
    // Test the serial port to see if it's a printer
    /** @todo Ensure this actually works */
    try {
        // Start the communication loop
        sendHello(printer);
        // Verify that this is a printer
        const printerOutput = await sendGCodeCommand(HELLO_CMD, printer, HELLO_CMD_TIMEOUT, true);

    } catch (e) {
        // If it's not a printer, then it won't respond to the G-Code commands.... aka it will timeout
        console.log(e);
    }

    connectedSerialPrinters.set(printer.serialPort, printer);
    return printer;
}

/**
 * Returns a printer object at the given port
 */
export async function getPrinterAtSerialPort(port, baudRate = DEFAULT_BAUD_RATE) {
    if (typeof port !== 'string')
        throw new TypeError(`Expected string got ${typeof port}`);

    // Check if the port is already opened
    if (connectedSerialPrinters.has(port)) {
        return connectedSerialPrinters.get(port);
    } else {
        const newPrinter = new Printer();
        newPrinter.connectionType = ConnectionType.SerialPort;
        newPrinter.serialPort = port;
        newPrinter.state = PrinterState.CONNECTING;
        newPrinter.serialPortBinding = await binding.open({ path: port, baudRate: baudRate });

        // Create the communication loop
        await createSerialCommunicationLoop(newPrinter);

        return newPrinter;
    }
}

/**
 * Returns a list of all the printers that have been recognized by the server
 * If refresh = true, then any new serial ports will be checked to see if they're
 * a printer
 */
export async function getKnownPrinters(refresh = true) {
    if (typeof refresh !== 'boolean') {
        throw new TypeError(`Expected type boolean got ${typeof refresh}`);
    }

    if (refresh === true) {
        const serialPorts = await getConnectedSerialPorts();
        /** Assumes that the returned array has objects of type PortInfo
         * where the property 'path' is the only property guaranteed to exist
         * @todo Let's add something to ensure that we're not assuming that anymore */
        for (let i = 0; i < serialPorts.length; i++) {
            const port = serialPorts[i];

            let isPortKnown = false;
            for (let k = 0; k < knownPrinters.length; k++) {
                if (port.path === knownPrinters[k].path) {
                    isPortKnown = true;
                    break;
                }
            }

            if (isPortKnown === false) {
                knownPrinters.push(port);
            }
        }
    }
    
    return knownPrinters;
}
