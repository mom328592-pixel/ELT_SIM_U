const pool = require("../db");

// =========================
// GET ALL CUSTOMERS
// =========================
const getAllCustomers = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT
                id_customer,
                first_name,
                last_name,
                passport_number,
                nationality,
                date_of_birth,
                passport_expiry_date,
                phone_number,
                selfie_photo,
                passport_photo,
                created_at,
                updated_at
            FROM customers
            ORDER BY id_customer ASC
        `);

        res.json({
            success: true,
            message: "Customers retrieved successfully",
            data: rows
        });

    } catch (error) {
        console.error("GET /customers ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};


// =========================
// GET CUSTOMER BY ID
// =========================
const getCustomerById = async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await pool.query(`
            SELECT
                id_customer,
                first_name,
                last_name,
                passport_number,
                nationality,
                date_of_birth,
                passport_expiry_date,
                phone_number,
                selfie_photo,
                passport_photo,
                created_at,
                updated_at
            FROM customers
            WHERE id_customer = ?
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Customer not found"
            });
        }

        res.json({
            success: true,
            message: "Customer retrieved successfully",
            data: rows[0]
        });

    } catch (error) {
        console.error("GET /customers/:id ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};


// =========================
// CREATE CUSTOMER
// =========================
const createCustomer = async (req, res) => {
    try {
        const {
            first_name,
            last_name,
            passport_number,
            nationality,
            date_of_birth,
            passport_expiry_date,
            phone_number,
            selfie_photo,
            passport_photo
        } = req.body;

        if (!first_name) {
            return res.status(400).json({
                success: false,
                message: "first_name is required"
            });
        }

        const [result] = await pool.query(`
            INSERT INTO customers (
                first_name,
                last_name,
                passport_number,
                nationality,
                date_of_birth,
                passport_expiry_date,
                phone_number,
                selfie_photo,
                passport_photo
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            first_name,
            last_name || null,
            passport_number || null,
            nationality || null,
            date_of_birth || null,
            passport_expiry_date || null,
            phone_number || null,
            selfie_photo || null,
            passport_photo || null
        ]);

        const [rows] = await pool.query(`
            SELECT
                id_customer,
                first_name,
                last_name,
                passport_number,
                nationality,
                date_of_birth,
                passport_expiry_date,
                phone_number,
                selfie_photo,
                passport_photo,
                created_at,
                updated_at
            FROM customers
            WHERE id_customer = ?
        `, [result.insertId]);

        res.status(201).json({
            success: true,
            message: "Customer created successfully",
            data: rows[0]
        });

    } catch (error) {
        console.error("POST /customers ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};


// =========================
// UPDATE CUSTOMER
// =========================
const updateCustomer = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            first_name,
            last_name,
            passport_number,
            nationality,
            date_of_birth,
            passport_expiry_date,
            phone_number,
            selfie_photo,
            passport_photo
        } = req.body;

        if (!first_name) {
            return res.status(400).json({
                success: false,
                message: "first_name is required"
            });
        }

        const [result] = await pool.query(`
            UPDATE customers
            SET
                first_name = ?,
                last_name = ?,
                passport_number = ?,
                nationality = ?,
                date_of_birth = ?,
                passport_expiry_date = ?,
                phone_number = ?,
                selfie_photo = ?,
                passport_photo = ?
            WHERE id_customer = ?
        `, [
            first_name,
            last_name || null,
            passport_number || null,
            nationality || null,
            date_of_birth || null,
            passport_expiry_date || null,
            phone_number || null,
            selfie_photo || null,
            passport_photo || null,
            id
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Customer not found"
            });
        }

        const [rows] = await pool.query(`
            SELECT
                id_customer,
                first_name,
                last_name,
                passport_number,
                nationality,
                date_of_birth,
                passport_expiry_date,
                phone_number,
                selfie_photo,
                passport_photo,
                created_at,
                updated_at
            FROM customers
            WHERE id_customer = ?
        `, [id]);

        res.json({
            success: true,
            message: "Customer updated successfully",
            data: rows[0]
        });

    } catch (error) {
        console.error("PUT /customers/:id ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};


// =========================
// DELETE CUSTOMER
// =========================
const deleteCustomer = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await pool.query(`
            DELETE FROM customers
            WHERE id_customer = ?
        `, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Customer not found"
            });
        }

        res.json({
            success: true,
            message: "Customer deleted successfully"
        });

    } catch (error) {
        console.error("DELETE /customers/:id ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};


module.exports = {
    getAllCustomers,
    getCustomerById,
    createCustomer,
    updateCustomer,
    deleteCustomer
};