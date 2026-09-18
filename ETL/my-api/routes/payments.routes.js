/**
 * @openapi
 * /payments:
 *   get:
 *     summary: Payment history
 *     tags: [Payments]
 *     security: [{bearerAuth: []}]
 *   post:
 *     summary: Create payment
 *     tags: [Payments]
 *     security: [{bearerAuth: []}]
 * /payments/{id}:
 *   get:
 *     summary: Get payment
 *     tags: [Payments]
 *     security: [{bearerAuth: []}]
 * /payments/{id}/status:
 *   put:
 *     summary: Update payment status
 *     tags: [Payments]
 *     security: [{bearerAuth: []}]
 */
const express=require('express');
const router=express.Router();
const c=require('../controllers/payments.controller');
router.get('/',c.getAllPayments);
router.get('/:id',c.getPaymentById);
router.post('/',c.createPayment);
router.put('/:id/status',c.updatePaymentStatus);
module.exports=router;
