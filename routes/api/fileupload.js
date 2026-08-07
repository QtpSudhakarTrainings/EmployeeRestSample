const express = require('express')
const path = require("path");
const util = require("util");
const router = express.Router()
const PORT = process.env.PORT || 5002
const fs = require('fs')

// DATA_DIR lets deployments point uploads at a mounted volume (e.g. Railway)
// without changing local dev behavior, where it defaults to the repo root.
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', '..')

router.post("/", async (req, res) => {
    try {
        const file = req.files.file;
        const fileName = file.name;
        const size = file.data.length;
        const extension = path.extname(fileName);

        const allowedExtensions = /png|jpeg|jpg|gif/;

        if (!allowedExtensions.test(extension)) throw "Unsupported extension!";
        if (size > 5000000) throw "File must be less than 5MB";

        const md5 = file.md5;
        const URL = md5 + extension;
        const dir = path.join(DATA_DIR, 'fileuploads') + path.sep
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        await util.promisify(file.mv)(dir + URL);
        res.status(201)

        res.json({
            success: true,
            message: "File uploaded successfully!",
            url: `http://localhost:${PORT}/fileuploads/` + fileName,
        });
    } catch (err) {
        console.log(err);
        if (err === "Unsupported extension!" || err === "File must be less than 5MB") {
            res.status(400).json({
                success: false,
                message: err,
            });
        } else {
            res.status(500).json({
                success: false,
                message: err,
            });
        }

    }
});

module.exports = router