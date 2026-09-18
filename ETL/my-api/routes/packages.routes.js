/**
 * @openapi
 * /packages:
 *   get:
 *     summary: List packages
 *     tags: [Packages]
 *     security: [{bearerAuth: []}]
 *   post:
 *     summary: Create package
 *     tags: [Packages]
 *     security: [{bearerAuth: []}]
 * /packages/{id}:
 *   get:
 *     summary: Get package
 *     tags: [Packages]
 *     security: [{bearerAuth: []}]
 *   put:
 *     summary: Update package
 *     tags: [Packages]
 *     security: [{bearerAuth: []}]
 *   delete:
 *     summary: Delete package
 *     tags: [Packages]
 *     security: [{bearerAuth: []}]
 */
const express = require('express');
const router = express.Router();
const c = require('../controllers/packages.controller');
router.get('/', c.getAllPackages);
router.get('/:id', c.getPackageById);
router.post('/', c.createPackage);
router.put('/:id', c.updatePackage);
router.delete('/:id', c.deletePackage);
module.exports = router;
