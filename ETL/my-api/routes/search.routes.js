const express=require('express');
const router=express.Router();
const c=require('../controllers/search.controller');
router.get('/customers', c.searchCustomers);
router.get('/sim', c.searchSims);
module.exports=router;
