import { SerialPort } from 'serialport';

SerialPort.list().then(ports => {
  console.log(ports);
}).catch(err => console.log(err));
