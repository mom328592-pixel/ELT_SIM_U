const XLSX = require("xlsx");
const pool = require("../db");
const { createAuditLog } = require("../utils/audit");


// =====================================================
// EXPORT REGISTRATIONS
// =====================================================

const exportRegistrations = async (req, res) => {

    try {

        const {
            status,
            id_agent,
            search,
            date_from,
            date_to
        } = req.query;

        let sql = `
            SELECT
                r.id_registration AS ID,
                rs.status_name AS Status,

                CONCAT(
                    c.first_name,
                    ' ',
                    c.last_name
                ) AS Customer,

                c.passport_number AS Passport,

                s.phone_number AS Phone,
                s.iccid AS ICCID,
                s.imsi AS IMSI,

                st.sim_type AS SIM_Type,

                p.package_name AS Package,
                p.data_gb AS Data_GB,
                p.validity_days AS Validity_Days,
                p.price AS Price,

                a.agent_name AS Agent,

                r.registered_at AS Registered_At,

                u.username AS Reviewed_By,
                r.reviewed_at AS Reviewed_At,

                r.notes AS Notes

            FROM registrations r

            LEFT JOIN registrations_status rs
                ON r.id_registration_status =
                   rs.id_registration_status

            LEFT JOIN customers c
                ON r.id_customer =
                   c.id_customer

            LEFT JOIN sim_cards s
                ON r.id_sim =
                   s.id_sim

            LEFT JOIN sim_types st
                ON s.id_sim_type =
                   st.id_sim_type

            LEFT JOIN packages p
                ON s.id_package =
                   p.id_package

            LEFT JOIN agents a
                ON r.id_agent =
                   a.id_agent

            LEFT JOIN users u
                ON r.reviewed_by =
                   u.id_user

            WHERE r.deleted_at IS NULL
        `;

        const params = [];

        if (
            status &&
            status !== "All"
        ) {

            sql += `
                AND rs.status_name = ?
            `;

            params.push(status);
        }

        if (
            id_agent &&
            id_agent !== "All"
        ) {

            sql += `
                AND r.id_agent = ?
            `;

            params.push(Number(id_agent));
        }

        if (search) {

            const keyword =
                `%${search}%`;

            sql += `
                AND (
                    CONCAT(
                        c.first_name,
                        ' ',
                        c.last_name
                    ) LIKE ?

                    OR c.passport_number LIKE ?

                    OR s.phone_number LIKE ?

                    OR s.iccid LIKE ?

                    OR s.imsi LIKE ?
                )
            `;

            params.push(
                keyword,
                keyword,
                keyword,
                keyword,
                keyword
            );
        }

        if (date_from) {

            sql += `
                AND DATE(r.registered_at) >= ?
            `;

            params.push(date_from);
        }

        if (date_to) {

            sql += `
                AND DATE(r.registered_at) <= ?
            `;

            params.push(date_to);
        }

        sql += `
            ORDER BY r.registered_at DESC
        `;

        const [rows] =
            await pool.query(
                sql,
                params
            );

        const worksheet =
            XLSX.utils.json_to_sheet(
                rows
            );

        const workbook =
            XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            "Registrations"
        );

        const buffer =
            XLSX.write(
                workbook,
                {
                    type: "buffer",
                    bookType: "xlsx"
                }
            );

        await createAuditLog({
            req,
            action: "EXPORT_EXCEL",
            targetEntity: "registrations",
            metadata: {
                status,
                id_agent,
                search,
                date_from,
                date_to,
                result_count: rows.length
            }
        }).catch(console.error);

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        res.setHeader(
            "Content-Disposition",
            'attachment; filename="registrations.xlsx"'
        );

        res.send(buffer);

    } catch (error) {

        console.error(
            "EXPORT REGISTRATIONS ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Database error"
        });
    }
};


// =====================================================
// EXPORT SIMS
// =====================================================

const exportSims = async (req, res) => {

    try {

        const [rows] =
            await pool.query(`
                SELECT
                    s.id_sim AS ID,

                    s.iccid AS ICCID,
                    s.imsi AS IMSI,
                    s.phone_number AS Phone_Number,

                    st.sim_type AS SIM_Type,

                    ss.sim_status AS SIM_Status,

                    s.id_package AS ID_Package,
                    p.package_name AS Package,
                    p.data_gb AS Data_GB,
                    p.validity_days AS Validity_Days,
                    p.price AS Price,

                    s.qr_code AS QR_Code,
                    s.activation_code AS Activation_Code,

                    s.id_file AS File_ID,
                    hf.file_name AS File_Name,

                    s.imported_at AS Imported_At

                FROM sim_cards s

                LEFT JOIN sim_types st
                    ON s.id_sim_type =
                       st.id_sim_type

                LEFT JOIN sim_status ss
                    ON s.id_sim_status =
                       ss.id_sim_status

                LEFT JOIN packages p
                    ON s.id_package =
                       p.id_package

                LEFT JOIN history_sim_card_file hf
                    ON s.id_file =
                       hf.id_file

                WHERE s.deleted_at IS NULL

                ORDER BY s.id_sim DESC
            `);

        const worksheet =
            XLSX.utils.json_to_sheet(
                rows
            );

        const workbook =
            XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            "SIM Cards"
        );

        const buffer =
            XLSX.write(
                workbook,
                {
                    type: "buffer",
                    bookType: "xlsx"
                }
            );

        await createAuditLog({
            req,
            action: "EXPORT_EXCEL",
            targetEntity: "sim_cards",
            metadata: {
                result_count:
                    rows.length
            }
        }).catch(console.error);

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        res.setHeader(
            "Content-Disposition",
            'attachment; filename="sim_cards.xlsx"'
        );

        res.send(buffer);

    } catch (error) {

        console.error(
            "EXPORT SIM ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Database error"
        });
    }
};


// =====================================================
// EXPORT CUSTOMERS
// =====================================================

const exportCustomers = async (req, res) => {

    try {

        const [rows] =
            await pool.query(`
                SELECT
                    id_customer AS ID,
                    first_name AS First_Name,
                    last_name AS Last_Name,
                    passport_number AS Passport_Number,
                    nationality AS Nationality,
                    date_of_birth AS Date_Of_Birth,
                    passport_expiry_date AS Passport_Expiry_Date,
                    phone_number AS Phone_Number,
                    passport_photo AS Passport_Photo,
                    created_at AS Created_At
                FROM customers
                ORDER BY id_customer DESC
            `);

        const worksheet =
            XLSX.utils.json_to_sheet(
                rows
            );

        const workbook =
            XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            "Customers"
        );

        const buffer =
            XLSX.write(
                workbook,
                {
                    type: "buffer",
                    bookType: "xlsx"
                }
            );

        await createAuditLog({
            req,
            action: "EXPORT_EXCEL",
            targetEntity: "customers",
            metadata: {
                result_count:
                    rows.length
            }
        }).catch(console.error);

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        res.setHeader(
            "Content-Disposition",
            'attachment; filename="customers.xlsx"'
        );

        res.send(buffer);

    } catch (error) {

        console.error(
            "EXPORT CUSTOMERS ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Database error"
        });
    }
};


module.exports = {
    exportRegistrations,
    exportCustomers,
    exportSims
};