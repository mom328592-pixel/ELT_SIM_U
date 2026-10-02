const pool = require("../db");

// =====================================================
// GET ALL PACKAGES
// =====================================================
const getAllPackages = async (req, res) => {
    try {
        const { active } = req.query;

        let where = "WHERE deleted_at IS NULL";

        if (active === "1") {
            where += " AND is_active = 1";
        }

        const [rows] = await pool.query(`
            SELECT
                id_package,
                package_name,
                description,
                data_gb,
                duration_days,
                price,
                currency,
                is_active,
                created_at,
                updated_at
            FROM packages
            ${where}
            ORDER BY id_package DESC
        `);

        res.json({
            success: true,
            data: rows
        });

    } catch (error) {
        console.error("GET PACKAGES ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};


// =====================================================
// GET PACKAGE BY ID
// =====================================================
const getPackageById = async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await pool.query(`
            SELECT
                id_package,
                package_name,
                description,
                data_gb,
                duration_days,
                price,
                currency,
                is_active,
                created_at,
                updated_at
            FROM packages
            WHERE id_package = ?
              AND deleted_at IS NULL
        `, [id]);

        if (!rows.length) {
            return res.status(404).json({
                success: false,
                message: "Package not found"
            });
        }

        res.json({
            success: true,
            data: rows[0]
        });

    } catch (error) {
        console.error("GET PACKAGE ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};


// =====================================================
// CREATE PACKAGE
// =====================================================
const createPackage = async (req, res) => {
    try {
        const {
            package_name,
            description,
            data_gb,
            duration_days,
            price,
            currency = "LAK",
            is_active = 1
        } = req.body;

        if (!package_name?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Package name is required"
            });
        }

        if (data_gb == null || duration_days == null) {
            return res.status(400).json({
                success: false,
                message: "Data and duration are required"
            });
        }

        const [result] = await pool.query(`
            INSERT INTO packages (
                package_name,
                description,
                data_gb,
                duration_days,
                price,
                currency,
                is_active,
                created_by
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            package_name.trim(),
            description?.trim() || null,
            Number(data_gb),
            Number(duration_days),
            Number(price || 0),
            currency || "LAK",
            Number(is_active) ? 1 : 0,
            req.user?.id_user || null
        ]);

        const [rows] = await pool.query(`
            SELECT *
            FROM packages
            WHERE id_package = ?
        `, [result.insertId]);

        res.status(201).json({
            success: true,
            message: "Package created successfully",
            data: rows[0]
        });

    } catch (error) {
        console.error("CREATE PACKAGE ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};


// =====================================================
// UPDATE PACKAGE
// =====================================================
const updatePackage = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            package_name,
            description,
            data_gb,
            duration_days,
            price,
            currency,
            is_active
        } = req.body;

        if (!package_name?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Package name is required"
            });
        }

        const [result] = await pool.query(`
            UPDATE packages
            SET
                package_name = ?,
                description = ?,
                data_gb = ?,
                duration_days = ?,
                price = ?,
                currency = ?,
                is_active = ?,
                updated_at = NOW()
            WHERE id_package = ?
              AND deleted_at IS NULL
        `, [
            package_name.trim(),
            description?.trim() || null,
            Number(data_gb),
            Number(duration_days),
            Number(price || 0),
            currency || "LAK",
            Number(is_active) ? 1 : 0,
            id
        ]);

        if (!result.affectedRows) {
            return res.status(404).json({
                success: false,
                message: "Package not found"
            });
        }

        const [rows] = await pool.query(`
            SELECT *
            FROM packages
            WHERE id_package = ?
        `, [id]);

        res.json({
            success: true,
            message: "Package updated successfully",
            data: rows[0]
        });

    } catch (error) {
        console.error("UPDATE PACKAGE ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};


// =====================================================
// DELETE PACKAGE
// =====================================================
const deletePackage = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await pool.query(`
            UPDATE packages
            SET
                deleted_at = NOW(),
                is_active = 0
            WHERE id_package = ?
              AND deleted_at IS NULL
        `, [id]);

        if (!result.affectedRows) {
            return res.status(404).json({
                success: false,
                message: "Package not found"
            });
        }

        res.json({
            success: true,
            message: "Package deleted successfully"
        });

    } catch (error) {
        console.error("DELETE PACKAGE ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};


module.exports = {
    getAllPackages,
    getPackageById,
    createPackage,
    updatePackage,
    deletePackage
};