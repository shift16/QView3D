import express from 'express';
import { getConnectedDevices } from '../models/device.js';

const ROOT_URL = '/device';
const GET_CONNECTED_DEVICES = ROOT_URL + '/get_connected_devices';

const router = express.Router();

// Use JSON middleware for this route
router.use(express.json());

router.get(GET_CONNECTED_DEVICES, (req, res, next) => {
    /** @todo Complete */
    // const devices = getConnectedDevices();
    req.send('incomplete api');
});

export default router;
