import { autoDetect } from '@serialport/bindings-cpp';
import { platform } from 'node:process';

if (platform !== 'linux')
    throw new Error('Unsupported platform');

const binding = autoDetect();
const ports = [
    await binding.open({ path: '/dev/virtualPort1', baudRate: 115200 }),
    await binding.open({ path: '/dev/virtualPort2', baudRate: 115200 }),
    await binding.open({ path: '/dev/virtualPort3', baudRate: 115200 })
];

async function writeOk(bindingPort) {
    await bindingPort.write(Buffer.from('ok\n', 'utf8'));
}

async function writeFirmware(bindingPort) {
    await bindingPort.write(
        Buffer.from('FIRMWARE_NAME:Virtual 1.2.3 (Nov  2 2025 18:52:35) SOURCE_CODE_URL:github.com/sunyhydralab/QView3D PROTOCOL_VERSION:1.0 MACHINE_TYPE:Virtual 3D Printer KINEMATICS:Imaginary EXTRUDER_COUNT:1 UUID:cede2a2f-64o3-4748-9b12-c55c62f367ff\n', 'utf8'));
}

// Pn parameter is not supported yet
async function handleSerialPrint(bindingPort, gcodeCommand) {
    if (gcodeCommand.includes('E1')) {
        const [_, whatToPrint] = gcodeCommand.split('E1 ');
        await bindingPort.write(Buffer.from(`echo: ${whatToPrint}\n`));
    }

    if (gcodeCommand.includes('A1')) {
        const [_, whatToPrint] = gcodeCommand.split('A1 ');
        await bindingPort.write(Buffer.from(`// ${whatToPrint}\n`));
    }
}

const READ_BUFFER_SIZE = 256;

async function createLoop(bindingPort) {
    let outputBuf = '';
    while (true) {
        const rawOutput = (await bindingPort.read(Buffer.alloc(READ_BUFFER_SIZE), 0, READ_BUFFER_SIZE)).buffer;
        // Remove excess \x00 (null) in the buffer
        outputBuf += rawOutput.toString().replaceAll('\x00', '');
        
        const splitStr = outputBuf.split('\n');
        for (let i=0; i < splitStr.length - 1; i++) {
            const gcodeCommand = splitStr[i];

            if (gcodeCommand.startsWith('M115'))
                await writeFirmware(bindingPort);

            if (gcodeCommand.startsWith('M118')) {
                await handleSerialPrint(bindingPort, gcodeCommand);
            }

            // Always write ok
            await writeOk(bindingPort);
        }

        // If the G-Code command is done
        if (outputBuf.includes('\n'))
            outputBuf = splitStr[splitStr.length - 1];
    }
}

ports.forEach(bindingPort => {
    createLoop(bindingPort);
});
