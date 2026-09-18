const express = require("express");
const router = express.Router();

const {
    getAllCustomers,
    getCustomerById,
    createCustomer,
    updateCustomer,
    deleteCustomer
} = require("../controllers/customers.controller");


/**
 * @openapi
 * /customers:
 *   get:
 *     summary: Get all customers
 *     tags:
 *       - Customers
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Customers retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get("/", getAllCustomers);


/**
 * @openapi
 * /customers/{id}:
 *   get:
 *     summary: Get customer by ID
 *     tags:
 *       - Customers
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
 *         description: Customer retrieved successfully
 *       404:
 *         description: Customer not found
 */
router.get("/:id", getCustomerById);


/**
 * @openapi
 * /customers:
 *   post:
 *     summary: Create customer
 *     tags:
 *       - Customers
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - first_name
 *             properties:
 *               first_name:
 *                 type: string
 *                 example: Somchai
 *               last_name:
 *                 type: string
 *                 example: Phommasone
 *               passport_number:
 *                 type: string
 *                 example: P12345678
 *               nationality:
 *                 type: string
 *                 example: Lao
 *               date_of_birth:
 *                 type: string
 *                 format: date
 *                 example: "2000-05-15"
 *               selfie_photo:
 *                 type: string
 *                 example: uploads/selfie/somchai.jpg
 *               passport_photo:
 *                 type: string
 *                 example: uploads/passport/P12345678.jpg
 *     responses:
 *       201:
 *         description: Customer created successfully
 *       400:
 *         description: first_name is required
 */
router.post("/", createCustomer);


/**
 * @openapi
 * /customers/{id}:
 *   put:
 *     summary: Update customer
 *     tags:
 *       - Customers
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
 *               - first_name
 *             properties:
 *               first_name:
 *                 type: string
 *                 example: Somchai
 *               last_name:
 *                 type: string
 *                 example: Phommasone
 *               passport_number:
 *                 type: string
 *                 example: P12345678
 *               nationality:
 *                 type: string
 *                 example: Lao
 *               date_of_birth:
 *                 type: string
 *                 format: date
 *                 example: "2000-05-15"
 *               selfie_photo:
 *                 type: string
 *                 example: uploads/selfie/somchai.jpg
 *               passport_photo:
 *                 type: string
 *                 example: uploads/passport/P12345678.jpg
 *     responses:
 *       200:
 *         description: Customer updated successfully
 *       404:
 *         description: Customer not found
 */
router.put("/:id", updateCustomer);


/**
 * @openapi
 * /customers/{id}:
 *   delete:
 *     summary: Delete customer
 *     tags:
 *       - Customers
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
 *         description: Customer deleted successfully
 *       404:
 *         description: Customer not found
 */
router.delete("/:id", deleteCustomer);


module.exports = router;