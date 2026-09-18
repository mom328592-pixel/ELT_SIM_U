const pool = require('../db');

const getAllPackages = async (req, res) => {
  try {
    const { active } = req.query;
    const where = active === '1' ? 'WHERE is_active = 1 AND deleted_at IS NULL' : 'WHERE deleted_at IS NULL';
    const [rows] = await pool.query(`SELECT id_package, package_name, description, duration_days, price, currency, is_active, created_at, updated_at FROM packages ${where} ORDER BY id_package DESC`);
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Database error', error: e.message });
  }
};

const getPackageById = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM packages WHERE id_package = ? AND deleted_at IS NULL', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Package not found' });
    res.json({ success: true, data: rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: 'Database error', error: e.message }); }
};

const createPackage = async (req, res) => {
  try {
    const { package_name, description, duration_days, price, currency = 'LAK', is_active = 1 } = req.body;
    if (!package_name || duration_days == null || price == null) return res.status(400).json({ success: false, message: 'package_name, duration_days and price are required' });
    const [r] = await pool.query('INSERT INTO packages (package_name, description, duration_days, price, currency, is_active, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)', [package_name.trim(), description || null, Number(duration_days), Number(price), currency, Number(is_active) ? 1 : 0, req.user?.id_user || null]);
    const [rows] = await pool.query('SELECT * FROM packages WHERE id_package = ?', [r.insertId]);
    res.status(201).json({ success: true, message: 'Package created successfully', data: rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: 'Database error', error: e.message }); }
};

const updatePackage = async (req, res) => {
  try {
    const { package_name, description, duration_days, price, currency, is_active } = req.body;
    const [r] = await pool.query('UPDATE packages SET package_name=?, description=?, duration_days=?, price=?, currency=?, is_active=?, updated_at=NOW() WHERE id_package=? AND deleted_at IS NULL', [package_name?.trim(), description || null, Number(duration_days), Number(price), currency || 'LAK', Number(is_active) ? 1 : 0, req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ success: false, message: 'Package not found' });
    const [rows] = await pool.query('SELECT * FROM packages WHERE id_package=?', [req.params.id]);
    res.json({ success: true, message: 'Package updated successfully', data: rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: 'Database error', error: e.message }); }
};

const deletePackage = async (req, res) => {
  try {
    const [r] = await pool.query('UPDATE packages SET deleted_at=NOW(), is_active=0 WHERE id_package=? AND deleted_at IS NULL', [req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ success: false, message: 'Package not found' });
    res.json({ success: true, message: 'Package deleted successfully' });
  } catch (e) { res.status(500).json({ success: false, message: 'Database error', error: e.message }); }
};

module.exports = { getAllPackages, getPackageById, createPackage, updatePackage, deletePackage };
