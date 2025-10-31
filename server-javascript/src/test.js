import { GCodeScript } from './gcode_script.js';
import { readFileSync } from 'node:fs';
import { Printer } from './printer.js';
import { getCompatiblePrinters } from './printer.js';
import { log } from './util/log.js';

const mk4Gscript = new GCodeScript(readFileSync('./gcode-examples/cali-cubes/mini/xyz-cali-cube-mini_MK4.gcode').toString());

const printer1 = new Printer();

const port1 = '/dev/ttyACM0';
const port2 = '/dev/ttyACM1';

printer1.setGcodeScript(mk4Gscript);
printer1.setSerialPort(port1, () => {
    printer1.startPrint();
});

setTimeout(_ => {
    log(getCompatiblePrinters(mk4Gscript).toString());
}, 10000);
