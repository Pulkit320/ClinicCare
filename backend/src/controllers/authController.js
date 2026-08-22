import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/db.js';

//REGISTER USER
export const register = async (req, res) => {
    try {
        const { name, email, password, role, specialization } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: "Name, email and password are required." });
        }

        const userRole = role || "PATIENT";
        const userExists = await prisma.user.findUnique({ where: { email } });
        if (userExists) {
            return res.status(400).json({ message: "User already exists." });
        }
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: userRole,
                ...(userRole === "DOCTOR" && {
                    doctorProfile: {
                        create: {
                            specialization: specialization || "General Physician",
                            workingHours: "09:00 - 17:00",
                            slotDuration: 30
                        }
                    }
                })
            },
            include: {
                doctorProfile: true
            }
        });
        const token = jwt.sign({
            id: newUser.id,
            role: newUser.role,
            name: newUser.name
        }, process.env.JWT_SECRET || "secret", { expiresIn: "24h" });

        res.status(201).json({
            token,
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
            }
        })
    } catch (error) {
        console.log("Error in register: ", error);
        res.status(500).json({ message: error.message });
    }
}

//LOGIN USER
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required." })
        }
        const user = await prisma.user.findUnique({
            where: { email },
            include: { doctorProfile: true }
        });
        if (!user) {
            return res.status(401).json({ message: "Invalid credentials." })
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid credentials." })
        }
        const token = jwt.sign({
            id: user.id,
            role: user.role,
            name: user.name
        }, process.env.JWT_SECRET || "secret", { expiresIn: "24h" });

        res.status(200).json({
            message: "Login Successful",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                doctorId: user.doctorProfile ? user.doctorProfile.id : null
            }
        })
    } catch (error) {
        console.log("Error in login: ", error);
        res.status(500).json({ message: error.message });
    }
}