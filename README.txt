BUS RESERVATION SYSTEM - CRUD + MYSQL

Requirements:
1. Install Node.js (LTS) and MySQL Server + MySQL Workbench.
2. Open MySQL Workbench and connect to your local MySQL instance.
3. Open schema.sql and click the lightning bolt (Execute). This creates the bus_reservation database and sample buses.
4. In this project folder, copy .env.example to .env and set DB_PASSWORD to your MySQL root password.
   Example:
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_actual_password
   DB_NAME=bus_reservation
   PORT=3000
5. Open terminal in this folder and run:
   npm install
   npm start
6. Open http://localhost:3000 in your browser.

Pages:
- / or /index.html : Dashboard
- /buses.html : Bus CRUD (Create, Read, Update, Delete)
- /bookings.html : Booking CRUD (Create, Read, Update, Delete)

API:
GET    /api/buses
GET    /api/buses/:id
POST   /api/buses
PUT    /api/buses/:id
DELETE /api/buses/:id
GET    /api/bookings
GET    /api/bookings/:id
POST   /api/bookings
PUT    /api/bookings/:id
DELETE /api/bookings/:id
GET    /api/health

Important:
- MySQL Workbench is a database management tool, not the backend server. Node.js/Express connects to MySQL Server.
- Do not put your real MySQL password in public source code. Keep it in .env.
- The page images are loaded from Unsplash and need an internet connection.
- For a classroom/demo project, test all CRUD actions before submission.
