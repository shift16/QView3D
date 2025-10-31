import express from 'express';

import deviceController from './controllers/device.js';
import printerController from './controllers/printer.js';

const app = express();

const PORT = 3000;

app.use(printerController);
app.use(deviceController);

app.listen(PORT, _ => {
    console.log(`Listening on port ${PORT}`);
});
