import { NotImplemented } from '../util/util.js';
import { getPrinterAtSerialPort } from '../serial.js';

export function getConnectedDevices() {
    throw new NotImplemented();
}

await getPrinterAtSerialPort('/dev/ttyACM0');
