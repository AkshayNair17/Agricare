CREATE DATABASE IF NOT EXISTS agricare_db;
USE agricare_db;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user'
);

UPDATE users SET role = 'admin' WHERE email = 'your-email@farmmail.com';

SELECT * FROM users;