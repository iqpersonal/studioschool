import { User } from '../models/user';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

class AuthService {
    private userModel: typeof User;

    constructor() {
        this.userModel = User;
    }

    async register(userData: any) {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        const newUser = new this.userModel({
            ...userData,
            password: hashedPassword,
        });
        return newUser.save();
    }

    async login(email: string, password: string) {
        const user = await this.userModel.findOne({ email });
        if (!user) {
            throw new Error('User not found');
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            throw new Error('Invalid credentials');
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', {
            expiresIn: '1h',
        });

        return { token, user };
    }

    async getUserById(userId: string) {
        return this.userModel.findById(userId).select('-password');
    }
}

export default new AuthService();