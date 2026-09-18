/**
 * @openapi
 * /registrations/{id}/approve:
 *   put:
 *     summary: Approve registration (Admin only)
 *     tags: [Registrations]
 *     security: [{bearerAuth: []}]
 * /registrations/{id}/reject:
 *   put:
 *     summary: Reject registration (Admin only)
 *     tags: [Registrations]
 *     security: [{bearerAuth: []}]
 */
const express=require('express');const router=express.Router();const c=require('../controllers/registrations.controller');router.put('/:id/approve',c.approveRegistration);router.put('/:id/reject',c.rejectRegistration);module.exports=router;
