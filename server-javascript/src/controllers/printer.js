import express from 'express';
import multer from 'multer';

const GCODE_MIME_TYPE = 'text/x.gcode';
const MAX_FILE_SIZE = 200 * 10 ** 6; // 200 MB

const gcodeHandler = multer({
    fileFilter: (req, file, callback) => {
        if (file.mimetype === GCODE_MIME_TYPE)
            callback(null, true);
        else
            callback(null, false);
    },

    limits: {
        fileSize: MAX_FILE_SIZE
    }
});

const router = express.Router();

// API paths
const ROOT_PATH = '/printer';
const ADD_JOB_PATH = ROOT_PATH + '/add_job';

/** 
 * @todo Possibly change gcodeHandler.any() to something else 
 * so were not processing every single file; however, it does filter content...
 */
router.post(ADD_JOB_PATH, gcodeHandler.any(), (req, res, next) => {
    
    res.sendStatus(200);
});


export default router;
