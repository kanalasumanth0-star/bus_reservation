const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root@123',
  database: process.env.DB_NAME || 'bus_reservation',
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true
});

app.get('/api/health', async (req, res) => {
  try { await pool.query('SELECT 1'); res.json({ ok: true, message: 'MySQL connected' }); }
  catch (e) { res.status(500).json({ ok: false, message: 'MySQL connection failed', error: e.message }); }
});

// BUS CRUD
app.get('/api/buses', async (req,res) => {
  try { const [rows] = await pool.query('SELECT * FROM buses ORDER BY bus_id DESC'); res.json(rows); }
  catch(e) { res.status(500).json({error:e.message}); }
});
app.get('/api/buses/:id', async (req,res) => {
  try { const [rows] = await pool.query('SELECT * FROM buses WHERE bus_id=?',[req.params.id]); if(!rows.length) return res.status(404).json({error:'Bus not found'}); res.json(rows[0]); }
  catch(e) { res.status(500).json({error:e.message}); }
});
app.post('/api/buses', async (req,res) => {
  const b=req.body;
  try {
    const [r]=await pool.query(`INSERT INTO buses (bus_name,source,destination,departure_time,arrival_time,travel_date,total_seats,available_seats,bus_type,fare)
      VALUES (?,?,?,?,?,?,?,?,?,?)`,[b.bus_name,b.source,b.destination,b.departure_time,b.arrival_time,b.travel_date,b.total_seats,b.available_seats ?? b.total_seats,b.bus_type,b.fare]);
    res.status(201).json({message:'Bus created',bus_id:r.insertId});
  } catch(e) { res.status(400).json({error:e.message}); }
});
app.put('/api/buses/:id', async (req,res) => {
  const b=req.body;
  try {
    const [r]=await pool.query(`UPDATE buses SET bus_name=?,source=?,destination=?,departure_time=?,arrival_time=?,travel_date=?,total_seats=?,available_seats=?,bus_type=?,fare=? WHERE bus_id=?`,
    [b.bus_name,b.source,b.destination,b.departure_time,b.arrival_time,b.travel_date,b.total_seats,b.available_seats,b.bus_type,b.fare,req.params.id]);
    if(!r.affectedRows) return res.status(404).json({error:'Bus not found'});
    res.json({message:'Bus updated'});
  } catch(e) { res.status(400).json({error:e.message}); }
});
app.delete('/api/buses/:id', async (req,res) => {
  try { const [r]=await pool.query('DELETE FROM buses WHERE bus_id=?',[req.params.id]); if(!r.affectedRows) return res.status(404).json({error:'Bus not found'}); res.json({message:'Bus deleted'}); }
  catch(e) { res.status(400).json({error:'Cannot delete this bus if bookings are linked to it. Cancel/delete its bookings first.'}); }
});

// BOOKING CRUD
app.get('/api/bookings', async (req,res) => {
  try { const [rows]=await pool.query(`SELECT bk.*, b.bus_name, b.source, b.destination, b.travel_date AS bus_travel_date
    FROM bookings bk JOIN buses b ON bk.bus_id=b.bus_id ORDER BY bk.booking_id DESC`); res.json(rows); }
  catch(e) { res.status(500).json({error:e.message}); }
});
app.get('/api/bookings/:id', async (req,res) => {
  try { const [rows]=await pool.query('SELECT * FROM bookings WHERE booking_id=?',[req.params.id]); if(!rows.length) return res.status(404).json({error:'Booking not found'}); res.json(rows[0]); }
  catch(e) { res.status(500).json({error:e.message}); }
});
app.post('/api/bookings', async (req,res) => {
  const b=req.body, conn=await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [busRows]=await conn.query('SELECT available_seats FROM buses WHERE bus_id=? FOR UPDATE',[b.bus_id]);
    if(!busRows.length) throw new Error('Selected bus does not exist');
    const seats=Number(b.seats);
    if(seats<1 || busRows[0].available_seats<seats) throw new Error('Not enough available seats');
    const [r]=await conn.query('INSERT INTO bookings (passenger_name,phone,bus_id,seats,status) VALUES (?,?,?,?,?)',[b.passenger_name,b.phone,b.bus_id,seats,b.status||'Confirmed']);
    await conn.query('UPDATE buses SET available_seats=available_seats-? WHERE bus_id=?',[seats,b.bus_id]);
    await conn.commit(); res.status(201).json({message:'Booking created',booking_id:r.insertId});
  } catch(e) { await conn.rollback(); res.status(400).json({error:e.message}); }
  finally { conn.release(); }
});
app.put('/api/bookings/:id', async (req,res) => {
  const b=req.body;
  try {
    const [oldRows]=await pool.query('SELECT * FROM bookings WHERE booking_id=?',[req.params.id]);
    if(!oldRows.length) return res.status(404).json({error:'Booking not found'});
    const old=oldRows[0];
    const [r]=await pool.query('UPDATE bookings SET passenger_name=?,phone=?,bus_id=?,seats=?,status=? WHERE booking_id=?',
      [b.passenger_name,b.phone,b.bus_id,b.seats,b.status,req.params.id]);
    // This simple demo updates booking details; seat inventory is fully restored on cancellation/deletion.
    if (b.status==='Cancelled' && old.status!=='Cancelled') await pool.query('UPDATE buses SET available_seats=LEAST(total_seats,available_seats+?) WHERE bus_id=?',[old.seats,old.bus_id]);
    res.json({message:'Booking updated'});
  } catch(e) { res.status(400).json({error:e.message}); }
});
app.delete('/api/bookings/:id', async (req,res) => {
  const conn=await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows]=await conn.query('SELECT * FROM bookings WHERE booking_id=? FOR UPDATE',[req.params.id]);
    if(!rows.length) { await conn.rollback(); return res.status(404).json({error:'Booking not found'}); }
    const b=rows[0];
    if(b.status==='Confirmed') await conn.query('UPDATE buses SET available_seats=LEAST(total_seats,available_seats+?) WHERE bus_id=?',[b.seats,b.bus_id]);
    await conn.query('DELETE FROM bookings WHERE booking_id=?',[req.params.id]);
    await conn.commit(); res.json({message:'Booking deleted'});
  } catch(e) { await conn.rollback(); res.status(400).json({error:e.message}); }
  finally { conn.release(); }
});

app.get('/', (req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
const port=process.env.PORT || 3000;
app.listen(port,()=>console.log(`Bus Reservation System running at http://localhost:${port}`));
