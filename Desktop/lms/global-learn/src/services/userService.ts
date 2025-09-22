import User, { IUser } from '../models/user';

export class UserService {
    async getUserById(userId: string): Promise<IUser | null> {
        return User.findById(userId);
    }

    async updateUser(userId: string, userData: Partial<IUser>): Promise<IUser | null> {
        return User.findByIdAndUpdate(userId, userData, { new: true });
    }

    async deleteUser(userId: string): Promise<boolean> {
        const result = await User.findByIdAndDelete(userId);
        return !!result;
    }

    async getAllUsers(): Promise<IUser[]> {
        return User.find();
    }
}
export default UserService;
}