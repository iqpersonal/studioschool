"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const authService_1 = require("../services/authService");
class AuthController {
    constructor() {
        this.userService = new authService_1.UserService();
    }
    signUp(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { username, email, password } = req.body;
            try {
                const hashedPassword = yield bcrypt_1.default.hash(password, 10);
                const user = yield this.userService.createUser({ username, email, password: hashedPassword });
                return res.status(201).json({ message: 'User created successfully', user });
            }
            catch (error) {
                return res.status(500).json({ message: 'Error creating user', error });
            }
        });
    }
    login(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { email, password } = req.body;
            try {
                const user = yield this.userService.findUserByEmail(email);
                if (!user) {
                    return res.status(404).json({ message: 'User not found' });
                }
                const isMatch = yield bcrypt_1.default.compare(password, user.password);
                if (!isMatch) {
                    return res.status(401).json({ message: 'Invalid credentials' });
                }
                const token = jsonwebtoken_1.default.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
                return res.status(200).json({ message: 'Login successful', token });
            }
            catch (error) {
                return res.status(500).json({ message: 'Error logging in', error });
            }
        });
    }
}
exports.default = new AuthController();
