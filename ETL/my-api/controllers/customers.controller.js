const pool = require("../db");
const { createAuditLog } = require("../utils/audit");


// =====================================================
// GET ALL
// =====================================================

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
                passport_photo,
                created_at,
                updated_at
            FROM customers
            ORDER BY id_customer ASC
        `);

        res.json({
            success: true,
            data: rows
        });

    } catch (error) {

        console.error(
            "GET CUSTOMERS ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Database error"
        });
    }
};


// =====================================================
// GET BY ID
// =====================================================

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
                passport_photo,
                created_at,
                updated_at
            FROM customers
            WHERE id_customer = ?
            LIMIT 1
        `, [id]);

        if (!rows.length) {

            return res.status(404).json({
                success: false,
                message: "Customer not found"
            });
        }

        res.json({
            success: true,
            data: rows[0]
        });

    } catch (error) {

        console.error(
            "GET CUSTOMER BY ID ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Database error"
        });
    }
};


// =====================================================
// CREATE
// =====================================================

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
            passport_photo
        } = req.body;

        if (!first_name?.trim()) {

            return res.status(400).json({
                success: false,
                message: "First name is required"
            });
        }

        if (!last_name?.trim()) {

            return res.status(400).json({
                success: false,
                message: "Last name is required"
            });
        }

        if (!passport_number?.trim()) {

            return res.status(400).json({
                success: false,
                message: "Passport number is required"
            });
        }

        const [result] =
            await pool.query(`
                INSERT INTO customers (
                    first_name,
                    last_name,
                    passport_number,
                    nationality,
                    date_of_birth,
                    passport_expiry_date,
                    phone_number,
                    passport_photo
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                first_name.trim(),
                last_name.trim(),
                passport_number.trim(),
                nationality?.trim() || null,
                date_of_birth || null,
                passport_expiry_date || null,
                phone_number?.trim() || null,
                passport_photo || null
            ]);

        const [rows] =
            await pool.query(`
                SELECT
                    id_customer,
                    first_name,
                    last_name,
                    passport_number,
                    nationality,
                    date_of_birth,
                    passport_expiry_date,
                    phone_number,
                    passport_photo,
                    created_at,
                    updated_at
                FROM customers
                WHERE id_customer = ?
                LIMIT 1
            `, [result.insertId]);

        await createAuditLog({
            req,
            action: "CREATE",
            targetEntity: "customers",
            targetId: result.insertId,
            metadata: {
                passport_number: passport_number.trim()
            }
        }).catch(console.error);

        res.status(201).json({
            success: true,
            message: "Customer created successfully",
            data: rows[0]
        });

    } catch (error) {

        console.error(
            "CREATE CUSTOMER ERROR:",
            error
        );

        if (error.code === "ER_DUP_ENTRY") {

            return res.status(409).json({
                success: false,
                message:
                    "Passport number already exists"
            });
        }

        res.status(500).json({
            success: false,
            message: "Database error"
        });
    }
};


// =====================================================
// UPDATE
// =====================================================

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
            passport_photo
        } = req.body;

        if (!first_name?.trim()) {

            return res.status(400).json({
                success: false,
                message: "First name is required"
            });
        }

        if (!last_name?.trim()) {

            return res.status(400).json({
                success: false,
                message: "Last name is required"
            });
        }

        const [oldRows] =
            await pool.query(`
                SELECT *
                FROM customers
                WHERE id_customer = ?
                LIMIT 1
            `, [id]);

        if (!oldRows.length) {

            return res.status(404).json({
                success: false,
                message: "Customer not found"
            });
        }

        await pool.query(`
            UPDATE customers
            SET
                first_name = ?,
                last_name = ?,
                passport_number = ?,
                nationality = ?,
                date_of_birth = ?,
                passport_expiry_date = ?,
                phone_number = ?,
                passport_photo = COALESCE(?, passport_photo),
                updated_at = NOW()
            WHERE id_customer = ?
        `, [
            first_name.trim(),
            last_name.trim(),
            passport_number?.trim() || null,
            nationality?.trim() || null,
            date_of_birth || null,
            passport_expiry_date || null,
            phone_number?.trim() || null,
            passport_photo || null,
            id
        ]);

        const [rows] =
            await pool.query(`
                SELECT
                    id_customer,
                    first_name,
                    last_name,
                    passport_number,
                    nationality,
                    date_of_birth,
                    passport_expiry_date,
                    phone_number,
                    passport_photo,
                    created_at,
                    updated_at
                FROM customers
                WHERE id_customer = ?
                LIMIT 1
            `, [id]);

        await createAuditLog({
            req,
            action: "UPDATE",
            targetEntity: "customers",
            targetId: id,
            metadata: {
                old: oldRows[0],
                new: rows[0]
            }
        }).catch(console.error);

        res.json({
            success: true,
            message: "Customer updated successfully",
            data: rows[0]
        });

    } catch (error) {

        console.error(
            "UPDATE CUSTOMER ERROR:",
            error
        );

        if (error.code === "ER_DUP_ENTRY") {

            return res.status(409).json({
                success: false,
                message:
                    "Passport number already exists"
            });
        }

        res.status(500).json({
            success: false,
            message: "Database error"
        });
    }
};


// =====================================================
// DELETE
// =====================================================

const deleteCustomer = async (req, res) => {

    try {

        const { id } = req.params;

        const [registrationRows] =
            await pool.query(`
                SELECT id_registration
                FROM registrations
                WHERE id_customer = ?
                  AND deleted_at IS NULL
                LIMIT 1
            `, [id]);

        if (registrationRows.length) {

            return res.status(409).json({
                success: false,
                message:
                    "Cannot delete customer with registration history"
            });
        }

        const [result] =
            await pool.query(`
                DELETE FROM customers
                WHERE id_customer = ?
            `, [id]);

        if (!result.affectedRows) {

            return res.status(404).json({
                success: false,
                message: "Customer not found"
            });
        }

        await createAuditLog({
            req,
            action: "DELETE",
            targetEntity: "customers",
            targetId: id
        }).catch(console.error);

        res.json({
            success: true,
            message: "Customer deleted successfully"
        });

    } catch (error) {

        console.error(
            "DELETE CUSTOMER ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Database error"
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