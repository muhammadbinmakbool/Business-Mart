import { UserRepository } from "../repositories/UserRepository";
import { createUserSchema, updateUserSchema } from "../validations/authSchema";
import { AuthService } from "./AuthService";
import { USER_ROLES } from "@/lib/constants";

export class UserService {
  static async listUsers() {
    return UserRepository.getAll();
  }

  static async getUser(id) {
    const user = await UserRepository.getById(id);
    if (!user) throw new Error("User not found");
    return user;
  }

  static async createUser(data) {
    const validated = createUserSchema.parse(data);

    // Check for duplicate email
    const existing = await UserRepository.getByEmail(validated.email);
    if (existing) {
      throw new Error("A user with this email already exists");
    }

    const hashedPassword = await AuthService.hashPassword(validated.password);

    return UserRepository.create({
      email: validated.email,
      name: validated.name,
      password: hashedPassword,
      role: validated.role || USER_ROLES.USER,
    });
  }

  static async updateUser(id, data) {
    const validated = updateUserSchema.parse(data);

    const updateData = {};
    if (validated.email !== undefined) updateData.email = validated.email;
    if (validated.name !== undefined) updateData.name = validated.name;
    if (validated.role !== undefined) updateData.role = validated.role;
    if (validated.isActive !== undefined) updateData.isActive = validated.isActive;

    // Only hash and update password if a new one is provided
    if (validated.password) {
      updateData.password = await AuthService.hashPassword(validated.password);
    }

    return UserRepository.update(id, updateData);
  }

  static async disableUser(id) {
    return UserRepository.softDelete(id);
  }

  static async enableUser(id) {
    return UserRepository.reactivate(id);
  }
}
