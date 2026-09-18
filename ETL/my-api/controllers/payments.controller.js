const pool = require('../db');

const getAllPayments = async (req, res) => {
  try {
    const { status, id_registration } = req.query;
    const params = [];
    const where = [];
    if (status && status !== 'All') { where.push('p.payment_status = ?'); params.push(status); }
    if (id_registration) { where.push('p.id_registration = ?'); params.push(id_registration); }
    const [rows] = await pool.query(`
      SELECT p.id_payment, p.id_registration, p.id_package, p.amount, p.currency, p.payment_method,
             p.payment_status, p.transaction_reference, p.paid_at, p.notes,
             r.id_customer, CONCAT(c.first_name, ' ', c.last_name) customer_name,
             r.id_sim, s.phone_number, pk.package_name
      FROM payments p
      LEFT JOIN registrations r ON p.id_registration=r.id_registration
      LEFT JOIN customers c ON r.id_customer=c.id_customer
      LEFT JOIN sim_cards s ON r.id_sim=s.id_sim
      LEFT JOIN packages pk ON p.id_package=pk.id_package
      ${where.length ? 'WHERE '+where.join(' AND ') : ''}
      ORDER BY p.id_payment DESC`, params);
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ success:false, message:'Database error', error:e.message }); }
};

const getPaymentById = async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT p.*, pk.package_name, r.id_customer, r.id_sim, CONCAT(c.first_name,' ',c.last_name) customer_name, s.phone_number FROM payments p LEFT JOIN packages pk ON p.id_package=pk.id_package LEFT JOIN registrations r ON p.id_registration=r.id_registration LEFT JOIN customers c ON r.id_customer=c.id_customer LEFT JOIN sim_cards s ON r.id_sim=s.id_sim WHERE p.id_payment=?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({success:false,message:'Payment not found'});
    res.json({success:true,data:rows[0]});
  } catch(e){res.status(500).json({success:false,message:'Database error',error:e.message});}
};

const createPayment = async (req,res)=>{
  const conn=await pool.getConnection();
  try{
    const {id_registration,id_package,amount,currency='LAK',payment_method='Cash',payment_status='Paid',transaction_reference,paid_at,notes}=req.body;
    if(!id_registration || !id_package || amount==null) return res.status(400).json({success:false,message:'id_registration, id_package and amount are required'});
    await conn.beginTransaction();
    const [reg]=await conn.query('SELECT id_registration,id_registration_status,id_sim FROM registrations WHERE id_registration=? FOR UPDATE',[id_registration]);
    if(!reg.length){await conn.rollback();conn.release();return res.status(404).json({success:false,message:'Registration not found'});}
    if(Number(reg[0].id_registration_status)!==2){await conn.rollback();conn.release();return res.status(409).json({success:false,message:'Payment is allowed only for approved registrations'});}
    const [pk]=await conn.query('SELECT id_package,price,currency FROM packages WHERE id_package=? AND is_active=1 AND deleted_at IS NULL',[id_package]);
    if(!pk.length){await conn.rollback();conn.release();return res.status(404).json({success:false,message:'Package not found or inactive'});}
    const finalAmount = amount==null ? pk[0].price : Number(amount);
    const [existing]=await conn.query('SELECT id_payment FROM payments WHERE id_registration=? AND payment_status IN (\'Paid\',\'Success\') LIMIT 1',[id_registration]);
    if(existing.length){await conn.rollback();conn.release();return res.status(409).json({success:false,message:'Registration already has a successful payment'});}
    const [r]=await conn.query('INSERT INTO payments (id_registration,id_package,amount,currency,payment_method,payment_status,transaction_reference,paid_at,notes,created_by) VALUES (?,?,?,?,?,?,?,?,?,?)',[id_registration,id_package,finalAmount,currency||pk[0].currency,payment_method,payment_status,transaction_reference||null,paid_at|| (payment_status==='Paid'||payment_status==='Success'?new Date():null),notes||null,req.user?.id_user||null]);
    if(payment_status==='Paid'||payment_status==='Success'){
      await conn.query('UPDATE sim_cards SET id_sim_status=2, updated_at=NOW() WHERE id_sim=?',[reg[0].id_sim]);
    }
    await conn.commit();conn.release();
    const [rows]=await pool.query('SELECT * FROM payments WHERE id_payment=?',[r.insertId]);
    res.status(201).json({success:true,message:'Payment created successfully',data:rows[0]});
  }catch(e){try{await conn.rollback();}catch{} conn.release(); res.status(500).json({success:false,message:'Database error',error:e.message});}
};

const updatePaymentStatus=async(req,res)=>{
  try{
    const {payment_status,transaction_reference,notes}=req.body;
    const [r]=await pool.query('UPDATE payments SET payment_status=?, transaction_reference=?, notes=?, paid_at=CASE WHEN ? IN (\'Paid\',\'Success\') AND paid_at IS NULL THEN NOW() ELSE paid_at END, updated_at=NOW() WHERE id_payment=?',[payment_status,transaction_reference||null,notes||null,payment_status,req.params.id]);
    if(!r.affectedRows)return res.status(404).json({success:false,message:'Payment not found'});
    if(payment_status==='Paid'||payment_status==='Success'){
      await pool.query('UPDATE sim_cards s JOIN registrations r ON s.id_sim=r.id_sim JOIN payments p ON p.id_registration=r.id_registration SET s.id_sim_status=2,s.updated_at=NOW() WHERE p.id_payment=?',[req.params.id]);
    }
    res.json({success:true,message:'Payment status updated successfully'});
  }catch(e){res.status(500).json({success:false,message:'Database error',error:e.message});}
};

module.exports={getAllPayments,getPaymentById,createPayment,updatePaymentStatus};
