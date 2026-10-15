CREATE DATABASE IF NOT EXISTS bus_reservation;
USE bus_reservation;

CREATE TABLE IF NOT EXISTS buses (
  bus_id INT AUTO_INCREMENT PRIMARY KEY,
  bus_name VARCHAR(100) NOT NULL,
  source VARCHAR(100) NOT NULL,
  destination VARCHAR(100) NOT NULL,
  departure_time TIME NOT NULL,
  arrival_time TIME NOT NULL,
  travel_date DATE NOT NULL,
  total_seats INT NOT NULL DEFAULT 40,
  available_seats INT NOT NULL DEFAULT 40,
  bus_type VARCHAR(50) NOT NULL DEFAULT 'AC Sleeper',
  fare DECIMAL(10,2) NOT NULL DEFAULT 500.00
);

CREATE TABLE IF NOT EXISTS bookings (
  booking_id INT AUTO_INCREMENT PRIMARY KEY,
  passenger_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  bus_id INT NOT NULL,
  seats INT NOT NULL DEFAULT 1,
  booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('Confirmed','Cancelled') DEFAULT 'Confirmed',
  CONSTRAINT fk_booking_bus FOREIGN KEY (bus_id) REFERENCES buses(bus_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
);

INSERT INTO buses (bus_name, source, destination, departure_time, arrival_time, travel_date, total_seats, available_seats, bus_type, fare)
SELECT 'Orange Travels','Hyderabad','Bangalore','21:00:00','07:00:00','2026-12-20',40,40,'AC Sleeper',1200.00
WHERE NOT EXISTS (SELECT 1 FROM buses WHERE bus_name='Orange Travels' AND travel_date='2026-12-20');
INSERT INTO buses (bus_name, source, destination, departure_time, arrival_time, travel_date, total_seats, available_seats, bus_type, fare)
SELECT 'Green Line Express','Hyderabad','Chennai','20:30:00','06:30:00','2026-12-20',35,35,'AC Seater',950.00
WHERE NOT EXISTS (SELECT 1 FROM buses WHERE bus_name='Green Line Express' AND travel_date='2026-12-20');
