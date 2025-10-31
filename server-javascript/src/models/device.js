import { NotImplemented } from '../util/util.js';
import { getPrinterAtSerialPort } from '../serial.js';

export function getConnectedDevices() {
    throw new NotImplemented();
}

console.log(await getPrinterAtSerialPort('/dev/ttyACM0'));
