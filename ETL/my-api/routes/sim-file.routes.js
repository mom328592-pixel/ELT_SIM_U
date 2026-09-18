const express = require("express");
const router = express.Router();

const upload = require("../middlewares/upload.middleware");

const {
    getAllFiles,
    getFileById,
    createFile,
    importSims,
    uploadSimFile,
    deleteFile
} = require("../controllers/sim-file.controller");


/**
 * @openapi
 * /sim-files:
 *   get:
 *     summary: Get all SIM file history
 *     tags:
 *       - SIM File History
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: SIM file history retrieved successfully
 */
router.get("/", getAllFiles);


/**
 * @openapi
 * /sim-files/{id}:
 *   get:
 *     summary: Get SIM file history by ID
 *     tags:
 *       - SIM File History
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: File history retrieved successfully
 *       404:
 *         description: File history not found
 */
router.get("/:id", getFileById);


/**
 * @openapi
 * /sim-files:
 *   post:
 *     summary: Create SIM file history
 *     tags:
 *       - SIM File History
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - file_name
 *               - id_agent
 *             properties:
 *               file_name:
 *                 type: string
 *                 example: sim_import_2026_08_24.xlsx
 *               id_agent:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: SIM file history created successfully
 *       400:
 *         description: file_name and id_agent are required
 *       404:
 *         description: Agent not found
 */
router.post("/", createFile);


/**
 * @openapi
 * /sim-files/upload:
 *   post:
 *     summary: Upload Excel or CSV and import SIM cards
 *     tags:
 *       - SIM File History
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - id_agent
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Excel or CSV file
 *               id_agent:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: File uploaded and SIMs imported successfully
 *       400:
 *         description: File or id_agent is missing
 *       404:
 *         description: Agent not found
 */
router.post(
    "/upload",
    upload.single("file"),
    uploadSimFile
);


/**
 * @openapi
 * /sim-files/{id}/import:
 *   post:
 *     summary: Import multiple SIM cards to an existing file history
 *     tags:
 *       - SIM File History
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sims
 *             properties:
 *               sims:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - iccid
 *                     - imsi
 *                   properties:
 *                     iccid:
 *                       type: string
 *                     imsi:
 *                       type: string
 *                     phone_number:
 *                       type: string
 *                     id_sim_type:
 *                       type: integer
 *                     id_sim_status:
 *                       type: integer
 *                     package:
 *                       type: string
 *                     qr_code:
 *                       type: string
 *     responses:
 *       201:
 *         description: SIMs imported successfully
 *       400:
 *         description: Invalid SIM array
 *       404:
 *         description: File history not found
 */
router.post("/:id/import", importSims);


/**
 * @openapi
 * /sim-files/{id}:
 *   delete:
 *     summary: Delete SIM file history
 *     tags:
 *       - SIM File History
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: SIM file history deleted successfully
 *       404:
 *         description: File history not found
 *       409:
 *         description: File is linked to SIM cards
 */
router.delete("/:id", deleteFile);


module.exports = router;