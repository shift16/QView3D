import { GCodeScript } from './gcode_script.js';

const connectedPrinters = [];

export function getCompatiblePrinters(gcodeScript) {
    if (!(gcodeScript instanceof GCodeScript))
        throw new Error(`gcodeScript should be an instance of the GCodeScript class. Not a ${typeof gcodeScript}`);

    const compatiblePrinters = [];

    for (let i = 0; i < connectedPrinters.length; i++) {
        const printer = connectedPrinters[i];
        const printerModel = printer.getModelName();

        if (printerModel !== undefined) {
            if (gcodeScript.supportsPrinter(printerModel))
                compatiblePrinters.push(printer);
        }
    }

    return compatiblePrinters;
}
